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

type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
  requestId: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? "VidChain API request failed.");
  }

  return payload.data;
}

export const apiClient = {
  async createFingerprint(file: File): Promise<Fingerprint> {
    return createLocalFingerprint(file);
  },

  async registerProof(input: RegisterProofInput): Promise<Proof> {
    if (apiBaseUrl) {
      const response = await fetch(`${apiBaseUrl}/api/proofs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders()
        },
        body: JSON.stringify(input)
      });

      return readApiResponse<Proof>(response);
    }

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
    if (apiBaseUrl) {
      const response = await fetch(`${apiBaseUrl}/api/proofs/${id}`, {
        cache: "no-store"
      });

      return readApiResponse<Proof>(response);
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      ...demoProof,
      id
    };
  },

  async verifyVideo(file: File): Promise<VerificationResult> {
    if (apiBaseUrl) {
      const fingerprint = await createLocalFingerprint(file);

      const response = await fetch(`${apiBaseUrl}/api/proofs/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ fingerprint })
      });

      const result = await readApiResponse<VerificationResult>(response);
      return {
        ...result,
        certificateUrl: result.matchedProofId ? routes.certificate(result.matchedProofId) : null
      };
    }

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

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};

  const token = window.localStorage.getItem("vidchain_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

