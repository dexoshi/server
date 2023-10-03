import { lensClient } from './lens-client'

export const getAllWalletsWhoCollected = ({ publicationId }: { publicationId: string }) => {
  return lensClient.publication.allWalletsWhoCollected({
    publicationId,
    limit: 50,
  })
}
