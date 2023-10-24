import { Alchemy } from 'alchemy-sdk'

const settings = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: process.env.NETWORK,
}

const alchemy = new Alchemy(settings)

export async function getOwnedCards({ owner }: { owner: string }) {
  const nfts = await alchemy.nft.getNftsForOwner(owner, {
    contractAddresses: [process.env.DEXOSHI_CONTRACT_ADDRESS],
  })
  return nfts
}
