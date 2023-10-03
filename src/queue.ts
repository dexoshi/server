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
  mintedCards,
  queues,
} from './db/schema'
import { getCardMetadata } from './ipfs'
import { tryFail } from './utils'

type QueueName = NonNullable<SelectQueue['name']>
async function getQueue(name?: QueueName) {
  const queue = await db.query.queues.findMany({
    ...(name && { where: (q, { eq }) => eq(q.name, name) }),
  })
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
  await enqueue('card', item)
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
  await enqueue('merge', item)
}

export const addToInfoQueue = async (item: InfoQueueItem) => {
  const queue = await getQueue('info')
  // Don't add the same item to the queue twice
  if (queue.some((i) => item.profile.id === i.value.profile.id)) return
  console.log('Request Info added to Queue For User:', item.profile.name || item.profile.handle)
  console.log('Publication ID:', item.publicationId)
  await enqueue('info', item)
}

export const processQueues = async () => {
  const item = await db.query.queues.findFirst()
  if (item) {
    try {
      // @ts-expect-error
      const value = JSON.parse(item.value) as QueueValue

      if (value.type === 'mint') {
        const token = value.tokenId || Math.round(Math.random() * 255)
        const mintedCard = await db.query.mintedCards.findFirst({
          where: (c, { and, eq }) => {
            return and(eq(c.publicationId, value.publicationId), eq(c.profileId, value.profile.id))
          },
        })

        if (mintedCard) {
          console.error('Card has already been minted for this user and publication: ', {
            publicationId: value.publicationId,
            profileId: value.profile.id,
            handle: value.profile.handle,
            name: value.profile.name,
          })
          await dequeue(item.id)
        } else {
          // TODO: abstract this logic to check for mints and update mint cards table if we want to
          // use this function in other places in the codebase
          await mintCard({
            to: value.profile.ownedBy as Address,
            tokenId: BigInt(token),
          })
          await db.insert(mintedCards).values({
            profileId: value.profile.id,
            publicationId: value.publicationId,
          })
          const cardMetaData = await getCardMetadata(token.toString())

          await createMintComment({
            publicationId: value.publicationId,
            cardImage: cardMetaData.image,
            cardName: cardMetaData.name,
            profileHandle: value.profile.handle,
          })

          // Remove the item from the queue after we know it was successful
          await dequeue(item.id)
        }
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
          await dequeue(item.id)
        } else {
          const token = getTokenIdFromMerge({ tokenOne, tokenTwo })

          const cardMetaData = await getCardMetadata(token.toString())
          await createMergeComment({
            publicationId: value.publicationId,
            cardImage: cardMetaData.image,
            cardName: cardMetaData.name,
          })
          await dequeue(item.id)
        }
      }

      if (value.type === 'info') {
        console.log('Running Info Queue For Item...')
        await createInfoComment({
          publicationId: value.publicationId,
          content: value.content,
        })
        await dequeue(item.id)
      }
    } catch (error) {
      console.error(error)
    }
  }

  // Check the queue again after a delay.
  setTimeout(processQueues, 5000)
}
