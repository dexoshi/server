import { Alchemy, Network } from 'alchemy-sdk'
import { DEXOSHI_CONTRACT_ADDRESS } from './constants'

const settings = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.MATIC_MUMBAI,
}

const alchemy = new Alchemy(settings)

export async function getOwnedCards({ owner }: { owner: string }) {
  const nfts = await alchemy.nft.getNftsForOwner(owner, {
    contractAddresses: [DEXOSHI_CONTRACT_ADDRESS],
  })
  return nfts
}
