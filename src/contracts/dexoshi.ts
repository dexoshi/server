import { Address, createWalletClient, getContract, http } from 'viem'
import { dexoshiAbi } from './dexoshi-abi'

import { privateKeyToAccount } from 'viem/accounts'
import { polygonMumbai } from 'viem/chains'
import { DEXOSHI_CONTRACT_ADDRESS } from '../constants'
import { getErrorMessage } from '../utils'

const walletClient = createWalletClient({
  chain: polygonMumbai,
  account: privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`),
  transport: http(),
})

const dexoshiContract = getContract({
  address: DEXOSHI_CONTRACT_ADDRESS,
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
  const hash = await dexoshiContract.write.ownerMint([to, tokenId])
  console.log(hash)
  return hash
}

export function getTokenIdFromMerge({
  tokenOne,
  tokenTwo,
}: {
  tokenOne: bigint
  tokenTwo: bigint
}) {
  return (tokenOne * tokenTwo) % BigInt(256)
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
