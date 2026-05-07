import { demoProof, demoVerificationMatch } from "@/lib/demo-data";
import { createLocalFingerprint } from "@/lib/fingerprint-client";
import { routes } from "@/lib/routes";
import type { Fingerprint, License, Proof, VerificationResult } from "@/shared/schemas";

export type RegisterProofInput = {
  title: string;
  creatorHandle?: string;
  creatorWallet: string;
  fingerprint: Fingerprint;
  solanaSignature: string;
  ipfsVideoUri?: string;
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

  async uploadFile(file: File): Promise<{ ipfsUrl: string; gatewayUrl: string }> {
    if (apiBaseUrl) {
      const form = new FormData();
      form.append("file", file, file.name);
      const response = await fetch(`${apiBaseUrl}/api/upload`, {
        method: "POST",
        headers: authHeaders(),
        body: form
      });
      return readApiResponse<{ ipfsUrl: string; gatewayUrl: string }>(response);
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
    const cid = `bafybei${Date.now().toString(36)}`;
    return { ipfsUrl: `ipfs://${cid}`, gatewayUrl: `https://ipfs.io/ipfs/${cid}` };
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

  async listProofs(
    creatorWallet: string,
    opts?: { cursor?: string; limit?: number }
  ): Promise<{ proofs: Proof[]; nextCursor: string | null }> {
    if (apiBaseUrl) {
      const params = new URLSearchParams({ creatorWallet });
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.limit) params.set("limit", String(opts.limit));
      const response = await fetch(`${apiBaseUrl}/api/proofs?${params.toString()}`, {
        cache: "no-store",
        headers: authHeaders()
      });
      return readApiResponse<{ proofs: Proof[]; nextCursor: string | null }>(response);
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
    return { proofs: [], nextCursor: null };
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

  async setLicenseTerms(
    proofId: string,
    terms: { feeLamports: number; licenseModel: "flat" | "revshare" | "split"; walletAddress?: string | null }
  ): Promise<Proof> {
    if (apiBaseUrl) {
      const body: Record<string, unknown> = { licenseModel: terms.licenseModel, feeLamports: terms.feeLamports };
      if (terms.walletAddress) body.walletAddress = terms.walletAddress;
      const response = await fetch(`${apiBaseUrl}/api/proofs/${proofId}/license-terms`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body)
      });
      return readApiResponse<Proof>(response);
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { ...demoProof, id: proofId, licenseFeeLamports: terms.feeLamports, licenseModel: terms.licenseModel };
  },

  async getLicensesByBuyer(buyerWallet: string): Promise<License[]> {
    if (apiBaseUrl) {
      const params = new URLSearchParams({ buyerWallet });
      const response = await fetch(`${apiBaseUrl}/api/licenses?${params.toString()}`, { cache: "no-store" });
      const data = await readApiResponse<{ items: License[]; nextCursor: string | null }>(response);
      return data.items;
    }
    return [];
  },

  async getLicensesByProof(proofId: string): Promise<License[]> {
    if (apiBaseUrl) {
      const response = await fetch(`${apiBaseUrl}/api/proofs/${proofId}/licenses`);
      const data = await readApiResponse<{ licenses: License[] }>(response);
      return data.licenses;
    }
    return [];
  },

  async getLicense(id: string): Promise<License> {
    if (apiBaseUrl) {
      const response = await fetch(`${apiBaseUrl}/api/licenses/${id}`, { cache: "no-store" });
      return readApiResponse<License>(response);
    }
    return {
      id,
      proofId: demoProof.id,
      buyerWallet: "Demo1111111111111111111111111111111111111111",
      sellerWallet: demoProof.creatorWallet,
      licenseModel: "flat",
      feeLamports: 200_000_000,
      splitConfig: null,
      licenseTokenMint: null,
      solanaSignature: `mock_lic_${id}`,
      status: "active",
      createdAt: new Date().toISOString()
    };
  },

  async createLicense(input: {
    proofId: string;
    buyerWallet: string;
    feeLamports: number;
    solanaSignature: string;
  }): Promise<License> {
    if (apiBaseUrl) {
      const response = await fetch(`${apiBaseUrl}/api/licenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(input)
      });
      return readApiResponse<License>(response);
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      id: `lic_demo_${Date.now()}`,
      proofId: input.proofId,
      buyerWallet: input.buyerWallet,
      sellerWallet: demoProof.creatorWallet,
      licenseModel: "flat",
      feeLamports: input.feeLamports,
      splitConfig: null,
      licenseTokenMint: null,
      solanaSignature: input.solanaSignature,
      status: "active",
      createdAt: new Date().toISOString()
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

