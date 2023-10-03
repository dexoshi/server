import cron from '@elysiajs/cron'
import Elysia from 'elysia'
import { getAllWalletsWhoCollected } from '../collects'
import { db } from '../db/db'
import { getPublication } from '../publications'
import { addToMintQueue } from '../queue'
import { getHashTags } from '../utils'

const COLLECT_PUBLICATION_IDS = ['0x91ac-0x01']

export function init(app: Elysia) {
  app.use(
    cron({
      name: 'check-collects',
      pattern: '*/10 * * * * *',
      run: async () => {
        console.log('🕐 Checking Collects...')
        for await (const publicationId of COLLECT_PUBLICATION_IDS) {
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
