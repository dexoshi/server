import { CustomFiltersTypes, NotificationTypes } from '@lens-protocol/client'
import Elysia from 'elysia'
import { lensClient } from './lens-client'
import { login } from './login'

export async function getNotifications() {
  await login()
  const notifications = await lensClient.notifications.fetch({
    profileId: process.env.PROFILE_ID,
    limit: 20,
    customFilters: [CustomFiltersTypes.Gardeners],
    notificationTypes: [NotificationTypes.MentionPost],
    highSignalFilter: false,
  })

  const items = notifications.unwrap().items

  return items
}

export const notifications = new Elysia().get('/', async () => {
  return getNotifications()
})
