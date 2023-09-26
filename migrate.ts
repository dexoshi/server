import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { db } from './src/drizzle/db'

// this will automatically run needed migrations on the database
migrate(db, { migrationsFolder: './src/drizzle' })
