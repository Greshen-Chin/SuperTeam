import "dotenv/config";

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? null,
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  host: process.env.HOST ?? "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET ?? "vidchain-local-dev-secret-change-me",
  port: Number(process.env.PORT ?? 4000),
  solanaRpcUrl: process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
  solanaCluster: process.env.SOLANA_CLUSTER ?? "devnet",
  pinataJwt: process.env.PINATA_JWT ?? null,
  nftStorageKey: process.env.NFT_STORAGE_API_KEY ?? null,
  skipTxVerify: process.env.SKIP_TX_VERIFY === "true",
  vidchainProgramId: process.env.VIDCHAIN_PROGRAM_ID ?? null,
  vidchainPlatformWallet: process.env.VIDCHAIN_PLATFORM_WALLET ?? null,
  vidchainAdminWallets: (process.env.VIDCHAIN_ADMIN_WALLETS ?? "").split(",").filter(Boolean),
  logLevel: process.env.LOG_LEVEL ?? "info"
};
