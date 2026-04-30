export function getGoogleClientId() {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
}

export function getSolanaRpcUrl() {
  return process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";
}

export function getNftStorageKey() {
  return process.env.NEXT_PUBLIC_NFTSTORAGE_KEY ?? "";
}

export function getAppSalt() {
  return process.env.NEXT_PUBLIC_APP_SALT ?? "vidchain_salt_2025";
}
