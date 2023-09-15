import { startCronJobs } from './cron-jobs'
import * as env from './env'
import { getProfile } from './profile'
import { getNotifications } from './user-notifications'

env.init()

if (process.env.NODE_ENV !== 'production') {
  startCronJobs()
}

const server = Bun.serve({
  port: process.env.PORT || 3000,
  development: true,
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname === '/') {
      const notifications = await getNotifications()
      return new Response(
        `
      <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Active Cron Jobs</title>
</head>
<body>
    <h1>Active Cron Job</h1>
    <ul>
    ${notifications.map((n) => `<li>${n.notificationId}</li>`).join('')}
    </ul>
</body>
</html>`,
        { headers: { 'content-type': 'text/html' } }
      )
    }
    if (url.pathname === '/profile') {
      const profile = await getProfile()
      return new Response(JSON.stringify(profile))
    }
    if (url.pathname === '/blog') return new Response('Blog!')
    return new Response(`Bun!`)
  },
})

console.log(`Listening at http://localhost:${server.port}...`)
