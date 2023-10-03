import cron from '@elysiajs/cron'
import { OwnedNft } from 'alchemy-sdk'
import Elysia from 'elysia'
import { sumBy } from 'lodash'
import { getOwnedCards } from '../alchemyt'
import { getComments } from '../comments'
import { db } from '../db/db'
import { publications } from '../db/schema'
import { getNotifications } from '../notifications'
import { addToInfoQueue, addToMergeQueue, addToMintQueue } from '../queue'
import { getHashTags } from '../utils'

export function createCardInfoSummary(nfts: OwnedNft[]) {
  return `You own ${sumBy(nfts, (n) => n.balance)} cards.

Cards:
${nfts.map((n) => `${n.tokenId} (${n.balance}x)`).join('\n')}
`
}

export const init = (app: Elysia) => {
  app.use(
    cron({
      name: 'check-notifications',
      pattern: '*/10 * * * * *',
      run: async () => {
        console.log('🕐 Checking Notifications...')
        const notifications = await getNotifications()
        const recordedPublications = await db.query.publications.findMany({
          where: (p, { inArray }) =>
            inArray(
              p.publicationId,
              notifications
                .map((n) => {
                  if (n.__typename === 'NewMentionNotification') {
                    return n.mentionPublication.id
                  }
                  return ''
                })
                .filter(Boolean)
            ),
        })

        await Promise.all([
          await Promise.all(
            notifications.map(async (n) => {
              if (n.__typename === 'NewMentionNotification') {
                const hasCommented = recordedPublications.some(
                  (p) => p.publicationId === n.mentionPublication.id
                )

                if (hasCommented) return

                const content = n.mentionPublication.metadata.content
                const hashtags = getHashTags(content)
                const command = hashtags[0]
                if (command === 'airdrop') {
                  const checkComments = await getComments(n.mentionPublication.id)
                  const hasCommented = checkComments.items.some(
                    (c) => c.profile.id === process.env.PROFILE_ID
                  )

                  if (hasCommented) {
                    await db.insert(publications).values({
                      publicationId: n.mentionPublication.id,
                      commentedAt: new Date(),
                    })
                    return
                  }

                  await addToMintQueue({
                    type: 'mint',
                    publicationId: n.mentionPublication.id,
                    profile: n.mentionPublication.profile,
                  })
                } else if (command === 'merge') {
                  const [_, __, mergeTokens] = content?.split(' ') ?? []
                  const [tokenOneId, tokenTwoId] = mergeTokens?.split('*') ?? []
                  const checkComments = await getComments(n.mentionPublication.id)
                  const hasCommented = checkComments.items.some(
                    (c) => c.profile.id === process.env.PROFILE_ID
                  )

                  if (hasCommented) {
                    await db.insert(publications).values({
                      publicationId: n.mentionPublication.id,
                      commentedAt: new Date(),
                    })
                    return
                  }

                  await addToMergeQueue({
                    type: 'merge',
                    publicationId: n.mentionPublication.id,
                    profile: n.mentionPublication.profile,
                    tokenOneId: tokenOneId,
                    tokenTwoId: tokenTwoId,
                  })
                } else if (command === 'info') {
                  const checkComments = await getComments(n.mentionPublication.id)
                  const hasCommented = checkComments.items.some(
                    (c) => c.profile.id === process.env.PROFILE_ID
                  )

                  if (hasCommented) {
                    await db.insert(publications).values({
                      publicationId: n.mentionPublication.id,
                      commentedAt: new Date(),
                    })
                    return
                  }

                  // Get tokens Ids that the user owns
                  const nfts = await getOwnedCards({ owner: n.mentionPublication.profile.ownedBy })

                  const content = createCardInfoSummary(nfts.ownedNfts)

                  await addToInfoQueue({
                    type: 'info',
                    content,
                    profile: n.mentionPublication.profile,
                    publicationId: n.mentionPublication.id,
                  })
                } else if (command) {
                  await addToInfoQueue({
                    type: 'info',
                    content: `${command} is not a valid command.\n\nPlease choose one of the following: #airdrop, #merge, #info.`,
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
}
