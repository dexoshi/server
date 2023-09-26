import { Elysia, t } from 'elysia'
import { getOwnedCards } from './alchemyt'
import { createCardInfoSummary, startCronJobs } from './cron-jobs'
import * as env from './env'
import { notifications } from './notifications'
import { publications } from './publications'
import { processQueues } from './queue'

env.init()

const app = new Elysia()
  .get('/', async () => 'Hello World!')
  .get(
    '/info',
    async ({ query }) => {
      const nfts = await getOwnedCards({ owner: query.address })
      const content = createCardInfoSummary(nfts.ownedNfts)
      return content
    },
    {
      query: t.Object({
        address: t.String(),
      }),
    }
  )

  .use(startCronJobs())
  .group('/notifications', (app) => app.use(notifications))
  .group('/publications', (app) => app.use(publications))
  .listen(process.env.PORT || 3000)

processQueues()

console.log(`Listening at http://localhost:${app?.server?.port}...`)
