import { LensClient, development, production } from '@lens-protocol/client'
import { singleton } from '../utils'

const environment = process.env.NODE_ENV === 'development' ? development : production

export const lensClient = singleton('lens-client', () => {
  return new LensClient({
    environment,
  })
})
