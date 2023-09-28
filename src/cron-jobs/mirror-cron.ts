import cron from '@elysiajs/cron'
import { eq } from 'drizzle-orm'
import Elysia from 'elysia'
import { db } from '../db/db'
import { cache } from '../db/schema'
import { getWhoMirroredPublication } from '../mirrors'
import { addToMintQueue } from '../queue'

export function init(app: Elysia) {
  app.use(
    cron({
      name: 'check-mirrors',
      pattern: '*/10 * * * * *',
      run: async () => {
        console.log('🕐 Checking Mirrors...')

        let cursor = await db.select().from(cache).where(eq(cache.key, 'mirrors')).limit(1)

        const parsedValue = cursor[0]?.value
          ? (JSON.parse(cursor[0].value) as { publicationId: string; lastCursor: string })
          : null

        const formattedCursor = parsedValue?.lastCursor
          ? JSON.stringify(JSON.parse(parsedValue.lastCursor))
          : undefined
        console.log('🚀 ~ file: mirror-cron.ts:24 ~ run: ~ formattedCursor:', formattedCursor)

        const mirrors = await getWhoMirroredPublication({
          publicationId: '0x91ac-0x01-DA-6709cc0d',
          cursor: formattedCursor,
        })

        console.log('Mirrors:', mirrors.items.length, mirrors.pageInfo.next)
        await Promise.all(
          mirrors.items.map((m) => {
            return addToMintQueue({
              profile: m,
              publicationId: '0x91ac-0x01-DA-6709cc0d',
              type: 'mint',
            })
          })
        )

        try {
          if (!mirrors.pageInfo.next) return
          const value = JSON.stringify({
            publicationId: '0x91ac-0x01-DA-6709cc0d',
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
      },
    })
  )
}
