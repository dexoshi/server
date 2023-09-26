import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core'
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
