import { Elysia, t } from 'elysia'
import { startCronJobs } from './cron-jobs/cron-jobs'
import { createCardInfoSummary } from './cron-jobs/notifications-cron'
import * as env from './env'
import { getAllWalletsWhoCollected } from './lens/collects'
import { notifications } from './lens/notifications'
import { publications } from './lens/publications'
import { processQueues } from './queue'
import { getOwnedCards } from './services/alchemy'

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
  .get(
    '/collects',
    ({ query }) => {
      return getAllWalletsWhoCollected({ publicationId: query.publication_id })
    },
    {
      query: t.Object({
        publication_id: t.String(),
      }),
    }
  )
  .listen(process.env.PORT || 3000)

processQueues()

console.log(`Listening at http://localhost:${app?.server?.port}...`)
