import { lensClient } from './lens-client'

export const getWhoMirroredPublication = async ({ publicationId }: { publicationId: string }) => {
  return lensClient.profile.fetchAll({
    whoMirroredPublicationId: publicationId,
    limit: 50,
  })
}
