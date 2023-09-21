import Elysia from 'elysia'
import { lensClient } from './lens-client'

const getPublication = async (publicationId: string) => {
  const result = await lensClient.publication.fetchAll({ commentsOf: publicationId })
  return result
}

export const publications = new Elysia().get('/:id', async ({ params: { id } }) => {
  return getPublication(id)
})
