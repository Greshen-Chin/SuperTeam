import { Connection, PublicKey } from "@solana/web3.js";
import { ipfsToGateway } from "@/utils/ipfsUtils";

const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export type VidChainNft = {
  mintAddress: string;
  title: string;
  description: string;
  registeredAt: string;
  thumbnail: string;
  metadataUri: string;
  certificateUrl: string;
  sha256?: string;
  phash?: string;
  creatorWallet?: string;
  transactionSignature?: string;
  ipfsVideo?: string;
};

export async function fetchWalletNfts(connection: Connection, owner: PublicKey): Promise<VidChainNft[]> {
  const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
  });

  const candidateMints = accounts.value
    .map((account) => {
      const info = account.account.data.parsed.info;
      const amount = info.tokenAmount;
      return amount.decimals === 0 && amount.uiAmount === 1 ? String(info.mint) : null;
    })
    .filter((mint): mint is string => Boolean(mint));

  const nfts = await Promise.all(candidateMints.map((mint) => fetchNftByMint(connection, mint)));
  return nfts.filter((nft): nft is VidChainNft => Boolean(nft));
}

export async function fetchNftByMint(connection: Connection, mintAddress: string): Promise<VidChainNft | null> {
  const mint = new PublicKey(mintAddress);
  const [metadataAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  );

  const account = await connection.getAccountInfo(metadataAddress);
  if (!account) return null;

  const metadata = decodeTokenMetadata(account.data);
  const offchain = await fetchOffchainMetadata(metadata.uri);

  return {
    mintAddress,
    title: offchain.name || metadata.name || "Video terdaftar",
    description: offchain.description || "Sertifikat video VidChain di Solana Devnet.",
    registeredAt: String(offchain.properties?.registeredAt ?? offchain.attributes?.find((item) => item.trait_type === "registered_at")?.value ?? ""),
    thumbnail: ipfsToGateway(String(offchain.image || offchain.properties?.thumbnail || "")),
    metadataUri: metadata.uri,
    certificateUrl: `/cert/${mintAddress}`,
    sha256: String(offchain.properties?.sha256 ?? ""),
    phash: String(offchain.properties?.phash ?? ""),
    creatorWallet: String(offchain.properties?.creatorWallet ?? ""),
    transactionSignature: String(offchain.properties?.transactionSignature ?? ""),
    ipfsVideo: ipfsToGateway(String(offchain.animation_url || offchain.properties?.video || ""))
  };
}

function decodeTokenMetadata(data: Buffer) {
  let offset = 1 + 32 + 32;
  const name = readRustString(data, offset);
  offset = name.nextOffset;
  const symbol = readRustString(data, offset);
  offset = symbol.nextOffset;
  const uri = readRustString(data, offset);

  return {
    name: name.value.replace(/\0/g, "").trim(),
    symbol: symbol.value.replace(/\0/g, "").trim(),
    uri: uri.value.replace(/\0/g, "").trim()
  };
}

function readRustString(data: Buffer, offset: number) {
  const length = data.readUInt32LE(offset);
  const start = offset + 4;
  const end = start + length;
  return {
    value: data.subarray(start, end).toString("utf8"),
    nextOffset: end
  };
}

async function fetchOffchainMetadata(uri: string) {
  if (!uri) return {};
  try {
    const response = await fetch(ipfsToGateway(uri), { cache: "no-store" });
    if (!response.ok) return {};
    return (await response.json()) as {
      name?: string;
      description?: string;
      image?: string;
      animation_url?: string;
      attributes?: Array<{ trait_type: string; value: string }>;
      properties?: Record<string, unknown>;
    };
  } catch {
    return {};
  }
}
