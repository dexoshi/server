import { ProfileFragment } from '@lens-protocol/client'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { v4 as uuid } from 'uuid'

export const cache = sqliteTable(
  'cache',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    key: text('key'),
    value: text('value'),
  },
  (t) => ({
    keyIdx: index('key_idx').on(t.key),
  })
)

export const publications = sqliteTable('publications', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  publicationId: text('publicationId').unique().notNull(),
  commentedAt: integer('date', { mode: 'timestamp_ms' }),
})

export type MintQueueItem = {
  type: 'mint'
  publicationId: string
  profile: ProfileFragment
}

export type MergeQueueItem = {
  type: 'merge'
  publicationId: string
  profile: ProfileFragment
  tokenOneId: string
  tokenTwoId: string
}

export type InfoQueueItem = {
  type: 'info'
  publicationId: string
  content: string
  profile: ProfileFragment
}

export type QueueValue = MintQueueItem | MergeQueueItem | InfoQueueItem

export const queues = sqliteTable('queues', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  name: text('name', { enum: ['card', 'merge', 'info'] }).notNull(),
  value: text('value', { mode: 'json' }).$type<QueueValue>().notNull(),
})

export type InsertQueue = typeof queues.$inferInsert
export type SelectQueue = typeof queues.$inferSelect
