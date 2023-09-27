import { eq } from 'drizzle-orm'
import { Address } from 'viem'
import { createInfoComment, createMergeComment, createMintComment } from './comments'
import { getTokenIdFromMerge, mergeCards, mintCard } from './contracts/dexoshi'
import { db } from './db/db'
import {
  InfoQueueItem,
  MergeQueueItem,
  MintQueueItem,
  QueueValue,
  SelectQueue,
  queues,
} from './db/schema'
import { getCardMetadata } from './ipfs'
import { tryFail } from './utils'

type QueueName = NonNullable<SelectQueue['name']>
async function getQueue(name: QueueName) {
  const queue = await db.query.queues.findMany({ where: (q, { eq }) => eq(q.name, name) })
  // @ts-expect-error
  return queue.map((q) => ({ ...q, value: JSON.parse(q.value) as QueueValue }))
}

async function enqueue(queue: QueueName, value: QueueValue) {
  // @ts-expect-error
  await db.insert(queues).values({ name: queue, value: JSON.stringify(value) })
}

function dequeue(id: string) {
  return db.delete(queues).where(eq(queues.id, id))
}

export const addToMintQueue = async (item: MintQueueItem) => {
  const queue = await getQueue('card')

  // Don't add the same item to the queue twice
  if (
    queue.some(
      (i) => i.value.publicationId === item.publicationId && item.profile.id === i.value.profile.id
    )
  )
    return
  console.log('Mint Card added to Queue For User:', item.profile.name || item.profile.handle)
  console.log('Publication ID:', item.publicationId)
  enqueue('card', item)
}

export const addToMergeQueue = async (item: MergeQueueItem) => {
  const queue = await getQueue('merge')
  // Don't add the same item to the queue twice
  if (
    queue.some(
      (i) => i.value.publicationId === item.publicationId && item.profile.id === i.value.profile.id
    )
  )
    return
  console.log('Merge Card added to Queue For User:', item.profile.name || item.profile.handle)
  console.log('Publication ID:', item.publicationId)
  enqueue('merge', item)
}

export const addToInfoQueue = async (item: InfoQueueItem) => {
  const queue = await getQueue('info')
  // Don't add the same item to the queue twice
  if (queue.some((i) => item.profile.id === i.value.profile.id)) return
  console.log('Request Info added to Queue For User:', item.profile.name || item.profile.handle)
  console.log('Publication ID:', item.publicationId)
  enqueue('info', item)
}

async function getInfoQueue() {
  const queue = await getQueue('info')
  return queue[0]
}

export const processQueues = async () => {
  const item = await db.query.queues.findFirst()
  if (item) {
    const value = item.value

    if (value.type === 'mint') {
      console.log('Running Mint Queue For Item...')
      const token = Math.round(Math.random() * 255)
      await mintCard({
        to: value.profile.ownedBy as Address,
        tokenId: BigInt(token),
      })
      const cardMetaData = await getCardMetadata(token.toString())

      await createMintComment({
        publicationId: value.publicationId,
        cardImage: cardMetaData.image,
        cardName: cardMetaData.name,
      })

      // Remove the item from the queue after we know it was successful
      dequeue(item.id)
    }

    if (value.type === 'merge') {
      console.log('Running Merge Queue For Item...')
      const tokenOne = BigInt(value.tokenOneId)
      const tokenTwo = BigInt(value.tokenTwoId)

      const [err] = await tryFail(() =>
        mergeCards({ to: value.profile.ownedBy as Address, tokenOne, tokenTwo })
      )

      if (err) {
        await createInfoComment({
          publicationId: value.publicationId,
          content: err?.error.message,
        })
      }

      const token = getTokenIdFromMerge({ tokenOne, tokenTwo })

      const cardMetaData = await getCardMetadata(token.toString())
      await createMergeComment({
        publicationId: value.publicationId,
        cardImage: cardMetaData.image,
        cardName: cardMetaData.name,
      })
      dequeue(item.id)
    }

    if (value.type === 'info') {
      console.log('Running Info Queue For Item...')
      await createInfoComment({
        publicationId: value.publicationId,
        content: value.content,
      })
      dequeue(item.id)
    }
  }

  // Check the queue again after a delay.
  setTimeout(processQueues, 5000)
}
