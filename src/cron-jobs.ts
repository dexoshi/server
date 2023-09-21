import cron from '@elysiajs/cron'
import Elysia from 'elysia'
import { getComments } from './comments'
import { getNotifications } from './notifications'
import { addToMintQueue } from './queue'

declare global {
  var hasCronJobsSetup: boolean
}

// Default to true when in development
globalThis.hasCronJobsSetup ??= false

export const startCronJobs = () => (app: Elysia) => {
  // if (process.env.NODE_ENV !== 'production') return app
  if (globalThis.hasCronJobsSetup) return app

  console.log('🕐 Starting cron jobs...')

  app.use(
    cron({
      name: 'check-notifications',
      pattern: '*/15 * * * * *',
      run: async () => {
        console.log('🕐 Running cron job...')
        const notifications = await getNotifications()
        await Promise.all([
          await Promise.all(
            notifications.map(async (n) => {
              if (n.__typename === 'NewMentionNotification') {
                const content = n.mentionPublication.metadata.content
                const [name, command] = content?.split(' ') ?? []
                if (name?.includes('dexoshi') && command === '#drop') {
                  const checkComments = await getComments(n.mentionPublication.id)
                  const hasCommented = checkComments.items.some(
                    (c) => c.profile.id === process.env.PROFILE_ID
                  )

                  if (hasCommented) return

                  addToMintQueue({ publication: n })
                }
              }
            })
          ),
        ])
      },
    })
  )

  globalThis.hasCronJobsSetup = true
  return app
}
