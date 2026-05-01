# Backend Instructions

The backend goal: **be the authoritative search index for VidChain proofs** — accept fingerprints, store metadata indexed by SHA-256 + pHash, return verification candidates fast, and serve public certificate data.

> **Default location:** Next.js API Routes inside `frontend/src/app/api/*` and `frontend/src/server/*`. Single Vercel deploy, single env file, single CI pipeline.
>
> This `backend/` folder is **kept as a design reference** for a future standalone Fastify service. Do not ship a separate backend at hackathon time — it doubles deploy + auth complexity for no UX gain.

> Stack reference: Next.js 15 API Routes (Node runtime) · TypeScript (strict) · Prisma 5 · PostgreSQL via Supabase · Zod · `pino` for logging.

---

## Table of Contents

1. [Responsibilities](#responsibilities)
2. [Why Next.js API Routes](#why-nextjs-api-routes)
3. [Setup](#setup)
4. [Database Schema](#database-schema)
5. [API Contract](#api-contract)
6. [Response Envelope](#response-envelope)
7. [Repositories](#repositories)
8. [Verification Pipeline](#verification-pipeline)
9. [Error Handling](#error-handling)
10. [Logging & Observability](#logging--observability)
11. [Security](#security)
12. [Testing](#testing)
13. [Success Criteria](#success-criteria)

---

## Responsibilities

- Validate every request body with Zod.
- Persist proof metadata indexed for fast SHA-256 + pHash lookup.
- Compare an uploaded fingerprint against the registered set and return a `VerificationResult`.
- Read public certificate data with no auth.
- Forward IPFS uploads server-side when the browser cannot (large files, regions blocking NFT.Storage).
- Submit on-chain transactions when the user has not connected a wallet (server-paid demo path).
- Emit structured logs with `requestId` for every request.

The backend does **not**:

- Re-implement fingerprinting — it imports `fingerprinting/`.
- Hold user wallet private keys.
- Talk to the frontend except through `/api/*`.

---

## Why Next.js API Routes

For the hackathon, API Routes win on every axis:

| Concern | Next.js API Routes | Standalone Fastify |
|---|---|---|
| Deploy | One Vercel project | Two: web + API host |
| Env vars | One file | Duplicated, must stay in sync |
| Auth between web ↔ API | Same origin, no CORS | CORS + token plumbing |
| TS types | Shared via imports | Shared via published package |
| CI | One pipeline | Two pipelines |
| Cold start | Vercel edge/serverless | Render/Fly cold start |

Switch to Fastify post-hackathon if any of these become true: cold-start RPS > 200, you need WebSockets, you need long-running jobs > 60 s, you need a background worker pool.

---

## Setup

```bash
cd frontend
pnpm install
cp .env.example .env.local
# fill: DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NFT_STORAGE_API_KEY

# Add backend deps
pnpm add prisma @prisma/client pino pino-pretty
pnpm add -D vitest @vitest/coverage-v8 supertest msw

# Initialize Prisma
pnpm exec prisma init
# edit prisma/schema.prisma (see below) then:
pnpm exec prisma migrate dev --name init
pnpm exec prisma generate
```

### Local PostgreSQL options

- **Supabase local** (recommended): `supabase start` → URL printed in console.
- **Docker**: `docker run --name vidchain-pg -e POSTGRES_PASSWORD=postgres -p 54322:5432 -d postgres:16`.
- **Hosted Supabase free tier**: create project at https://supabase.com and use connection string.

---

## Database Schema

`frontend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Proof {
  id                 String   @id @default(cuid())
  title              String
  description        String?
  creatorWallet      String
  creatorHandle      String?
  sha256             String   @unique
  fingerprintRoot    String
  fingerprintVersion String   @default("v1")
  frameHashes        String[] // 64-bit pHash hex strings, one per sampled frame
  metadataUri        String?  // ipfs://Qm...
  solanaSignature    String   @unique
  solanaProgramId    String
  pdaAddress         String?
  status             ProofStatus @default(active)
  registeredAt       DateTime
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  verifications      Verification[]

  @@index([creatorWallet])
  @@index([fingerprintRoot])
}

model Verification {
  id                       String     @id @default(cuid())
  uploadedSha256           String
  uploadedFingerprintRoot  String
  uploadedFrameHashes      String[]
  matchedProofId           String?
  matchedProof             Proof?     @relation(fields: [matchedProofId], references: [id])
  matchType                MatchType
  confidence               Float
  hammingDistance          Int?
  requestId                String
  createdAt                DateTime   @default(now())

  @@index([uploadedSha256])
  @@index([uploadedFingerprintRoot])
}

enum ProofStatus {
  active
  pending
  archived
}

enum MatchType {
  exact
  visual
  possible
  none
}
```

Apply migrations:

```bash
pnpm exec prisma migrate dev --name init       # local
pnpm exec prisma migrate deploy                 # CI/prod
```

### Indexing strategy for pHash search

PostgreSQL alone is slow for Hamming distance over millions of rows. For MVP scale (< 100 k proofs), naive scan is fine. Add `pg_trgm` or a dedicated bucket column for production:

```sql
-- Add a 4-bit bucket of the first frame hash for coarse filtering
ALTER TABLE "Proof" ADD COLUMN "phashBucket0" SMALLINT;
CREATE INDEX "Proof_phashBucket0_idx" ON "Proof" ("phashBucket0");
```

Verification then narrows candidates by `phashBucket0 IN (computed buckets)` before computing exact Hamming distance in app code.

---

## API Contract

All endpoints return the [Response Envelope](#response-envelope).

### `POST /api/fingerprints`

**Use case:** server-side recompute (optional fraud check). The client already computed the canonical fingerprint.

**Request:** `multipart/form-data` with `file` field (≤ 50 MB).

**Response data:**

```ts
{ sha256: string; frameHashes: string[]; fingerprintRoot: string; duration: number }
```

### `POST /api/proofs`

**Use case:** create a proof record after the on-chain transaction confirmed.

**Request body:**

```ts
{
  title: string;
  description?: string;
  creatorHandle?: string;
  creatorWallet: string;          // base58
  fingerprint: Fingerprint;
  metadataUri?: string;           // ipfs://...
  solanaSignature: string;        // base58 tx sig — server verifies on Devnet RPC
  pdaAddress?: string;
}
```

**Server behavior:**

1. Validate body with `proofSchema.omit({ id, registeredAt, status })`.
2. Verify `solanaSignature` exists on the configured RPC (devnet/mainnet) — reject if not found.
3. Verify the tx invoked the VidChain program ID.
4. Persist via `proofRepository.create()`.
5. Return the created `Proof`.

**Response data:** `Proof` (full).

### `GET /api/proofs/:id`

**Use case:** public certificate page.

**Response data:** `Proof` minus internal fields. Cache: `s-maxage=60, stale-while-revalidate=300`.

### `GET /api/proofs?creatorWallet=...`

**Use case:** dashboard listing.

**Response data:** `Proof[]`, paginated `?cursor=...&limit=20`.

### `POST /api/proofs/verify`

**Use case:** check whether an uploaded fingerprint matches anything registered.

**Request body:**

```ts
{ fingerprint: Fingerprint }    // sent by client; do not require file upload
```

**Server behavior:**

1. Try exact `sha256` lookup → if hit, `matchType: "exact"`, confidence 1.00.
2. Else fetch candidates by `phashBucket` index, compute Hamming distance per frame.
3. Compute aggregate score (% of frames within distance threshold).
4. Map score → `matchType` and `confidence` per [Verification Pipeline](#verification-pipeline).
5. Persist a `Verification` row for audit/analytics.
6. Return `VerificationResult`.

**Response data:**

```ts
{
  matchType: "exact" | "visual" | "possible" | "none";
  confidence: number;            // 0..1
  matchedProofId: string | null;
  certificateUrl: string | null; // /certificate/<id>
  hammingDistance?: number;
}
```

### `GET /api/proofs/:id/report` (optional)

**Use case:** "Download proof report" PDF link from certificate page. Returns a JSON or PDF artifact (use `@react-pdf/renderer` for PDF).

---

## Response Envelope

Every API response uses the same shape so the frontend can branch once.

```ts
// Success
{
  success: true,
  data: T,
  error: null,
  requestId: string
}

// Failure
{
  success: false,
  data: null,
  error: { code: string; message: string; details?: unknown },
  requestId: string
}
```

Implement once in `src/server/api-helpers.ts`:

```ts
export function ok<T>(data: T, requestId: string) {
  return Response.json({ success: true, data, error: null, requestId });
}
export function fail(code: string, message: string, status = 400, requestId = "") {
  return Response.json(
    { success: false, data: null, error: { code, message }, requestId },
    { status }
  );
}
```

---

## Repositories

All DB access goes through `src/server/repositories/*`. Routes never touch Prisma directly.

```ts
// src/server/repositories/proof-repository.ts
export const proofRepository = {
  create(input: CreateProofInput): Promise<Proof> { /* prisma.proof.create */ },
  findById(id: string): Promise<Proof | null> { /* */ },
  findBySha256(sha256: string): Promise<Proof | null> { /* */ },
  findCandidatesByBucket(buckets: number[]): Promise<Proof[]> { /* */ },
  listByCreator(wallet: string, opts: PageOpts): Promise<Page<Proof>> { /* */ }
};
```

Reasons:

- Tests mock the repo, not Prisma.
- Swap PostgreSQL → another store later without touching routes.
- One place to add caching.

---

## Verification Pipeline

```ts
// src/server/matching.ts (imports algorithms from fingerprinting/)
import { hammingDistance } from "@vidchain/fingerprinting";

export async function verifyFingerprint(input: Fingerprint): Promise<VerificationResult> {
  // 1. exact
  const exact = await proofRepository.findBySha256(input.sha256);
  if (exact) return { matchType: "exact", confidence: 1, matchedProofId: exact.id, ... };

  // 2. coarse filter
  const buckets = computePhashBuckets(input.frameHashes);
  const candidates = await proofRepository.findCandidatesByBucket(buckets);

  // 3. fine compare
  let best = { proofId: null, score: 0, hamming: Infinity };
  for (const c of candidates) {
    const score = framesMatchedRatio(input.frameHashes, c.frameHashes, /*maxDist=*/10);
    if (score > best.score) best = { proofId: c.id, score, hamming: avgHamming(...) };
  }

  // 4. score → matchType
  if (best.score >= 0.6) return { matchType: "visual",   confidence: 0.85 + best.score * 0.14, ... };
  if (best.score >= 0.4) return { matchType: "possible", confidence: 0.65 + best.score * 0.19, ... };
  return { matchType: "none", confidence: best.score, matchedProofId: null, certificateUrl: null };
}
```

Thresholds are tunable knobs. Calibrate on the demo dataset before submission.

---

## Error Handling

Use a fixed set of error codes (define in `shared/src/errors.ts`):

```ts
export const ErrorCode = {
  VALIDATION_FAILED:       "VALIDATION_FAILED",
  FINGERPRINT_FAILED:      "FINGERPRINT_FAILED",
  TX_NOT_FOUND_ON_CHAIN:   "TX_NOT_FOUND_ON_CHAIN",
  TX_PROGRAM_MISMATCH:     "TX_PROGRAM_MISMATCH",
  PROOF_NOT_FOUND:         "PROOF_NOT_FOUND",
  IPFS_UPLOAD_FAILED:      "IPFS_UPLOAD_FAILED",
  RATE_LIMITED:            "RATE_LIMITED",
  INTERNAL:                "INTERNAL",
} as const;
```

Routes wrap handlers in `try/catch`:

```ts
export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const body = createProofRequestSchema.parse(await req.json());
    const proof = await createProof(body);
    return ok(proof, requestId);
  } catch (err) {
    if (err instanceof ZodError) return fail("VALIDATION_FAILED", err.message, 400, requestId);
    if (err instanceof KnownError) return fail(err.code, err.message, err.status, requestId);
    log.error({ err, requestId }, "internal error");
    return fail("INTERNAL", "Unexpected error", 500, requestId);
  }
}
```

---

## Logging & Observability

```ts
// src/server/log.ts
import pino from "pino";
export const log = pino({ level: process.env.LOG_LEVEL ?? "info" });
```

Log on every request: `{ requestId, route, status, durationMs, walletShort }`. Strip PII (full wallet OK, frame hashes OK, raw video bytes never).

Optional: `@sentry/nextjs` for error tracking, `@vercel/analytics` for traffic.

---

## Security

- **Never** trust `creatorWallet` from the body for ownership decisions — verify it matches the signer of `solanaSignature` by reading the on-chain tx.
- **Rate limit** `/api/proofs/verify` and `/api/proofs` (POST). Use `@upstash/ratelimit` (free tier) or a simple Redis counter — 30/min per IP.
- **Body size limits**: configure `export const config = { api: { bodyParser: { sizeLimit: '5mb' } } }` per route. Files go to IPFS, not your server.
- **CORS**: same-origin by default — no need to enable. If a separate domain is added, allowlist explicitly.
- **Service role key** (Supabase) lives only in server env. Browser uses the anon key.
- **No SQL string interpolation.** Always Prisma params.
- **Input validation:** Zod on the boundary, types inside.
- **Secrets:** never log them, never commit them, rotate the Supabase service role key after the hackathon if shared.

---

## Testing

See **[TESTING.md](../TESTING.md)** for the full guide. Backend specifics:

- **Unit (Vitest):** repositories with mocked Prisma client, matching with synthetic fingerprints.
- **Integration:** spin up Next route handlers via `node:test` or `supertest`, hit a Postgres test DB (created by Prisma migrate against a `vidchain_test` schema).
- **Contract:** import the Zod schemas in tests to make sure responses parse — catches drift between docs and code.

```bash
# Run only backend tests
pnpm test src/server
```

---

## Success Criteria

- [ ] Frontend has a stable, Zod-typed API.
- [ ] Certificate can be loaded by ID with no auth.
- [ ] Verification result is deterministic for the demo dataset.
- [ ] Re-encoded video → `visual` match with confidence ≥ 0.85 in < 1 s server time.
- [ ] All routes log a `requestId` that the frontend echoes in the UI footer of error states.
- [ ] DB migrations run cleanly on a fresh Supabase project.
- [ ] Server-side tx verification rejects forged `solanaSignature` values.
- [ ] External services (IPFS, RPC) failures degrade gracefully with retry + clear error code.
