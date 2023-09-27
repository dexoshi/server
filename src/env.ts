import { z } from 'zod'

const envVariables = z.object({
  PRIVATE_KEY: z.string(),
  PROFILE_ID: z.string(),
  INFURA_API_KEY: z.string(),
  INFURA_API_KEY_SECRET: z.string(),
  ALCHEMY_API_KEY: z.string(),
  DATABASE_URL: z.string(),
  DATABASE_AUTH_TOKEN: z.string(),
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
