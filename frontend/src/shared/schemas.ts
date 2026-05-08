import { z } from "zod";

export const matchTypeSchema = z.enum(["exact", "visual", "sequence", "possible", "none"]);

export const proofSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  creatorWallet: z.string(),
  creatorHandle: z.string().optional(),
  sha256: z.string(),
  fingerprintRoot: z.string(),
  solanaSignature: z.string(),
  metadataUri: z.string().optional(),
  ipfsVideoUri: z.string().optional().nullable(),
  ipfsThumbnailUri: z.string().optional().nullable(),
  registeredAt: z.string(),
  status: z.enum(["active", "pending", "archived"]),
  licenseFeeLamports: z.number().default(0),
  licenseModel: z.enum(["flat", "revshare", "split"]).default("flat"),
  licenseSplit: z.array(z.object({ wallet: z.string(), basisPoints: z.number() })).nullable().default(null)
});

export const licenseSchema = z.object({
  id: z.string(),
  proofId: z.string(),
  buyerWallet: z.string(),
  sellerWallet: z.string(),
  licenseModel: z.enum(["flat", "revshare", "split"]),
  feeLamports: z.number(),
  splitConfig: z.array(z.object({ wallet: z.string(), basisPoints: z.number() })).nullable(),
  licenseTokenMint: z.string().nullable(),
  solanaSignature: z.string(),
  status: z.enum(["active", "revoked"]),
  createdAt: z.string()
});

export const fingerprintSchema = z.object({
  sha256: z.string(),
  frameHashes: z.array(z.string()),
  fingerprintRoot: z.string(),
  duration: z.number()
});

export const verificationResultSchema = z.object({
  matchType: matchTypeSchema,
  confidence: z.number().min(0).max(1),
  matchedProofId: z.string().nullable(),
  certificateUrl: z.string().nullable()
});

export type MatchType = z.infer<typeof matchTypeSchema>;
export type Proof = z.infer<typeof proofSchema>;
export type License = z.infer<typeof licenseSchema>;
export type Fingerprint = z.infer<typeof fingerprintSchema>;
export type VerificationResult = z.infer<typeof verificationResultSchema>;

