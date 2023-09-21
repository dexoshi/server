import { NewMentionNotificationFragment } from '@lens-protocol/client'
import { Address } from 'viem'
import { createComment } from './comments'
import { mintCard } from './contracts/dexoshi'
import { getCardMetadata } from './ipfs'

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

export const addToMintQueue = (item: { publication: NewMentionNotificationFragment }) => {
  const queue = (QUEUES['card'] ?? []) as { publication: NewMentionNotificationFragment }[]
  if (queue.some((i) => i.publication.notificationId === item.publication.notificationId)) return
  console.log('Mint Card added to Queue:', item.publication.notificationId)
  enqueue('card', item)
}

const getMintQueue = () => {
  const queue = (QUEUES['card'] ?? []) as { publication: NewMentionNotificationFragment }[]
  return queue[0]
}

export const processMintQueue = async () => {
  console.log('Processing Mint Queue...')
  const item = getMintQueue()
  if (item) {
    console.log('Running Mint Queue For Item...')
    const token = Math.round(Math.random() * 255)
    console.log('🚀 ~ file: queue.ts:36 ~ processMintQueue ~ token:', token)
    const { mentionPublication } = item.publication
    await mintCard({
      to: mentionPublication.profile.ownedBy as Address,
      tokenId: BigInt(token),
    })
    const cardMetaData = await getCardMetadata(token.toString())

    await createComment({
      publicationId: mentionPublication.id,
      cardImage: cardMetaData.image,
      cardName: cardMetaData.name,
    })

    // Remove the item from the queue after we know it was successful
    dequeue('card')
  }

  // Check the queue again after a delay.
  setTimeout(processMintQueue, 5000)
}
