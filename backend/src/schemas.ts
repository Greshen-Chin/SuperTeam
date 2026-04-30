import { z } from "zod";

export const fingerprintSchema = z.object({
  sha256: z.string().min(16),
  frameHashes: z.array(z.string()).default([]),
  fingerprintRoot: z.string().min(16),
  duration: z.number().nonnegative().default(0)
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
  status: z.enum(["active", "pending", "archived"]).default("active")
});

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
  frameHashes: string[];
  fingerprintRoot: string;
  duration: number;
  solanaSignature: string;
  metadataUri?: string;
  registeredAt: string;
  status: "active" | "pending" | "archived";
};

export type VerificationResult = {
  matchType: MatchType;
  confidence: number;
  matchedProofId: string | null;
  certificateUrl: string | null;
};
