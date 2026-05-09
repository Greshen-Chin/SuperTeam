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
  ipfsThumbnailUri?: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
  requestId: string;
};

export type ProofRegistryCheck = {
  exists: boolean;
  count: number;
  latestProof: Proof | null;
  proofs: Proof[];
};

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

function getApiBaseUrl(): string | undefined {
  if (
    typeof window !== "undefined" &&
    configuredApiBaseUrl &&
    /^(http:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(configuredApiBaseUrl) &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname)
  ) {
    return window.location.origin;
  }

  return configuredApiBaseUrl;
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let payload: ApiResponse<T>;

  try {
    payload = JSON.parse(text) as ApiResponse<T>;
  } catch {
    throw new Error(text || `VidChain API request failed with status ${response.status}.`);
  }

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
    const apiBaseUrl = getApiBaseUrl();
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
    const apiBaseUrl = getApiBaseUrl();
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
    opts?: { cursor?: string; limit?: number; signal?: AbortSignal }
  ): Promise<{ proofs: Proof[]; nextCursor: string | null }> {
    const apiBaseUrl = getApiBaseUrl();
    if (apiBaseUrl) {
      const params = new URLSearchParams({ creatorWallet });
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.limit) params.set("limit", String(opts.limit));
      const response = await fetch(`${apiBaseUrl}/api/proofs?${params.toString()}`, {
        cache: "no-store",
        headers: authHeaders(),
        signal: opts?.signal
      });
      return readApiResponse<{ proofs: Proof[]; nextCursor: string | null }>(response);
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
    return { proofs: [], nextCursor: null };
  },

  async listAllProofs(
    creatorWallet: string,
    opts?: { limit?: number; signal?: AbortSignal }
  ): Promise<Proof[]> {
    const proofs: Proof[] = [];
    let cursor: string | undefined;
    const pageLimit = opts?.limit ?? 50;

    do {
      const page = await this.listProofs(creatorWallet, {
        cursor,
        limit: pageLimit,
        signal: opts?.signal
      });
      proofs.push(...page.proofs);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    return proofs;
  },

  async listForSaleProofs(opts?: { excludeWallet?: string; cursor?: string; limit?: number; signal?: AbortSignal }): Promise<{ proofs: Proof[]; nextCursor: string | null }> {
    const apiBaseUrl = getApiBaseUrl();
    if (apiBaseUrl) {
      const params = new URLSearchParams({ forSale: "true" });
      if (opts?.excludeWallet) params.set("excludeWallet", opts.excludeWallet);
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.limit) params.set("limit", String(opts.limit));
      const response = await fetch(`${apiBaseUrl}/api/proofs?${params.toString()}`, { cache: "no-store", signal: opts?.signal });
      return readApiResponse<{ proofs: Proof[]; nextCursor: string | null }>(response);
    }
    return { proofs: [], nextCursor: null };
  },

  async listAllForSaleProofs(opts?: { excludeWallet?: string; limit?: number; signal?: AbortSignal }): Promise<Proof[]> {
    const proofs: Proof[] = [];
    let cursor: string | undefined;
    const pageLimit = opts?.limit ?? 50;

    do {
      const page = await this.listForSaleProofs({
        excludeWallet: opts?.excludeWallet,
        cursor,
        limit: pageLimit,
        signal: opts?.signal
      });
      proofs.push(...page.proofs);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    return proofs;
  },

  async checkFingerprint(fingerprint: Fingerprint, opts?: { limit?: number; signal?: AbortSignal }): Promise<ProofRegistryCheck> {
    const apiBaseUrl = getApiBaseUrl();
    if (apiBaseUrl) {
      const params = new URLSearchParams({ sha256: fingerprint.sha256 });
      if (opts?.limit) params.set("limit", String(opts.limit));
      const response = await fetch(`${apiBaseUrl}/api/proofs/check?${params.toString()}`, {
        cache: "no-store",
        headers: authHeaders(),
        signal: opts?.signal
      });
      return readApiResponse<ProofRegistryCheck>(response);
    }
    return { exists: false, count: 0, latestProof: null, proofs: [] };
  },

  async checkFileRegistration(file: File, opts?: { signal?: AbortSignal }): Promise<ProofRegistryCheck> {
    const fingerprint = await createLocalFingerprint(file);
    return this.checkFingerprint(fingerprint, { signal: opts?.signal });
  },

  async deleteProof(id: string): Promise<{ deleted: true; proof: Proof }> {
    const apiBaseUrl = getApiBaseUrl();
    if (apiBaseUrl) {
      const response = await fetch(`${apiBaseUrl}/api/proofs/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      return readApiResponse<{ deleted: true; proof: Proof }>(response);
    }
    return { deleted: true, proof: { ...demoProof, id } };
  },

  async getProof(id: string, opts?: { signal?: AbortSignal }): Promise<Proof> {
    const apiBaseUrl = getApiBaseUrl();
    if (apiBaseUrl) {
      const response = await fetch(`${apiBaseUrl}/api/proofs/${id}`, {
        cache: "no-store",
        signal: opts?.signal
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
    const apiBaseUrl = getApiBaseUrl();
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

  async getLicensesByBuyer(buyerWallet: string, opts?: { signal?: AbortSignal }): Promise<License[]> {
    const apiBaseUrl = getApiBaseUrl();
    if (apiBaseUrl) {
      const params = new URLSearchParams({ buyerWallet });
      const response = await fetch(`${apiBaseUrl}/api/licenses?${params.toString()}`, { cache: "no-store", signal: opts?.signal });
      const data = await readApiResponse<{ items: License[]; nextCursor: string | null }>(response);
      return data.items;
    }
    return [];
  },

  async getLicensesByProof(proofId: string): Promise<License[]> {
    const apiBaseUrl = getApiBaseUrl();
    if (apiBaseUrl) {
      const response = await fetch(`${apiBaseUrl}/api/proofs/${proofId}/licenses`);
      const data = await readApiResponse<{ licenses: License[] }>(response);
      return data.licenses;
    }
    return [];
  },

  async getLicense(id: string): Promise<License> {
    const apiBaseUrl = getApiBaseUrl();
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
    const apiBaseUrl = getApiBaseUrl();
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
    const apiBaseUrl = getApiBaseUrl();
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

