export type NftMetadataInput = {
  proofId: string;
  title: string;
  description?: string;
  creatorWallet: string;
  sha256: string;
  fingerprintRoot: string;
  ipfsVideoUri?: string;
  ipfsThumbnailUri?: string;
  registeredAt: string;
};

export type MetaplexJson = {
  name: string;
  symbol: string;
  description: string;
  image: string;
  animation_url?: string;
  external_url: string;
  attributes: Array<{ trait_type: string; value: string }>;
  properties: {
    category: string;
    files: Array<{ uri: string; type: string }>;
    creators: Array<{ address: string; share: number }>;
  };
};

const FALLBACK_IMAGE = "https://vidchain.app/og-image.png";

export function buildNftMetadata(input: NftMetadataInput): MetaplexJson {
  const meta: MetaplexJson = {
    name: `VidChain Proof — ${input.title}`,
    symbol: "VIDPROOF",
    description: input.description ?? `VidChain proof of ownership for "${input.title}".`,
    image: input.ipfsThumbnailUri ?? FALLBACK_IMAGE,
    external_url: `https://vidchain.app/certificate/${input.proofId}`,
    attributes: [
      { trait_type: "SHA-256", value: input.sha256 },
      { trait_type: "Fingerprint Root", value: input.fingerprintRoot },
      { trait_type: "Creator Wallet", value: input.creatorWallet },
      { trait_type: "Registered At", value: input.registeredAt }
    ],
    properties: {
      category: "video",
      files: input.ipfsVideoUri ? [{ uri: input.ipfsVideoUri, type: "video/mp4" }] : [],
      creators: [{ address: input.creatorWallet, share: 100 }]
    }
  };

  if (input.ipfsVideoUri) {
    meta.animation_url = input.ipfsVideoUri;
  }

  return meta;
}
