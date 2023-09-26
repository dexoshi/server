import { ProfileFragment } from '@lens-protocol/client'
import { Address } from 'viem'
import { createInfoComment, createMergeComment, createMintComment } from './comments'
import { getTokenIdFromMerge, mergeCards, mintCard } from './contracts/dexoshi'
import { getCardMetadata } from './ipfs'
import { tryFail } from './utils'

declare global {
  var QUEUES: Record<string, any[]>
}

export const QUEUES = (globalThis.QUEUES ??= {})

export function enqueue(queue: string, item: any) {
  if (!QUEUES[queue]) QUEUES[queue] = []
  QUEUES[queue].push(item)
}

export function dequeue(queue: string) {
  if (!QUEUES[queue]) return
  return QUEUES[queue].shift()
}

type MintQueueItem = {
  publicationId: string
  profile: ProfileFragment
}

export const addToMintQueue = (item: MintQueueItem) => {
  const queue = (QUEUES['card'] ?? []) as MintQueueItem[]
  // Don't add the same item to the queue twice
  if (queue.some((i) => i.publicationId === item.publicationId && item.profile.id === i.profile.id))
    return
  console.log('Mint Card added to Queue For User:', item.profile.name || item.profile.handle)
  console.log('Publication ID:', item.publicationId)
  enqueue('card', item)
}

const getMintQueue = () => {
  const queue = (QUEUES['card'] ?? []) as MintQueueItem[]
  return queue[0]
}

type MergeQueueItem = {
  publicationId: string
  profile: ProfileFragment
  tokenOneId: string
  tokenTwoId: string
}

export const addToMergeQueue = (item: MergeQueueItem) => {
  const queue = (QUEUES['merge'] ?? []) as MergeQueueItem[]
  // Don't add the same item to the queue twice
  if (queue.some((i) => i.publicationId === item.publicationId && item.profile.id === i.profile.id))
    return
  console.log('Merge Card added to Queue For User:', item.profile.name || item.profile.handle)
  console.log('Publication ID:', item.publicationId)
  enqueue('merge', item)
}

function getMergeQueue() {
  const queue = (QUEUES['merge'] ?? []) as MergeQueueItem[]
  return queue[0]
}

type InfoQueueItem = {
  publicationId: string
  content: string
  profile: ProfileFragment
}
export const addToInfoQueue = (item: InfoQueueItem) => {
  const queue = (QUEUES['info'] ?? []) as MergeQueueItem[]
  // Don't add the same item to the queue twice
  if (queue.some((i) => item.profile.id === i.profile.id)) return
  console.log('Request Info added to Queue For User:', item.profile.name || item.profile.handle)
  console.log('Publication ID:', item.publicationId)
  enqueue('info', item)
}

function getInfoQueue() {
  const queue = (QUEUES['info'] ?? []) as InfoQueueItem[]
  return queue[0]
}

export const processQueues = async () => {
  const item = getMintQueue()
  if (item) {
    console.log('Running Mint Queue For Item...')
    const token = Math.round(Math.random() * 255)
    await mintCard({
      to: item.profile.ownedBy as Address,
      tokenId: BigInt(token),
    })
    const cardMetaData = await getCardMetadata(token.toString())

    await createMintComment({
      publicationId: item.publicationId,
      cardImage: cardMetaData.image,
      cardName: cardMetaData.name,
    })

    // Remove the item from the queue after we know it was successful
    dequeue('card')
  }

  const mergeItem = getMergeQueue()
  if (mergeItem) {
    console.log('Running Merge Queue For Item...')
    const tokenOne = BigInt(mergeItem.tokenOneId)
    const tokenTwo = BigInt(mergeItem.tokenTwoId)

    const [err] = await tryFail(() =>
      mergeCards({ to: mergeItem.profile.ownedBy as Address, tokenOne, tokenTwo })
    )

    if (err) {
      await createInfoComment({
        publicationId: mergeItem.publicationId,
        content: err?.error.message,
      })
    }

    const token = getTokenIdFromMerge({ tokenOne, tokenTwo })

    const cardMetaData = await getCardMetadata(token.toString())
    await createMergeComment({
      publicationId: mergeItem.publicationId,
      cardImage: cardMetaData.image,
      cardName: cardMetaData.name,
    })
    dequeue('merge')
  }

  const infoItem = getInfoQueue()
  if (infoItem) {
    console.log('Running Info Queue For Item...')
    await createInfoComment({
      publicationId: infoItem.publicationId,
      content: infoItem.content,
    })
    dequeue('info')
  }

  // Check the queue again after a delay.
  setTimeout(processQueues, 5000)
}
