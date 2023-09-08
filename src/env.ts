import { z } from 'zod'

const envVariables = z.object({
  PRIVATE_KEY: z.string(),
  PROFILE_ID: z.string(),
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
