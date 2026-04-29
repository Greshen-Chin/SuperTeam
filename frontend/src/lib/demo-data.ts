import type { Proof, VerificationResult } from "@/shared/schemas";

export const demoProof: Proof = {
  id: "proof_original_dance_demo",
  title: "Original Dance Trend Demo",
  description: "A demo proof showing how VidChain anchors creator origin for short-form video.",
  creatorWallet: "VcHn9E2NmF3uP8KoLq21xProofCreatorWalletSolana",
  creatorHandle: "@vidchain.creator",
  sha256: "7b8f-demo-original-sha256",
  fingerprintRoot: "fp_root_original_dance_demo",
  solanaSignature: "5xDemoSolanaSignatureForProofExplorerPlaceholder111111111",
  metadataUri: "ipfs://demo-proof-metadata",
  registeredAt: new Date().toISOString(),
  status: "active"
};

export const demoVerificationMatch: VerificationResult = {
  matchType: "visual",
  confidence: 0.91,
  matchedProofId: demoProof.id,
  certificateUrl: `/certificate/${demoProof.id}`
};

