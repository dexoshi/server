import cron from '@elysiajs/cron'
import Elysia from 'elysia'
import { db } from '../db/db'
import { cache } from '../db/schema'
import { getWhoMirroredPublication } from '../mirrors'
import { addToMintQueue } from '../queue'

const MINT_PUBLICATION_IDS = ['0x91ac-0x01-DA-6709cc0d']

export function init(app: Elysia) {
  app.use(
    cron({
      name: 'check-mirrors',
      pattern: '*/10 * * * * *',
      run: async () => {
        console.log('🕐 Checking Mirrors...')

        for await (const publicationId of MINT_PUBLICATION_IDS) {
          const mirrors = await getWhoMirroredPublication({
            publicationId,
          })

          const alreadyMinted = await db.query.mintedCards.findMany({
            where: (m, { inArray, and, eq }) =>
              and(
                eq(m.publicationId, publicationId),
                inArray(
                  m.profileId,
                  mirrors.items.map((m) => m.id)
                )
              ),
          })

          const alreadyMintedProfileIds = alreadyMinted.map((m) => m.profileId)

          await Promise.all(
            mirrors.items
              .filter((m) => !alreadyMintedProfileIds.includes(m.id))
              .map((m) => {
                return addToMintQueue({
                  profile: m,
                  publicationId,
                  type: 'mint',
                })
              })
          )

          try {
            if (!mirrors.pageInfo.next) return
            const value = JSON.stringify({
              publicationId,
              lastCursor: mirrors.pageInfo.next,
            })
            await db
              .insert(cache)
              .values({
                key: 'mirrors',
                value,
              })
              .onConflictDoUpdate({
                target: cache.key,
                set: { value },
              })
          } catch (e) {
            console.error(e)
          }
        }
      },
    })
  )
}
