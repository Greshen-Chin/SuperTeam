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

export async function registerProofOnChain(
  input: RegisterProofOnChainInput
): Promise<RegisterProofOnChainResult> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  const signature = `demo_${input.proofId}_${Date.now()}`;

  return {
    signature,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
  };
}

