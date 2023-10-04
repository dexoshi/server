import { LensClient, development } from '@lens-protocol/client'
import { singleton } from '../utils'

export const lensClient = singleton('lens-client', () => {
  return new LensClient({
    environment: development,
  })
})
