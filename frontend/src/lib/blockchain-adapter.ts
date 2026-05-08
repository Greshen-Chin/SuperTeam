import { env } from "@/lib/env";

export type RegisterProofOnChainInput = {
  proofId: string;
  creatorWallet: string;
  sha256: string;
  fingerprintRoot: string;
  metadataUri?: string;
};

export type RegisterProofOnChainResult = {
  signature: string;
  explorerUrl: string;
};

function explorerUrl(signature: string): string {
  const cluster = env.NEXT_PUBLIC_SOLANA_CLUSTER;
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}

function getApiBaseUrl(): string {
  const configured = env.NEXT_PUBLIC_API_BASE_URL;
  if (
    typeof window !== "undefined" &&
    /^(http:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(configured) &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname)
  ) {
    return window.location.origin;
  }

  return configured;
}

export type PayForLicenseInput = {
  proofId: string;
  buyerWallet: string;
  sellerWallet: string;
  feeLamports: number;
};

export type PayForLicenseResult = {
  signature: string;
  explorerUrl: string;
};

export async function payForLicense(
  input: PayForLicenseInput
): Promise<PayForLicenseResult> {
  if (env.NEXT_PUBLIC_USE_MOCK_CHAIN) {
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const signature = `mock_lic_${input.proofId}_${Date.now()}`;
    return { signature, explorerUrl: explorerUrl(signature) };
  }

  // Real path: use Solana web3.js to send SOL from buyer to seller
  // The backend verifies the on-chain TX in POST /api/licenses
  throw new Error("Real Solana payment not yet implemented. Set NEXT_PUBLIC_USE_MOCK_CHAIN=true for demo.");
}

export async function registerProofOnChain(
  input: RegisterProofOnChainInput
): Promise<RegisterProofOnChainResult> {
  if (env.NEXT_PUBLIC_USE_MOCK_CHAIN) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const signature = `demo_${input.proofId}_${Date.now()}`;
    return { signature, explorerUrl: explorerUrl(signature) };
  }

  const response = await fetch(`${getApiBaseUrl()}/api/anchor-proof`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  const text = await response.text();
  let payload: {
    success: boolean;
    data: RegisterProofOnChainResult | null;
    error: { code: string; message: string } | null;
  };

  try {
    payload = JSON.parse(text) as typeof payload;
  } catch {
    throw new Error(text || `Failed to anchor proof on Solana (${response.status}).`);
  }

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? "Failed to anchor proof on Solana.");
  }

  return payload.data;
}
