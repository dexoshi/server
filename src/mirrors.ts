import { lensClient } from './lens-client'

export const getWhoMirroredPublication = async ({
  publicationId,
  cursor,
}: {
  publicationId: string
  cursor?: string
}) => {
  const result = await lensClient.profile.fetchAll({
    whoMirroredPublicationId: publicationId,
    limit: 50,
    cursor,
  })
  return result.items
}
