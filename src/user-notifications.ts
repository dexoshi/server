import { CustomFiltersTypes } from '@lens-protocol/client'
import { lensClient } from './lens-client'
import { login } from './login'

export async function getNotifications() {
  await login()
  const notifications = await lensClient.notifications.fetch({
    profileId: process.env.PROFILE_ID,
    limit: 20,
    customFilters: [CustomFiltersTypes.Gardeners],
    highSignalFilter: false,
  })

  return notifications.unwrap().items
}
