import { demoProof, demoVerificationMatch } from "@/lib/demo-data";
import { createLocalFingerprint } from "@/lib/fingerprint-client";
import { routes } from "@/lib/routes";
import type { Fingerprint, Proof, VerificationResult } from "@/shared/schemas";

export type RegisterProofInput = {
  title: string;
  creatorHandle?: string;
  creatorWallet: string;
  fingerprint: Fingerprint;
  solanaSignature: string;
};

export const apiClient = {
  createFingerprint(file: File) {
    return createLocalFingerprint(file);
  },

  async registerProof(input: RegisterProofInput): Promise<Proof> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      ...demoProof,
      id: `proof_${Date.now()}`,
      title: input.title,
      creatorHandle: input.creatorHandle || demoProof.creatorHandle,
      creatorWallet: input.creatorWallet,
      sha256: input.fingerprint.sha256,
      fingerprintRoot: input.fingerprint.fingerprintRoot,
      solanaSignature: input.solanaSignature,
      registeredAt: new Date().toISOString()
    };
  },

  async getProof(id: string): Promise<Proof> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      ...demoProof,
      id
    };
  },

  async verifyVideo(file: File): Promise<VerificationResult> {
    const fingerprint = await createLocalFingerprint(file);
    await new Promise((resolve) => setTimeout(resolve, 700));

    if (file.name.toLowerCase().includes("different") || file.size < 10_000) {
      return {
        matchType: "none",
        confidence: 0.12,
        matchedProofId: null,
        certificateUrl: null
      };
    }

    return {
      ...demoVerificationMatch,
      certificateUrl: routes.certificate(demoVerificationMatch.matchedProofId ?? demoProof.id),
      confidence: fingerprint.sha256.startsWith("0") ? 0.78 : demoVerificationMatch.confidence
    };
  }
};

