import { ethers } from 'ethers'
import { lensClient } from './lens-client'

export async function login() {
  let isLoggedIn = await lensClient.authentication.isAuthenticated()

  if (!isLoggedIn) {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY)
    const address = await wallet.getAddress()

    const challenge = await lensClient.authentication.generateChallenge(address)
    const signature = await wallet.signMessage(challenge)

    await lensClient.authentication.authenticate(address, signature)

    // check the state with
    const isLoggedIn = await lensClient.authentication.isAuthenticated()
    if (!isLoggedIn) throw new Error('Unable to login with Lens.')
  }
}
