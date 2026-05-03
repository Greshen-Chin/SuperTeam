import { config } from "./config.js";

type RpcResponse<T> = { result: T; error?: { message: string } };

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(config.solanaRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    throw new Error(`Solana RPC HTTP error: ${response.status}`);
  }

  const json = (await response.json()) as RpcResponse<T>;
  if (json.error) throw new Error(`Solana RPC error: ${json.error.message}`);
  return json.result;
}

export async function getBalanceLamports(address: string): Promise<number> {
  const result = await rpc<{ value: number }>("getBalance", [address, { commitment: "confirmed" }]);
  return result.value;
}

export async function requestDevnetAirdrop(address: string, lamports = 100_000_000): Promise<string> {
  if (config.solanaCluster !== "devnet") {
    throw new Error("Airdrop is only available on devnet.");
  }
  const signature = await rpc<string>("requestAirdrop", [address, lamports]);
  return signature;
}

export type TransactionResult = {
  slot: number;
  transaction: { message: { accountKeys: string[] } };
  meta: {
    err: unknown;
    preBalances: number[];
    postBalances: number[];
    logMessages?: string[];
  } | null;
} | null;

export async function getTransaction(signature: string): Promise<TransactionResult> {
  return rpc<TransactionResult>("getTransaction", [
    signature,
    { encoding: "json", commitment: "confirmed", maxSupportedTransactionVersion: 0 }
  ]);
}

export function isMockSignature(signature: string): boolean {
  return signature.startsWith("demo_") || signature.startsWith("mock_");
}

export function getReceivedLamports(
  tx: NonNullable<TransactionResult>,
  recipientAddress: string
): number {
  const keys = tx.transaction.message.accountKeys;
  const idx = keys.indexOf(recipientAddress);
  if (idx === -1) return 0;
  const pre = tx.meta?.preBalances[idx] ?? 0;
  const post = tx.meta?.postBalances[idx] ?? 0;
  return post - pre;
}
