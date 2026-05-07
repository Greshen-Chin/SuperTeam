import { z } from "zod";

export const fingerprintSchema = z.object({
  sha256: z.string().min(16),
  frameHashes: z.array(z.string()).default([]),
  fingerprintRoot: z.string().min(16),
  duration: z.number().nonnegative().default(0),
  phash: z.string().optional()
});

export const registerProofSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  creatorHandle: z.string().optional(),
  creatorWallet: z.string().min(1),
  fingerprint: fingerprintSchema,
  solanaSignature: z.string().min(1),
  metadataUri: z.string().optional(),
  ipfsVideoUri: z.string().optional(),
  ipfsThumbnailUri: z.string().optional(),
  status: z.enum(["active", "pending", "archived"]).default("active"),
  licenseFeeLamports: z.number().int().nonnegative().default(0),
  licenseModel: z.enum(["flat", "revshare", "split"]).default("flat"),
  licenseSplit: z.array(z.object({ wallet: z.string(), basisPoints: z.number().int() })).optional()
});

// ── License ───────────────────────────────────────────────────────────────────

export const licenseModelSchema = z.enum(["flat", "revshare", "split"]);

export const splitRecipientSchema = z.object({
  wallet: z.string().min(32).max(44),
  basisPoints: z.number().int().min(0).max(10000)
});

export const licenseTermsSchema = z
  .object({
    licenseModel: licenseModelSchema,
    feeLamports: z.number().int().nonnegative(),
    splitConfig: z.array(splitRecipientSchema).optional(),
    walletAddress: z.string().optional()
  })
  .refine(
    (v) =>
      v.licenseModel !== "split" ||
      (v.splitConfig != null && v.splitConfig.reduce((s, r) => s + r.basisPoints, 0) === 10000),
    { message: "Split basisPoints must sum to 10000 when licenseModel='split'." }
  );

export const createLicenseSchema = z.object({
  proofId: z.string().min(1),
  buyerWallet: z.string().min(32).max(44),
  feeLamports: z.number().int().nonnegative(),
  licenseTokenMint: z.string().min(32).max(44).optional(),
  solanaSignature: z.string().min(1)
});

// ── Dispute ───────────────────────────────────────────────────────────────────

export const disputeStatusSchema = z.enum([
  "open",
  "responded",
  "resolved",
  "dismissed",
  "escalated",
  "expired"
]);

export const disputeResolutionSchema = z.enum(["resolved", "dismissed", "escalated"]);

export const fileDisputeSchema = z.object({
  proofId: z.string().min(1),
  accusedWallet: z.string().min(32).max(44),
  accusedUrl: z.string().url().optional(),
  reason: z.string().min(20).max(2000),
  evidence: z.unknown().optional(),
  filingSignature: z.string().min(1)
});

export const respondDisputeSchema = z.object({
  responseText: z.string().min(20).max(2000),
  responseSignature: z.string().min(1)
});

export const resolveDisputeSchema = z.object({
  resolution: disputeResolutionSchema,
  note: z.string().min(1).max(2000),
  resolutionSignature: z.string().min(1)
});

// ── Shared ────────────────────────────────────────────────────────────────────

export const matchTypeSchema = z.enum(["exact", "visual", "sequence", "possible", "none"]);

export type Fingerprint = z.infer<typeof fingerprintSchema>;
export type RegisterProofInput = z.infer<typeof registerProofSchema>;
export type MatchType = z.infer<typeof matchTypeSchema>;

export type Proof = {
  id: string;
  title: string;
  description?: string;
  creatorWallet: string;
  creatorHandle?: string;
  sha256: string;
  phash?: string;
  frameHashes: string[];
  fingerprintRoot: string;
  duration: number;
  solanaSignature: string;
  mintAddress?: string;
  metadataUri?: string;
  ipfsVideoUri?: string;
  ipfsThumbnailUri?: string;
  licenseFeeLamports: number;
  licenseModel: "flat" | "revshare" | "split";
  licenseSplit: Array<{ wallet: string; basisPoints: number }> | null;
  registeredAt: string;
  status: "active" | "pending" | "archived";
};

export type License = {
  id: string;
  proofId: string;
  buyerWallet: string;
  sellerWallet: string;
  licenseModel: "flat" | "revshare" | "split";
  feeLamports: number;
  splitConfig: Array<{ wallet: string; basisPoints: number }> | null;
  licenseTokenMint: string | null;
  solanaSignature: string;
  status: "active" | "revoked";
  createdAt: string;
};

export type Dispute = {
  id: string;
  proofId: string;
  claimantWallet: string;
  accusedWallet: string;
  accusedUrl?: string;
  reason: string;
  evidence: unknown;
  filingSignature: string;
  filingFeeLamports: number;
  responseDeadline: string;
  responseText: string | null;
  responseSignature: string | null;
  resolution: "resolved" | "dismissed" | "escalated" | null;
  resolutionNote: string | null;
  resolutionSignature: string | null;
  status: "open" | "responded" | "resolved" | "dismissed" | "escalated" | "expired";
  createdAt: string;
  updatedAt: string;
};

export type VerificationResult = {
  matchType: MatchType;
  confidence: number;
  matchedProofId: string | null;
  certificateUrl: string | null;
};
