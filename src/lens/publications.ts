import Elysia from 'elysia'
import { lensClient } from './lens-client'

export const getPublication = async (publicationId: string) => {
  return lensClient.publication.fetch({ publicationId })
}

export const publications = new Elysia().get('/:id', async ({ params: { id } }) => {
  return getPublication(id)
})
