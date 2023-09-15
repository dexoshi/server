// @ts-ignore
import IPFS from "ipfs-infura"

const client = new IPFS({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
  projectId: process.env.INFURA_API_KEY,
  projectSecret: process.env.INFURA_API_KEY_SECRET,
})

export const uploadIpfs = async <T>(data: T) => {
  const result = await client.addJSON(data)

  return `https://ipfs.io/ipfs/${result}`
}

export const uploadIpfsGetPath = async <T>(data: T) => {
  const result = await client.add(JSON.stringify(data))

  console.log("upload result ipfs", result)
  return result.path
}
