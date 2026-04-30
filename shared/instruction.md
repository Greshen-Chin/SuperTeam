# Shared Contracts & Patterns

The shared goal: **one source of truth for types, schemas, error codes, and architectural patterns** so frontend, backend, fingerprinting, blockchain, and bot stay aligned. Drift between layers is the #1 source of bugs in a multi-package project — this folder eliminates it.

> Stack reference: TypeScript (strict) · Zod 3 · published as `@vidchain/shared` workspace package.

---

## Table of Contents

1. [Responsibilities](#responsibilities)
2. [Setup](#setup)
3. [Folder Structure](#folder-structure)
4. [Schemas (Zod)](#schemas-zod)
5. [Error Codes](#error-codes)
6. [Response Envelope](#response-envelope)
7. [Architecture Patterns](#architecture-patterns)
8. [Code Quality Rules](#code-quality-rules)
9. [Versioning](#versioning)
10. [Success Criteria](#success-criteria)

---

## Responsibilities

- Export Zod schemas for every cross-layer object (`Proof`, `Fingerprint`, `VerificationResult`, `Certificate`, `LicensePurchase`, `Dispute`).
- Export error code constants and human-readable messages.
- Export the API response envelope helpers (`ok()`, `fail()`, `ApiError`).
- Document layered architecture and design patterns used throughout the project.

`shared/` does **not** contain runtime React, Next, Solana, or DB code — it must compile in a plain Node + browser environment.

---

## Setup

```bash
cd shared
pnpm init -y
pnpm add zod
pnpm add -D typescript vitest
```

`shared/package.json`:

```json
{
  "name": "@vidchain/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".":         "./src/index.ts",
    "./errors":  "./src/errors.ts",
    "./schemas": "./src/schemas.ts"
  },
  "scripts": {
    "test":      "vitest run",
    "lint":      "eslint src",
    "typecheck": "tsc --noEmit"
  }
}
```

Consumers:

```ts
import { proofSchema, type Proof, type Fingerprint } from "@vidchain/shared";
import { ErrorCode } from "@vidchain/shared/errors";
```

> Today the frontend has a copy at `frontend/src/shared/schemas.ts`. Once `pnpm-workspace.yaml` is added, replace that file with `export * from "@vidchain/shared"` and delete the duplicate.

---

## Folder Structure

```text
shared/
├── instruction.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # re-exports everything
│   ├── schemas.ts            # Zod schemas + inferred types
│   ├── errors.ts             # ErrorCode enum + messages + ApiError class
│   ├── envelope.ts           # ok(), fail(), ApiResponse type
│   └── constants.ts          # match thresholds, limits, fingerprint version
└── tests/
    └── schemas.test.ts       # round-trip parse tests
```

---

## Schemas (Zod)

```ts
// src/schemas.ts
import { z } from "zod";

export const matchTypeSchema = z.enum(["exact", "visual", "possible", "none"]);

export const fingerprintSchema = z.object({
  sha256:          z.string().regex(/^[a-f0-9]{64}$/),
  frameHashes:     z.array(z.string().regex(/^[a-f0-9]{16}$/)).min(1).max(120),
  fingerprintRoot: z.string().regex(/^[a-f0-9]{64}$/),
  duration:        z.number().nonnegative(),
  version:         z.literal("v1"),
});

export const proofSchema = z.object({
  id:                 z.string(),
  title:              z.string().min(1).max(120),
  description:        z.string().max(2_000).optional(),
  creatorWallet:      z.string().min(32).max(44),     // base58 length range
  creatorHandle:      z.string().max(64).optional(),
  sha256:             fingerprintSchema.shape.sha256,
  fingerprintRoot:    fingerprintSchema.shape.fingerprintRoot,
  fingerprintVersion: z.literal("v1"),
  frameHashes:        fingerprintSchema.shape.frameHashes,
  metadataUri:        z.string().url().optional(),    // ipfs:// or https://
  solanaSignature:    z.string().min(64),
  solanaProgramId:    z.string().min(32).max(44),
  pdaAddress:         z.string().min(32).max(44).optional(),
  registeredAt:       z.string().datetime(),
  status:             z.enum(["active", "pending", "archived"]),
});

export const verificationResultSchema = z.object({
  matchType:        matchTypeSchema,
  confidence:       z.number().min(0).max(1),
  matchedProofId:   z.string().nullable(),
  certificateUrl:   z.string().nullable(),
  hammingDistance:  z.number().int().min(0).optional(),
  framesMatched:   z.number().int().min(0).optional(),
  framesTotal:     z.number().int().min(0).optional(),
});

export const certificateSchema = proofSchema.pick({
  id: true, title: true, description: true,
  creatorWallet: true, creatorHandle: true,
  registeredAt: true, solanaSignature: true,
  metadataUri: true, sha256: true, fingerprintRoot: true,
});

export type MatchType          = z.infer<typeof matchTypeSchema>;
export type Fingerprint        = z.infer<typeof fingerprintSchema>;
export type Proof              = z.infer<typeof proofSchema>;
export type VerificationResult = z.infer<typeof verificationResultSchema>;
export type Certificate        = z.infer<typeof certificateSchema>;
```

Rule: **never declare a TypeScript interface that is also a Zod schema.** Always `z.infer<>` so the runtime parse and the type cannot drift.

---

## Error Codes

```ts
// src/errors.ts
export const ErrorCode = {
  VALIDATION_FAILED:     "VALIDATION_FAILED",
  FINGERPRINT_FAILED:    "FINGERPRINT_FAILED",
  TX_NOT_FOUND_ON_CHAIN: "TX_NOT_FOUND_ON_CHAIN",
  TX_PROGRAM_MISMATCH:   "TX_PROGRAM_MISMATCH",
  PROOF_NOT_FOUND:       "PROOF_NOT_FOUND",
  PROOF_DUPLICATE:       "PROOF_DUPLICATE",
  IPFS_UPLOAD_FAILED:    "IPFS_UPLOAD_FAILED",
  RATE_LIMITED:          "RATE_LIMITED",
  WALLET_REJECTED:       "WALLET_REJECTED",
  INTERNAL:              "INTERNAL",
} as const;
export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

export const ErrorMessage: Record<ErrorCode, string> = {
  VALIDATION_FAILED:     "Request shape is invalid.",
  FINGERPRINT_FAILED:    "Could not generate video fingerprint.",
  TX_NOT_FOUND_ON_CHAIN: "Solana transaction was not found on the configured cluster.",
  TX_PROGRAM_MISMATCH:   "Transaction did not invoke the VidChain program.",
  PROOF_NOT_FOUND:       "No proof exists with that ID.",
  PROOF_DUPLICATE:       "This SHA-256 has already been registered by this creator.",
  IPFS_UPLOAD_FAILED:    "Could not upload video to IPFS. Please retry.",
  RATE_LIMITED:          "Too many requests. Please slow down.",
  WALLET_REJECTED:       "Wallet rejected the signature request.",
  INTERNAL:              "Unexpected error. Please retry.",
};

export class ApiError extends Error {
  constructor(public code: ErrorCode, message?: string, public status = 400) {
    super(message ?? ErrorMessage[code]);
  }
}
```

---

## Response Envelope

```ts
// src/envelope.ts
import type { ErrorCode } from "./errors";

export type ApiResponse<T> =
  | { success: true;  data: T;     error: null;                                       requestId: string }
  | { success: false; data: null;  error: { code: ErrorCode; message: string };       requestId: string };

export function ok<T>(data: T, requestId: string): ApiResponse<T> {
  return { success: true, data, error: null, requestId };
}

export function fail(code: ErrorCode, message: string, requestId: string): ApiResponse<never> {
  return { success: false, data: null, error: { code, message }, requestId };
}
```

---

## Architecture Patterns

### Layered architecture

```text
UI layer              React components & pages           (frontend/src/app, /features, /components)
Application layer     Use cases / hooks                  (frontend/src/features/*/use-*-flow.ts)
Domain layer          Pure logic                         (fingerprinting/, shared/)
Infrastructure layer  Solana, DB, IPFS, Telegram         (frontend/src/server, blockchain/clients)
```

Imports flow **downward only**: UI → application → domain → infrastructure (via interfaces in app layer). Lower layers never import upper layers.

### Use case pattern

Every user intent has one named function:

```text
registerVideoProof(input)        — orchestrates fingerprint → IPFS → tx → DB write
verifyVideoOrigin(fingerprint)   — orchestrates exact lookup → pHash search → score
generateVideoFingerprint(file)   — pure
compareFingerprints(a, b)        — pure
purchaseLicense(proofId, buyer)  — stretch
fileDispute(claim, accused)      — stretch
```

### Repository pattern

Every persistence target has a typed repository:

```text
proofRepository.create()
proofRepository.findById()
proofRepository.findBySha256()
proofRepository.findCandidatesByBucket()
verificationRepository.create()
licenseRepository.create()       // stretch
disputeRepository.create()       // stretch
```

### Adapter pattern

External services hide behind an adapter interface so they can be mocked or swapped:

```text
solanaProofAdapter      — wraps anchor program calls
storageAdapter          — wraps NFT.Storage / Pinata
fingerprintAdapter      — browser vs server frame extraction
telegramBotAdapter      — wraps grammY context
```

### Strategy pattern

Matching tries strategies in order, short-circuits on the first strong hit:

```text
exactHashMatchStrategy
frameHashMatchStrategy
sequenceMatchStrategy
poseMatchStrategy        // stretch
```

---

## Code Quality Rules

- **TypeScript strict** in every package. No implicit `any`.
- **No `any` without comment.** `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason: ...`
- **No `as` casts** unless narrowing a `unknown` from a parsed Zod or DOM API.
- **Functions named by product intent.** `registerVideoProof()` > `handleSubmit()`.
- **Imports sorted:** external → `@vidchain/*` → `@/server`/`@/lib` → `@/components`/`@/features` → relative.
- **No barrel files inside `src/server/`** — they break Vercel tree-shaking and accidentally bundle server code into client.
- **One env loader** per package. Use `zod` to parse `process.env` once, export typed `env` object.
- **Never commit secrets.** `.env.example` is the source of truth for what env keys exist; values stay in `.env.local` (gitignored).
- **Never commit private keys, wallet seeds, deploy keypairs, or service-role tokens.** Add to `.gitignore` and verify with `git ls-files | grep -E "(\.env\.local|deployer\.json|service-role)"` before push.
- **Demo-safe fallbacks.** Every external call (RPC, IPFS, Telegram) must have a graceful failure path.
- **At least smoke tests** for fingerprint matching and proof registration before any push to `main`.

---

## Versioning

`shared` is bumped together with breaking schema changes. Communicate via PR title:

- `feat(shared)!: rename frameHashes → frameFingerprints` — breaking, all consumers updated in same PR.
- `feat(shared): add licensePurchaseSchema` — additive, no consumer change required.
- `chore(shared): expand description max length to 2000` — non-breaking widening.

The `version` field in fingerprint payloads (`"v1"`) lets the backend route old payloads to a v1 matcher post-launch.

---

## Success Criteria

- [ ] All five other packages import types from `@vidchain/shared` — no duplicated types anywhere.
- [ ] `proofSchema.parse(JSON.parse(JSON.stringify(proof)))` round-trips for every fixture.
- [ ] `ErrorCode` is the only string set used in API errors and frontend toast switches.
- [ ] `pnpm typecheck` and `pnpm test` green in `shared/`.
- [ ] No external runtime dependencies beyond `zod`.
