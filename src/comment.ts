import { PublicationMainFocus } from "@lens-protocol/client"
import { v4 as uuidv4 } from "uuid"
import { uploadIpfs } from "./ipfs"
import { lensClient } from "./lens-client"
import { login } from "./login"

const prefix = "create comment"

export const createComment = async ({ publicationId }: { publicationId: string }) => {
  await login()
  console.log(`${prefix}: uploading to ipfs`)
  const contentURI = await uploadIpfs({
    version: "2.0.0",
    mainContentFocus: PublicationMainFocus.TextOnly,
    metadata_id: uuidv4(),
    description: "Description",
    locale: "en-US",
    content: "Congratulations! You've just minted an Ivarick the Teensy Toad NFT Card!",
    external_url: null,
    image:
      "https://user-images.githubusercontent.com/19412160/210462871-110a0df1-611b-4bf9-b3b7-6dae03b22524.jpg",
    imageMimeType: null,
    name: "Name",
    attributes: [],
    tags: ["dexoshi", "gaming", "nft", "card", "trading card"],
    appId: "dexoshi",
  })
  console.log(`${prefix}: contentURI`, contentURI)

  console.log(`${prefix}: creating comment via dispatcher`)
  const dispatcherResult = await lensClient.publication.createDataAvailabilityCommentViaDispatcher({
    commentOn: publicationId,
    contentURI,
    from: process.env.PROFILE_ID,
  })
  console.log(`${prefix}: dispatcher result`, dispatcherResult)

  const result = dispatcherResult.unwrap()
  if (result.__typename === "RelayError") {
    console.error("create comment via dispatcher: failed", result.reason)
    throw new Error("create comment via dispatcher: failed")
  }

  return result
}
