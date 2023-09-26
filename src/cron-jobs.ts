import cron from '@elysiajs/cron'
import { OwnedNft } from 'alchemy-sdk'
import Elysia from 'elysia'
import { sumBy } from 'lodash'
import { getOwnedCards } from './alchemyt'
import { getComments } from './comments'
import { getNotifications } from './notifications'
import { addToInfoQueue, addToMergeQueue, addToMintQueue } from './queue'

declare global {
  var hasCronJobsSetup: boolean
}

// Default to true when in development
globalThis.hasCronJobsSetup ??= false

export function createCardInfoSummary(nfts: OwnedNft[]) {
  return `You own ${sumBy(nfts, (n) => n.balance)} cards.

Cards:
${nfts.map((n) => `${n.tokenId} (${n.balance}x)`).join('\n')}
`
}

export const startCronJobs = () => (app: Elysia) => {
  // if (process.env.NODE_ENV !== 'production') return app
  if (globalThis.hasCronJobsSetup) return app

  console.log('🕐 Starting cron jobs...')

  app.use(
    cron({
      name: 'check-notifications',
      pattern: '*/10 * * * * *',
      run: async () => {
        console.log('🕐 Checking Notifications...')
        const notifications = await getNotifications()
        await Promise.all([
          await Promise.all(
            notifications.slice(0, 1).map(async (n) => {
              if (n.__typename === 'NewMentionNotification') {
                const content = n.mentionPublication.metadata.content
                const [_, command] = content?.split(' ') ?? []
                if (command === '#airdrop') {
                  const checkComments = await getComments(n.mentionPublication.id)
                  const hasCommented = checkComments.items.some(
                    (c) => c.profile.id === process.env.PROFILE_ID
                  )

                  if (hasCommented) return

                  addToMintQueue({
                    publicationId: n.mentionPublication.id,
                    profile: n.mentionPublication.profile,
                  })
                } else if (command === '#merge') {
                  const [_, __, mergeTokens] = content?.split(' ') ?? []
                  const [tokenOneId, tokenTwoId] = mergeTokens?.split('*') ?? []
                  const checkComments = await getComments(n.mentionPublication.id)
                  const hasCommented = checkComments.items.some(
                    (c) => c.profile.id === process.env.PROFILE_ID
                  )

                  if (hasCommented) return
                  addToMergeQueue({
                    publicationId: n.mentionPublication.id,
                    profile: n.mentionPublication.profile,
                    tokenOneId: tokenOneId,
                    tokenTwoId: tokenTwoId,
                  })
                } else if (command === '#info') {
                  const checkComments = await getComments(n.mentionPublication.id)
                  const hasCommented = checkComments.items.some(
                    (c) => c.profile.id === process.env.PROFILE_ID
                  )

                  if (hasCommented) return

                  // Get tokens Ids that the user owns
                  const nfts = await getOwnedCards({ owner: n.mentionPublication.profile.ownedBy })

                  const content = createCardInfoSummary(nfts.ownedNfts)

                  addToInfoQueue({
                    content,
                    profile: n.mentionPublication.profile,
                    publicationId: n.mentionPublication.id,
                  })
                }
              }
            })
          ),
        ])
      },
    })
  )

  // app.use(
  //   cron({
  //     name: 'check-mirrors',
  //     pattern: '*/15 * * * * *',
  //     run: async () => {
  //       console.log('🕐 Checking Mirrors...')

  //       let cursor = await db
  //         .select({
  //           value: cache.value,
  //         })
  //         .from(cache)
  //         .where(eq(cache.key, 'mirrors'))
  //         .limit(1)

  //       console.log('🚀 ~ file: cron-jobs.ts:66 ~ run: ~ cursor:', cursor)
  //       const parsedCursor = cursor[0]?.value
  //         ? (JSON.parse(cursor[0].value) as { publicationId: string; lasCursor: string })
  //         : null
  //       console.log('🚀 ~ file: cron-jobs.ts:68 ~ run: ~ parsedCursor:', parsedCursor)

  //       const mirrors = await getWhoMirroredPublication({
  //         publicationId: '0x91ac-0x01-DA-6709cc0d',
  //         cursor: parsedCursor?.lasCursor,
  //       })
  //       console.log('🚀 ~ file: cron-jobs.ts:71 ~ run: ~ mirrors:', mirrors.items.length)

  //       mirrors.items.forEach((m) => {
  //         // addToMintQueue({ profile: m, publicationId: '0x91ac-0x01-DA-6709cc0d' })
  //       })

  //       try {
  //         await db.insert(cache).values({
  //           key: 'mirrors',
  //           value: JSON.stringify({
  //             publicationId: '0x91ac-0x01-DA-6709cc0d',
  //             lastCursor: mirrors.pageInfo.next,
  //           }),
  //         })
  //       } catch (e) {
  //         console.error(e)
  //       }
  //     },
  //   })
  // )

  globalThis.hasCronJobsSetup = true
  return app
}
