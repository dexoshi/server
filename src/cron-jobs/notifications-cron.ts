import cron from '@elysiajs/cron'
import { OwnedNft } from 'alchemy-sdk'
import Elysia from 'elysia'
import { sumBy } from 'lodash'
import { db } from '../db/db'
import { airdrops, publications } from '../db/schema'
import { getComments } from '../lens/comments'
import { getNotifications } from '../lens/notifications'
import { addToInfoQueue, addToMergeQueue, addToMintQueue } from '../queue'
import { getOwnedCards } from '../services/alchemy'
import { getHashTags } from '../utils'

const SQUARES = ['🟩', '⬛']
export function createCardInfoSummary(nfts: OwnedNft[], type: 'info' | 'details' = 'info') {
  const cards = nfts.filter((n) => parseInt(n.tokenId) < 64)
  // Create an 8x8 array that represents the card grid
  // There should be a green square for every NFT owned and black for every NFT not owned
  const grid = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => SQUARES[1]))

  // For each NFT owned, set the grid value to green
  cards.forEach((nft) => {
    const tokenIdNum = parseInt(nft.tokenId)
    // The placement of the NFT should be based on where the number falls in the 64 grid
    const y = Math.floor(tokenIdNum / 8)
    const x = Math.floor(tokenIdNum % 8)

    grid[y][x] = SQUARES[0]
  })

  if (type === 'details') {
    return `You own ${sumBy(cards, (n) => n.balance)} cards.
${grid.map((r) => r.join(' ')).join('\n')}

Cards:
${cards.map((n) => `${n.tokenId} (${n.balance}x)`).join('\n')}
`
  }

  return grid.map((r) => r.join(' ')).join('\n')
}

export const init = (app: Elysia) => {
  app.use(
    cron({
      name: 'check-notifications',
      pattern: '*/10 * * * * *',
      run: async () => {
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

                  const airdropCounts = await db.query.airdrops.findMany({
                    where: (c, { eq, and, gte }) =>
                      and(
                        eq(c.profileId, n.mentionPublication.profile.id),
                        gte(c.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
                      ),
                  })

                  if (airdropCounts.length >= 5) {
                    await addToInfoQueue({
                      type: 'info',
                      content: `You have claimed ${airdropCounts.length} in the last 24 hours. You can only claim 5 airdrops in 24 hours, unless you hold special NFTs.`,
                      profile: n.mentionPublication.profile,
                      publicationId: n.mentionPublication.id,
                    })

                    return
                  }

                  await db
                    .insert(airdrops)
                    .values({
                      profileId: n.mentionPublication.profile.id,
                      publicationId: n.mentionPublication.id,
                    })
                    .onConflictDoNothing()

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
                } else if (command === 'details') {
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

                  const content = createCardInfoSummary(nfts.ownedNfts, 'details')

                  await addToInfoQueue({
                    type: 'info',
                    content,
                    profile: n.mentionPublication.profile,
                    publicationId: n.mentionPublication.id,
                  })
                } else if (command) {
                  await addToInfoQueue({
                    type: 'info',
                    content: `${command} is not a valid command.\n\nPlease choose one of the following: #airdrop, #merge, #info, #details.`,
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
