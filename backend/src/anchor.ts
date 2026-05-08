import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction
} from "@solana/web3.js";
import bs58 from "bs58";
import { config } from "./config.js";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

let cachedKeypair: Keypair | null = null;

function loadPlatformKeypair(): Keypair {
  if (cachedKeypair) return cachedKeypair;
  if (!config.platformWalletSecret) {
    throw new Error("PLATFORM_WALLET_SECRET is not set in backend/.env.");
  }
  const secret = bs58.decode(config.platformWalletSecret);
  cachedKeypair = Keypair.fromSecretKey(secret);
  return cachedKeypair;
}

export function getPlatformWalletAddress(): string {
  return loadPlatformKeypair().publicKey.toBase58();
}

export type AnchorProofInput = {
  proofId: string;
  creatorWallet: string;
  sha256: string;
  fingerprintRoot: string;
  metadataUri?: string;
};

export type AnchorProofResult = {
  signature: string;
  explorerUrl: string;
};

export async function anchorProofOnChain(input: AnchorProofInput): Promise<AnchorProofResult> {
  const platform = loadPlatformKeypair();
  const connection = new Connection(config.solanaRpcUrl, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 35_000
  });

  const memoPayload = JSON.stringify({
    v: 1,
    type: "vidchain.proof",
    id: input.proofId,
    creator: input.creatorWallet,
    sha: input.sha256,
    root: input.fingerprintRoot,
    ...(input.metadataUri ? { uri: input.metadataUri } : {})
  });

  const tx = new Transaction().add(
    new TransactionInstruction({
      keys: [{ pubkey: platform.publicKey, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoPayload, "utf8")
    })
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = platform.publicKey;
  tx.sign(platform);

  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed"
  });

  const confirmation = await Promise.race([
    connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed"
    ),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Solana confirmation timed out.")), 35_000);
    })
  ]);

  if (confirmation.value.err) {
    throw new Error(`Solana transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }

  const cluster = config.solanaCluster;
  const explorerSuffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return {
    signature,
    explorerUrl: `https://explorer.solana.com/tx/${signature}${explorerSuffix}`
  };
}
