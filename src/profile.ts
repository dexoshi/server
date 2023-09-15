import { lensClient } from "./lens-client"

export const getProfile = async () => {
  return lensClient.profile.fetch({
    profileId: process.env.PROFILE_ID,
  })
}
