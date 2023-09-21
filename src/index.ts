import { Elysia } from 'elysia'
import { startCronJobs } from './cron-jobs'
import * as env from './env'
import { notifications } from './notifications'
import { publications } from './publications'
import { processMintQueue } from './queue'

env.init()

const app = new Elysia()
  .get('/', () => 'Hello World!')
  .use(startCronJobs())
  .group('/notifications', (app) => app.use(notifications))
  .group('/publications', (app) => app.use(publications))
  .listen(process.env.PORT || 3000)

processMintQueue()

console.log(`Listening at http://localhost:${app?.server?.port}...`)
