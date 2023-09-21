import { PublicationMainFocus, PublicationMetadataV2Input } from '@lens-protocol/client'
import { v4 as uuidv4 } from 'uuid'
import { uploadIpfs } from './ipfs'
import { lensClient } from './lens-client'
import { login } from './login'

const prefix = 'create comment'

export const createComment = async ({
  publicationId,
  cardName,
  cardImage,
}: {
  publicationId: string
  cardName: string
  cardImage: string
}) => {
  await login()
  console.log(`${prefix}: uploading to ipfs`)
  const contentURI = await uploadIpfs<PublicationMetadataV2Input>({
    version: '2.0.0',
    mainContentFocus: PublicationMainFocus.Image,
    metadata_id: uuidv4(),
    description: 'Description',
    locale: 'en-US',
    content: `Congratulations! You've just minted ${cardName}!`,
    external_url: null,
    image: cardImage,
    imageMimeType: null,
    name: 'Name',
    attributes: [],
    tags: ['dexoshi', 'gaming', 'nft', 'card', 'trading card'],
    appId: 'dexoshi',
    media: [
      {
        item: cardImage,
        altTag: cardName,
        cover: cardImage,
        type: 'image/png',
      },
    ],
  })
  console.log(`${prefix}: contentURI`, contentURI)

  console.log(`${prefix}: creating comment via dispatcher`)
  const dispatcherResult = await lensClient.publication.createDataAvailabilityCommentViaDispatcher({
    commentOn: publicationId,
    contentURI,
    from: process.env.PROFILE_ID,
  })
  console.log(`${prefix}: dispatcher result`, dispatcherResult)

  const result = dispatcherResult.unwrap()
  if (result.__typename === 'RelayError') {
    console.error('create comment via dispatcher: failed', result.reason)
    throw new Error('create comment via dispatcher: failed')
  }

  return result
}

export const getComments = async (publicationId: string) => {
  return lensClient.publication.fetchAll({ commentsOf: publicationId })
}
