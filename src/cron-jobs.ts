import cron from 'node-cron'
import { getNotifications } from './user-notifications'

declare global {
  var hasCronJobsSetup: boolean
}

globalThis.hasCronJobsSetup ??= false

export const startCronJobs = () => {
  console.log('🕐 Starting cron jobs...')
  // Run every 10 seconds
  if (globalThis.hasCronJobsSetup) return

  cron.schedule('*/10 * * * * *', () => {
    console.log('🕐 Running cron job...')
    getNotifications()
  })
  globalThis.hasCronJobsSetup = true
}
