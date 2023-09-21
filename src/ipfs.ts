// @ts-ignore
import IPFS from 'ipfs-infura'
import { z } from 'zod'

const client = new IPFS({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  projectId: process.env.INFURA_API_KEY,
  projectSecret: process.env.INFURA_API_KEY_SECRET,
})

export const uploadIpfs = async <T>(data: T) => {
  const result = await client.addJSON(data)

  return `https://ipfs.io/ipfs/${result}`
}

export const uploadIpfsGetPath = async <T>(data: T) => {
  const result = await client.add(JSON.stringify(data))

  console.log('upload result ipfs', result)
  return result.path
}

const CardMetaData = z.object({
  name: z.string(),
  image: z.string(),
  cacheImage: z.string(),
  description: z.string(),
  external_url: z.string(),
  attributes: z.array(z.object({ trait_type: z.string(), value: z.string().or(z.number()) })),
})
export const getCardMetadata = async (tokenId: string) => {
  return fetch(
    `https://ipfs.io/ipfs/bafybeib65p2miyvw4oabbg4itjaore33bxj2r5zozfabqv7cigsyradiga/${tokenId}.json`
  )
    .then((res) => res.json())
    .then(CardMetaData.parse)
}
