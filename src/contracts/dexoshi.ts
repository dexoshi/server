import { Address, createWalletClient, getContract, http } from 'viem'
import { dexoshiAbi } from './dexoshi-abi'

import { privateKeyToAccount } from 'viem/accounts'
import { polygonMumbai } from 'viem/chains'

const walletClient = createWalletClient({
  chain: polygonMumbai,
  account: privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`),
  transport: http(),
})

const dexoshiContract = getContract({
  address: '0x5003FD6974A23949C7F1669146d8B5E5cF1c929d',
  abi: dexoshiAbi,
  walletClient,
})

export async function mintCard({
  to,
  tokenId = BigInt(0),
  amount = BigInt(1),
}: {
  to: Address
  tokenId?: bigint
  amount?: bigint
}) {
  const hash = await dexoshiContract.write.ownerMint([to, tokenId])
  console.log(hash)
  return hash
}
