import cron from '@elysiajs/cron'
import Elysia from 'elysia'
import { db } from '../db/db'
import { getAllWalletsWhoCollected } from '../lens/collects'
import { getPublication } from '../lens/publications'
import { addToMintQueue } from '../queue'
import { getHashTags } from '../utils'

export function init(app: Elysia) {
  app.use(
    cron({
      name: 'check-collects',
      pattern: '*/10 * * * * *',
      run: async () => {
        const collects = await db.query.collects.findMany()
        for await (const { publicationId } of collects) {
          const publication = await getPublication(publicationId)
          const mirrors = await getAllWalletsWhoCollected({
            publicationId,
          })

          let tokenId = ''
          if (publication?.__typename === 'Post' || publication?.__typename === 'Comment') {
            const hashtags = getHashTags(publication.metadata.content)
            tokenId = hashtags[1]
          }

          const alreadyMinted = await db.query.mintedCards.findMany({
            where: (m, { inArray, and, eq }) =>
              and(
                eq(m.publicationId, publicationId),
                inArray(
                  m.profileId,
                  mirrors.items.map((m) => m.defaultProfile?.id!)
                )
              ),
          })

          const alreadyMintedProfileIds = alreadyMinted.map((m) => m.profileId)

          await Promise.all(
            mirrors.items
              .filter((m) => !alreadyMintedProfileIds.includes(m.defaultProfile?.id!))
              .map((m) => {
                return addToMintQueue({
                  profile: m.defaultProfile!,
                  publicationId,
                  type: 'mint',
                  tokenId,
                })
              })
          )
        }
      },
    })
  )
}
