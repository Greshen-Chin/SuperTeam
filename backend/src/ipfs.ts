import { config } from "./config.js";

export type IpfsUploadResult = {
  cid: string;
  ipfsUrl: string;
  gatewayUrl: string;
};

export async function uploadToIpfs(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<IpfsUploadResult> {
  if (config.pinataJwt) {
    return uploadViaPinata(fileBuffer, fileName, mimeType);
  }
  if (config.nftStorageKey) {
    return uploadViaNftStorage(fileBuffer, mimeType);
  }
  throw new Error("No IPFS provider configured. Set PINATA_JWT or NFT_STORAGE_API_KEY in backend/.env");
}

async function uploadViaPinata(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<IpfsUploadResult> {
  const formData = new FormData();
  const arrayBuffer = fileBuffer.buffer instanceof ArrayBuffer
    ? fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
    : fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength) as unknown as ArrayBuffer;
  formData.append("file", new Blob([arrayBuffer], { type: mimeType }), fileName);
  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: fileName })
  );

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.pinataJwt}` },
    body: formData,
    signal: AbortSignal.timeout(60_000)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata upload failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as { IpfsHash: string };
  const cid = json.IpfsHash;
  return {
    cid,
    ipfsUrl: `ipfs://${cid}`,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`
  };
}

async function uploadViaNftStorage(
  fileBuffer: Buffer,
  mimeType: string
): Promise<IpfsUploadResult> {
  const response = await fetch("https://api.nft.storage/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.nftStorageKey}`,
      "Content-Type": mimeType
    },
    body: fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength) as ArrayBuffer,
    signal: AbortSignal.timeout(60_000)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NFT.Storage upload failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as { value: { cid: string } };
  const cid = json.value.cid;
  return {
    cid,
    ipfsUrl: `ipfs://${cid}`,
    gatewayUrl: `https://nftstorage.link/ipfs/${cid}`
  };
}
