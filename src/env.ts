import { Network } from 'alchemy-sdk'
import { Address } from 'viem'
import { z } from 'zod'

const EthHex = z.custom<Address>((data) => {
  if (typeof data === 'string') return data.startsWith('0x')
  return false
}, 'Invalid hex')

const envVariables = z.object({
  PRIVATE_KEY: z.string(),
  PROFILE_ID: z.string(),
  INFURA_API_KEY: z.string(),
  INFURA_API_KEY_SECRET: z.string(),
  ALCHEMY_API_KEY: z.string(),
  DATABASE_URL: z.string(),
  DATABASE_AUTH_TOKEN: z.string(),
  DEXOSHI_CONTRACT_ADDRESS: EthHex,
  NETWORK: z.nativeEnum(Network),
  RPC_URL: z.string().url(),
})

export function init() {
  envVariables.parse(process.env)
}

declare global {
  namespace NodeJS {
    // Property 'SOMETHING_COOL' of type 'number' is not assignable
    // to 'string' index type 'string | undefined'.
    interface ProcessEnv extends z.infer<typeof envVariables> {}
  }
}
