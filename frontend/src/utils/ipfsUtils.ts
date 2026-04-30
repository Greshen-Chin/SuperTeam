type NftStorageMetadataInput = {
  title: string;
  description: string;
  video: File;
  thumbnail?: File;
  sha256: string;
  phash: string;
  creatorWallet: string;
};

export async function uploadVideoMetadataToNftStorage(input: NftStorageMetadataInput, apiKey: string) {
  if (!apiKey) {
    throw new Error("NFT.Storage API key belum diatur.");
  }

  const formData = new FormData();
  formData.append("video", input.video);
  if (input.thumbnail) formData.append("thumbnail", input.thumbnail);
  formData.append(
    "metadata",
    JSON.stringify({
      name: input.title,
      description: input.description,
      properties: {
        creatorWallet: input.creatorWallet,
        sha256: input.sha256,
        phash: input.phash,
        registeredAt: new Date().toISOString()
      }
    })
  );

  const response = await fetch("https://api.nft.storage/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  const payload = (await response.json()) as { ok?: boolean; value?: { cid?: string }; error?: { message?: string } };
  if (!response.ok || !payload.ok || !payload.value?.cid) {
    throw new Error(payload.error?.message ?? "Upload IPFS gagal. Coba lagi beberapa saat lagi.");
  }

  return {
    cid: payload.value.cid,
    metadataUri: `ipfs://${payload.value.cid}`,
    gatewayUrl: `https://${payload.value.cid}.ipfs.nftstorage.link`
  };
}

export function ipfsToGateway(uri?: string | null) {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`;
  return uri;
}
