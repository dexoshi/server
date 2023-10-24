import { Address, createWalletClient, getContract, http } from 'viem'
import { dexoshiAbi } from './dexoshi-abi'

import { privateKeyToAccount } from 'viem/accounts'
import { polygon, polygonMumbai } from 'viem/chains'
import { COLLECTION_SIZE } from '../constants'
import { getErrorMessage } from '../utils'

const chain = process.env.NODE_ENV === 'production' ? polygon : polygonMumbai
const walletClient = createWalletClient({
  chain,
  account: privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`),
  transport: http(process.env.RPC_URL),
})

const dexoshiContract = getContract({
  address: process.env.DEXOSHI_CONTRACT_ADDRESS,
  abi: dexoshiAbi,
  walletClient,
})

export async function mintCard({
  to,
  tokenId = BigInt(0),
}: {
  to: Address
  tokenId?: bigint
  amount?: bigint
}) {
  const hash = await dexoshiContract.write.ownerMint([to, tokenId, 1])
  return hash
}

export function getTokenIdFromMerge({
  tokenOne,
  tokenTwo,
}: {
  tokenOne: bigint
  tokenTwo: bigint
}) {
  return (tokenOne * tokenTwo) % BigInt(COLLECTION_SIZE)
}

export async function mergeCards({
  to,
  tokenOne,
  tokenTwo,
}: {
  to: Address
  tokenOne: bigint
  tokenTwo: bigint
}) {
  try {
    const hash = await dexoshiContract.write.ownerMerge([to, tokenOne, tokenTwo])
    console.log('Merge tx hash:', hash)
    return hash
  } catch (error) {
    const errorMessage = getErrorMessage(error)

    if (errorMessage.includes('not owned')) {
      throw new Error(
        'You are unable to merge because you do not own at least 1 of each card you are trying to merge.'
      )
    }

    console.error('mergeCards error for:', to, error)

    throw new Error(
      "Sorry you've encountered an unknown error. Please try again. If the issue keeps happening, send a DM to @dexoshi on Lens for help."
    )
  }
}
