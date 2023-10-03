import Elysia from 'elysia'
import { init as initCollect } from './collect-cron'
import { init as initMirror } from './mirror-cron'
import { init as initNotifications } from './notifications-cron'

declare global {
  var hasCronJobsSetup: boolean
}

// Default to true when in development
globalThis.hasCronJobsSetup ??= false

export const startCronJobs = () => (app: Elysia) => {
  // if (process.env.NODE_ENV !== 'production') return app
  if (globalThis.hasCronJobsSetup) return app

  console.log('🕐 Starting cron jobs...')
  initNotifications(app)
  initMirror(app)
  initCollect(app)

  globalThis.hasCronJobsSetup = true
  return app
}
