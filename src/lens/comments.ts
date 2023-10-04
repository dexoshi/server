import { PublicationMainFocus, PublicationMetadataV2Input } from '@lens-protocol/client'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/db'
import { publications } from '../db/schema'
import { uploadIpfs } from '../services/ipfs'
import { login } from './authentication'
import { lensClient } from './lens-client'

const prefix = 'create comment'

async function createComment({
  publicationId,
  content,
  image,
  media,
  mainContentFocus = PublicationMainFocus.Image,
}: {
  content: string
  publicationId: string
  image?: string
  media?: { item: string; altTag: string; cover: string; type: string }[]
  mainContentFocus?: PublicationMainFocus
}) {
  await login()
  console.log(`${prefix}: uploading to ipfs`)
  const contentURI = await uploadIpfs<PublicationMetadataV2Input>({
    version: '2.0.0',
    mainContentFocus: mainContentFocus,
    metadata_id: uuidv4(),
    description: 'Description',
    locale: 'en-US',
    content,
    external_url: null,
    image,
    imageMimeType: null,
    name: 'Name',
    attributes: [],
    tags: ['dexoshi', 'gaming', 'nft', 'card', 'trading card'],
    appId: 'dexoshi',
    media: media,
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

  await db
    .insert(publications)
    .values({
      publicationId,
      commentedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: publications.publicationId,
      set: { commentedAt: new Date() },
    })

  return result
}
export const createMintComment = async ({
  publicationId,
  cardName,
  cardImage,
  profileHandle,
}: {
  publicationId: string
  cardName: string
  cardImage: string
  profileHandle: string
}) => {
  const result = await createComment({
    publicationId,
    content: `Congratulations @${profileHandle}! You've just minted ${cardName}!`,
    image: cardImage,
    media: [
      {
        item: cardImage,
        altTag: cardName,
        cover: cardImage,
        type: 'image/png',
      },
    ],
  })

  return result
}

export const createMergeComment = async ({
  publicationId,
  cardName,
  cardImage,
}: {
  publicationId: string
  cardName: string
  cardImage: string
}) => {
  const result = await createComment({
    publicationId,
    content: `Congratulations! You've successfully merged your cards to create ${cardName}!`,
    image: cardImage,
    media: [
      {
        item: cardImage,
        altTag: cardName,
        cover: cardImage,
        type: 'image/png',
      },
    ],
  })

  return result
}

export const createInfoComment = async ({
  publicationId,
  content,
}: {
  publicationId: string
  content: string
}) => {
  const result = await createComment({
    publicationId,
    content,
    mainContentFocus: PublicationMainFocus.TextOnly,
  })

  return result
}

export const getComments = async (publicationId: string) => {
  return lensClient.publication.fetchAll({ commentsOf: publicationId })
}
