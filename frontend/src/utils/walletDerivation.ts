import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

export async function deriveSolanaKeypairFromGoogleSub(sub: string, salt: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(`${sub}:${salt}`);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const seed = new Uint8Array(digest).slice(0, 32);
  return Keypair.fromSeed(seed);
}

export function exportPublicWallet(keypair: Keypair) {
  return keypair.publicKey.toBase58();
}

export function exportPrivateKeyForDebugOnly(keypair: Keypair) {
  return bs58.encode(keypair.secretKey);
}
