import { CustomFiltersTypes } from '@lens-protocol/client'
import { createComment } from './comment'
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

  const items = notifications.unwrap().items

  await Promise.all(
    items.map(async (n) => {
      if (n.__typename === 'NewMentionNotification') {
        const content = n.mentionPublication.metadata.content
        const [name, command] = content?.split(' ') ?? []
        if (name?.includes('charlieblackstock') && command === 'drop') {
          // TODO: add logic to drop them a card
          await createComment({ publicationId: n.mentionPublication.id })
        }
      }
    })
  )
  return items
}
