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
  registeredAt: z.string(),
  status: z.enum(["active", "pending", "archived"])
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
export type Fingerprint = z.infer<typeof fingerprintSchema>;
export type VerificationResult = z.infer<typeof verificationResultSchema>;

