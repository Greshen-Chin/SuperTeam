# VidChain Backend — Build Plan (AI Agent Instructions)

> **Read this file top-to-bottom before writing any code.** It is the single source of truth for what the backend must do to satisfy `VidChain_Team_Report_v2.docx`. Existing endpoints are listed, gaps are listed, and each gap has a concrete spec the agent can implement directly.

**Stack (already locked):** Fastify 5 · TypeScript (strict) · Postgres (Supabase) via `pg` · Zod · `@fastify/multipart` · `@fastify/rate-limit` · `@fastify/cors`. Backend runs on `http://localhost:4000`. Code lives in `backend/src/`.

**Hard rules** (do not violate — same spirit as `AGENTS.md`):

1. No invented packages. If you need a new one, stop and ask.
2. No `any`, no `as` casts outside Zod-narrowing of `unknown`.
3. No placeholders (`TODO`, `throw new Error("not implemented")`).
4. Every new route validates its body/query/params with Zod and returns the existing `ok()`/`fail()` envelope from `src/response.ts`.
5. Every new DB query goes through a repository in `src/repositories/*` — routes never call `pool.query` directly.
6. Every schema change ships with a SQL migration file in `backend/migrations/NNN_<name>.sql` AND an idempotent `alter table … if not exists` block appended to `backend/schema.sql`.
7. Every new on-chain action (license purchase, dispute file, dispute respond, dispute resolve) MUST verify the Solana signature with `getTransaction(...)` from `src/solana.ts` before persisting — same pattern as `POST /api/proofs`. Mock signatures (`demo_*` / `mock_*`) bypass verification.
8. Rate-limit every state-changing public endpoint (`config: { rateLimit: { max, timeWindow } }`).
9. Strict types come from `src/schemas.ts`. Add types there first, then import — do not duplicate.

---

## 1 · Current state (audit)

### What is already built (✓)

| Endpoint | File | Status |
|---|---|---|
| `GET  /health` | `routes.ts:26` | ✓ |
| `POST /api/proofs` | `routes.ts:32` | ✓ verifies signature on Devnet, persists row |
| `GET  /api/proofs/:id` | `routes.ts:68` | ✓ public certificate read |
| `GET  /api/proofs?creatorWallet=…` | `routes.ts:82` | ✓ paginated cursor |
| `POST /api/proofs/verify` | `routes.ts:102` | ✓ exact SHA-256 + naive frame-overlap matcher |
| `GET  /api/proofs/:id/report` | `routes.ts:145` | ✓ proof + verifications |
| `POST /api/upload` | `routes.ts:165` | ✓ Pinata + NFT.Storage |
| `POST /api/airdrop` | `routes.ts:192` | ✓ devnet only |
| Auth: `/auth/nonce`, `/auth/wallet`, `/auth/me`, `/auth/link-wallet`, `/users` | `routes/auth-routes.ts` | ✓ wallet-based JWT auth |

### What is partially broken / weak (⚠)

| Issue | File | Fix in |
|---|---|---|
| Matcher uses `prefixSimilarity` and `Set` overlap of frame-hash strings — NOT real Hamming distance over 64-bit pHash bits. The report's pHash claim depends on this being correct. | `src/matcher.ts` | Phase A |
| `Proof` type and `mapProof()` ignore `phash`, `mint_address`, `ipfs_video_uri`, `ipfs_thumbnail_uri` columns — schema has them but repository drops them. | `src/repositories/proof-repository.ts:96`, `src/schemas.ts` | Phase A |
| `findCandidates` returns `limit=200` with no bucket pre-filter. Will not scale beyond demo. | `src/repositories/proof-repository.ts:86` | Phase A (add `phash_bucket0` column + index) |
| No `phashBucket0` column anywhere. | `schema.sql` | Phase A |

### What is missing (✗) — required by the report

The report describes three core feature pillars. Only Pillar 1 is partially built:

1. **Pillar 1 — Proof of ownership** (sections 3, 4.1, 4.2, 7) — *partially built; needs real pHash + NFT-mint metadata flow*.
2. **Pillar 2 — Royalty / Licensing smart contract** (section 5) — *NO backend support yet*.
3. **Pillar 3 — On-chain Dispute + Reputation** (section 6) — *NO backend support yet*.

Plus business-model items (section 9):

4. Public Verification API with API-key auth + quota (section 9 → "Verification API").
5. Dispute filing fee (0.01 SOL) — verified on-chain (section 9 → "Dispute resolution fee").
6. NFT certificate metadata generator (section 4.1 step 5 — needs Metaplex-shaped JSON on IPFS).

Phases below cover **all six**.

---

## 2 · Phased build plan

Execute phases in order. Run the **acceptance test** at the end of each phase and confirm it passes before moving on. Commit after each phase with a Conventional Commit message: `feat(backend): <phase title>`.

```
Phase A  Strengthen the proof core           (pHash, schema map, NFT metadata)
Phase B  Licensing endpoints + repository    (Feature 1 — backend half)
Phase C  Dispute endpoints + repository      (Feature 2 — backend half)
Phase D  Reputation read API                 (Feature 2 — public layer)
Phase E  Public Verification API key gate    (Roadmap Phase 4 monetization)
Phase F  Tests + observability hardening     (definition of done)
```

The Anchor program changes that mirror Phases B–D live in `blockchain/` — out of scope for this file. Backend talks to whatever instructions are deployed; verify TX signatures and parse logs only.

---

### Phase A — Strengthen the proof core

**Goal.** Real pHash matching, full Proof shape, NFT metadata generator, candidate-bucket index.

#### A.1 — Add `phash_bucket0` column and pHash columns to `Proof`

Append to `backend/schema.sql` (idempotent block at the bottom):

```sql
alter table proofs add column if not exists phash_bucket0 smallint;
create index if not exists proofs_phash_bucket0_idx on proofs (phash_bucket0);
```

Create `backend/migrations/002_phash_bucket.sql` with the same block. Add the migration to `src/db.ts` `migrate()` runner so `npm run db:migrate` applies it.

#### A.2 — Real Hamming-distance matcher

Rewrite `src/matcher.ts` so it:

- Treats each `frameHashes[i]` as a hex-encoded 64-bit pHash (16 hex chars). Convert to `BigInt` once per frame.
- For each pair (`uploaded[i]`, `candidate[j]`), compute Hamming distance via `popcount(BigInt XOR)`. Use a `popcountBigInt(n: bigint): number` helper (loop bits, no lib).
- For each uploaded frame, find the *minimum* Hamming distance against any candidate frame — this is the per-frame match. Threshold default `MAX_FRAME_HAMMING = 10`.
- Compute `framesMatchedRatio = framesUnderThreshold / uploaded.frameHashes.length`.
- Score → matchType:
  - `score >= 0.6` → `visual`, confidence `0.85 + score * 0.14`
  - `score >= 0.4` → `possible`, confidence `0.65 + score * 0.19`
  - else → `none`, confidence equals score
- Return the best candidate across all proofs (highest score; tie-break by lowest avg Hamming).
- Export `computePhashBuckets(frameHashes: string[]): number[]` — returns the 4-bit prefix of each frame's first hex char as a `Set<number>` flattened to an array. This is what `findCandidatesByBucket` will use.

Add unit tests in `backend/tests/matcher.test.ts` (create `tests/`):

- identical frame-hash arrays → score 1.0, `matchType: "exact"` is NOT what this returns (exact is decided by SHA in route) — assert `visual` with confidence ≥ 0.99
- one bit per frame flipped → still `visual`
- all frames diverge by 30 bits → `none`
- empty `uploaded.frameHashes` → `none` with confidence 0

Run with `npm test --workspace=backend` (add `"test": "vitest run"` and `vitest` dev dep to `backend/package.json` if missing).

#### A.3 — Replace candidate scan with bucket-filtered query

Add to `proof-repository.ts`:

```ts
async findCandidatesByBuckets(buckets: number[], limit = 200): Promise<Proof[]>
```

Query: `select * from proofs where status = 'active' and phash_bucket0 = ANY($1::smallint[]) order by registered_at desc limit $2`.

Update `routes.ts` `/api/proofs/verify` to call `findCandidatesByBuckets(computePhashBuckets(fingerprint.frameHashes))` instead of `findCandidates()`.

When `create()` writes a row, also write `phash_bucket0 = parseInt(frameHashes[0]?.[0] ?? "0", 16)`.

#### A.4 — Map all schema columns into `Proof`

Edit `src/schemas.ts`:

```ts
export type Proof = {
  id: string;
  title: string;
  description?: string;
  creatorWallet: string;
  creatorHandle?: string;
  sha256: string;
  phash?: string;                    // new — concatenated frame hashes or root
  frameHashes: string[];
  fingerprintRoot: string;
  duration: number;
  solanaSignature: string;
  mintAddress?: string;              // new
  metadataUri?: string;
  ipfsVideoUri?: string;             // new
  ipfsThumbnailUri?: string;         // new
  registeredAt: string;
  status: "active" | "pending" | "archived";
};
```

Update `mapProof()` in `proof-repository.ts` to populate the new fields. Update `registerProofSchema` to accept optional `phash`, `mintAddress`, `ipfsVideoUri`, `ipfsThumbnailUri` and persist them in `create()`.

#### A.5 — NFT certificate metadata generator

Create `src/nft-metadata.ts`:

```ts
export type NftMetadataInput = {
  proofId: string;
  title: string;
  description?: string;
  creatorWallet: string;
  sha256: string;
  fingerprintRoot: string;
  ipfsVideoUri?: string;
  ipfsThumbnailUri?: string;
  registeredAt: string;
};

export function buildNftMetadata(input: NftMetadataInput): MetaplexJson { ... }
```

Output shape (Metaplex Token Metadata Standard v1.1):

```json
{
  "name": "VidChain Proof — <title>",
  "symbol": "VIDPROOF",
  "description": "<description or default>",
  "image": "<ipfsThumbnailUri or fallback>",
  "animation_url": "<ipfsVideoUri>",
  "external_url": "https://vidchain.app/certificate/<proofId>",
  "attributes": [
    { "trait_type": "SHA-256",          "value": "<sha256>" },
    { "trait_type": "Fingerprint Root", "value": "<fingerprintRoot>" },
    { "trait_type": "Creator Wallet",   "value": "<creatorWallet>" },
    { "trait_type": "Registered At",    "value": "<registeredAt>" }
  ],
  "properties": {
    "category": "video",
    "files": [
      { "uri": "<ipfsVideoUri>", "type": "video/mp4" }
    ],
    "creators": [{ "address": "<creatorWallet>", "share": 100 }]
  }
}
```

Add route `POST /api/proofs/:id/nft-metadata` (auth not required for now — read-only generator):

1. Load proof from DB. 404 if missing.
2. Build metadata JSON.
3. Upload via `uploadToIpfs(Buffer.from(JSON.stringify(metadata)), "<id>.json", "application/json")`.
4. Update the proof's `metadata_uri` column with the resulting `ipfsUrl`.
5. Return `{ metadataUri, gatewayUrl, metadata }`.

Rate limit: 10/min/IP.

#### Acceptance test for Phase A

- `npm run typecheck` clean.
- `npm test` shows ≥ 4 matcher specs passing.
- `POST /api/proofs/verify` against a row inserted with frameHashes `["ffff…", "ffff…"]` and an uploaded fingerprint with one-bit-flipped frames returns `{ matchType: "visual", confidence >= 0.85 }`.
- New proof rows have `phash_bucket0` populated (`select id, phash_bucket0 from proofs limit 5;`).
- `POST /api/proofs/:id/nft-metadata` returns a `metadataUri` starting with `ipfs://` and the proof row's `metadata_uri` is updated.

---

### Phase B — Licensing endpoints

**Goal.** Mirror the Anchor program's `purchase_license` instruction with a backend record so the frontend can list licenses, show a buyer's library, and surface license terms on a certificate page.

#### B.1 — Schema

Append to `backend/schema.sql` and create `backend/migrations/003_licenses.sql`:

```sql
create table if not exists licenses (
  id text primary key,
  proof_id text not null references proofs(id) on delete cascade,
  buyer_wallet text not null,
  seller_wallet text not null,
  license_model text not null,           -- 'flat' | 'revshare' | 'split'
  fee_lamports bigint not null,
  split_config jsonb,                    -- [{wallet, basisPoints}, ...] for 'split'
  license_token_mint text unique,        -- mint address of the License Token NFT
  solana_signature text not null unique, -- on-chain purchase_license tx
  status text not null default 'active', -- 'active' | 'revoked'
  created_at timestamptz not null default now()
);

create index if not exists licenses_proof_id_idx on licenses (proof_id);
create index if not exists licenses_buyer_wallet_idx on licenses (buyer_wallet);
create index if not exists licenses_seller_wallet_idx on licenses (seller_wallet);

-- License terms live on the proof row itself (set at registration, updatable by creator)
alter table proofs add column if not exists license_fee_lamports bigint default 0;
alter table proofs add column if not exists license_model text default 'flat';
alter table proofs add column if not exists license_split jsonb;
```

#### B.2 — Schemas (in `src/schemas.ts`)

```ts
export const licenseModelSchema = z.enum(["flat", "revshare", "split"]);

export const splitRecipientSchema = z.object({
  wallet: z.string().min(32).max(44),
  basisPoints: z.number().int().min(0).max(10000)
});

export const licenseTermsSchema = z.object({
  licenseModel: licenseModelSchema,
  feeLamports: z.number().int().nonnegative(),
  splitConfig: z.array(splitRecipientSchema).optional()
}).refine(
  (v) => v.licenseModel !== "split" || (v.splitConfig && v.splitConfig.reduce((s, r) => s + r.basisPoints, 0) === 10000),
  { message: "Split basisPoints must sum to 10000 when licenseModel='split'." }
);

export const createLicenseSchema = z.object({
  proofId: z.string().min(1),
  buyerWallet: z.string().min(32).max(44),
  feeLamports: z.number().int().nonnegative(),
  licenseTokenMint: z.string().min(32).max(44).optional(),
  solanaSignature: z.string().min(1)
});

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
```

Update `Proof` type to include:

```ts
licenseFeeLamports: number;
licenseModel: "flat" | "revshare" | "split";
licenseSplit: Array<{ wallet: string; basisPoints: number }> | null;
```

Update `registerProofSchema` and `mapProof()` and `proof-repository.create()` accordingly. Default values: `licenseFeeLamports: 0`, `licenseModel: "flat"`, `licenseSplit: null`.

#### B.3 — Repository

Create `src/repositories/license-repository.ts`:

```ts
export function createLicenseRepository(pool: Pool) {
  return {
    create(input: CreateLicenseInput, sellerWallet: string, terms: LicenseTerms): Promise<License>,
    findById(id: string): Promise<License | null>,
    findByBuyer(wallet: string, opts: PageOpts): Promise<Page<License>>,
    findByProof(proofId: string): Promise<License[]>,
    findBySignature(sig: string): Promise<License | null>
  };
}
```

#### B.4 — Routes (add to `src/routes.ts`)

##### `POST /api/licenses`

Body: `createLicenseSchema`. Rate limit 30/min/IP. Auth NOT required (license is purchased by an arbitrary wallet).

Behavior:

1. Validate body.
2. Reject if `findBySignature(input.solanaSignature)` already exists → `409 LICENSE_DUPLICATE`.
3. Load proof. 404 if missing.
4. Verify signature on-chain (skip for `mock_*`/`demo_*`):
   - `getTransaction(input.solanaSignature)`. Reject `404 TX_NOT_FOUND_ON_CHAIN`, `400 TX_FAILED_ON_CHAIN`.
   - **Verify program-id**: tx must invoke `process.env.VIDCHAIN_PROGRAM_ID`. If env is unset, log a warning and continue (demo mode).
   - **Verify amount**: tx must transfer `input.feeLamports` to `proof.creator_wallet`. Pull `meta.preBalances` / `meta.postBalances` and the account-key index of the seller. Reject `400 TX_AMOUNT_MISMATCH` if delta < `feeLamports - tolerance` (tolerance = 0 for now).
5. Persist license. Map terms from the proof row (`license_model`, `license_split`).
6. Return 201 with `License`.

##### `GET /api/licenses/:id`

Public read-only. Cache: `s-maxage=60, stale-while-revalidate=300`.

##### `GET /api/licenses?buyerWallet=…&cursor=…&limit=…`

Paginated cursor list of a buyer's licenses. Same pagination shape as `/api/proofs`.

##### `GET /api/proofs/:id/licenses`

Public list of licenses sold for a given proof. No auth.

##### `PATCH /api/proofs/:id/license-terms`

Body: `licenseTermsSchema`. **Auth required (Bearer JWT)**. Behavior:

1. Verify JWT → load user.
2. Load proof. 404 if missing.
3. Reject `403 NOT_PROOF_OWNER` if `user.walletAddress !== proof.creatorWallet`.
4. Update `license_fee_lamports`, `license_model`, `license_split` columns.
5. Return updated `Proof`.

> The on-chain `update_license_terms` instruction is the source of truth — backend just mirrors what the user signed. If you have time, accept an optional `solanaSignature` and verify it the same way as `POST /api/licenses`.

#### Acceptance test for Phase B

- `POST /api/licenses` with a `mock_*` signature creates a row.
- `GET /api/licenses/:id` returns it.
- `GET /api/proofs/:id/licenses` lists it.
- `PATCH /api/proofs/:id/license-terms` rejects when the JWT wallet does not match.
- `POST /api/licenses` with a real Devnet signature whose lamports delta is 0 returns `400 TX_AMOUNT_MISMATCH`.

---

### Phase C — Dispute endpoints

**Goal.** Mirror the Anchor program's `file_dispute` / `respond_to_dispute` / `resolve_dispute` instructions. Records become the public dispute history backing reputation scores.

#### C.1 — Schema

Append to `backend/schema.sql` and create `backend/migrations/004_disputes.sql`:

```sql
create table if not exists disputes (
  id text primary key,
  proof_id text not null references proofs(id) on delete cascade,
  claimant_wallet text not null,
  accused_wallet text not null,
  accused_url text,                          -- URL of the offending repost
  reason text not null,
  evidence jsonb,                            -- arbitrary JSON: links, screenshots, IPFS CIDs
  filing_fee_lamports bigint not null default 10000000,  -- 0.01 SOL default
  filing_signature text not null unique,     -- on-chain file_dispute tx
  response_deadline timestamptz not null,    -- now() + 72h
  response_text text,
  response_signature text,
  resolution text,                           -- 'resolved' | 'dismissed' | 'escalated'
  resolution_note text,
  resolution_signature text,
  status text not null default 'open',       -- 'open' | 'responded' | 'resolved' | 'dismissed' | 'escalated' | 'expired'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists disputes_proof_id_idx on disputes (proof_id);
create index if not exists disputes_claimant_idx on disputes (claimant_wallet);
create index if not exists disputes_accused_idx on disputes (accused_wallet);
create index if not exists disputes_status_idx on disputes (status);
```

#### C.2 — Schemas (in `src/schemas.ts`)

```ts
export const disputeStatusSchema = z.enum([
  "open", "responded", "resolved", "dismissed", "escalated", "expired"
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

export type Dispute = z.infer<typeof fileDisputeSchema> & {
  id: string;
  claimantWallet: string;
  filingFeeLamports: number;
  responseDeadline: string;
  responseText: string | null;
  responseSignature: string | null;
  resolution: "resolved" | "dismissed" | "escalated" | null;
  resolutionNote: string | null;
  resolutionSignature: string | null;
  status: z.infer<typeof disputeStatusSchema>;
  createdAt: string;
  updatedAt: string;
};
```

#### C.3 — Repository

Create `src/repositories/dispute-repository.ts` with:

```ts
create(input, claimantWallet)
findById(id)
findByProof(proofId)
findByWallet(wallet, role: "claimant" | "accused" | "any", opts)
recordResponse(id, accusedWallet, payload)
recordResolution(id, payload)
expireOpenDisputes(): number              // run on a timer
findBySignature(signature)
```

#### C.4 — Routes

##### `POST /api/disputes` — File a dispute

**Auth required.** Rate limit 5/min/IP (disputes are heavyweight).

Body: `fileDisputeSchema`.

Behavior:

1. Verify JWT → `claimantWallet = user.walletAddress`.
2. Load proof. 404 if missing.
3. Reject `403 NOT_PROOF_OWNER` if `claimantWallet !== proof.creatorWallet`.
4. Reject `400 SELF_DISPUTE` if `accusedWallet === claimantWallet`.
5. Reject `409 DISPUTE_DUPLICATE` if `findBySignature(input.filingSignature)` already exists.
6. Verify signature on-chain (skip mocks):
   - Fetch tx. Reject 404/400 same as licenses.
   - Verify lamports delta to platform fee wallet equals `0.01 SOL`. Set platform fee wallet via env `VIDCHAIN_PLATFORM_WALLET`. If unset, warn and skip the amount check.
7. Persist with `responseDeadline = now() + 72h`, `status = 'open'`.
8. Return 201 with `Dispute`.

##### `POST /api/disputes/:id/respond` — Accused submits counter-claim

**Auth required.** Rate limit 5/min/IP.

Body: `respondDisputeSchema`.

Behavior:

1. Load dispute. 404 if missing.
2. Reject `403 NOT_ACCUSED` if `user.walletAddress !== dispute.accusedWallet`.
3. Reject `400 DISPUTE_CLOSED` if `dispute.status !== 'open'`.
4. Reject `400 DEADLINE_PASSED` if `now() > dispute.responseDeadline`.
5. Verify signature on-chain (skip mocks).
6. `recordResponse(...)` → set `status = 'responded'`, store text + signature, bump `updated_at`.
7. Return updated `Dispute`.

##### `POST /api/disputes/:id/resolve` — Admin resolution

**Auth required AND admin-only.** Add an `isAdmin(user)` helper that checks against env `VIDCHAIN_ADMIN_WALLETS` (comma-separated base58). Rate limit 10/min/IP.

Body: `resolveDisputeSchema`.

Behavior:

1. Verify caller is admin → else `403 ADMIN_REQUIRED`.
2. Load dispute. 404 if missing. Reject `400 ALREADY_RESOLVED` if `dispute.status` ∈ `{resolved, dismissed, escalated}`.
3. Verify resolutionSignature on-chain (skip mocks).
4. `recordResolution(...)` → set `status = resolution`, store note + signature.
5. Return updated `Dispute`.

##### `GET /api/disputes/:id`

Public read-only. Cache 60/300.

##### `GET /api/disputes?proofId=…&wallet=…&role=claimant|accused|any&cursor=…&limit=…`

Public paginated list. At least one of `proofId` / `wallet` required. Default `role=any`.

#### C.5 — Expiry job

Add `src/scripts/expire-disputes.ts` that calls `disputeRepository.expireOpenDisputes()` (sets `status='expired'` where `status='open' AND responseDeadline < now()`). Wire it as a `setInterval(60_000)` registered once in `server.ts` after `migrate()`.

#### Acceptance test for Phase C

- File a dispute with mock signature → 201.
- Filing twice with the same `filingSignature` → 409.
- Filing on someone else's proof → 403.
- Filing against yourself → 400.
- Respond as the accused → 200, status='responded'.
- Respond as a third party → 403.
- Respond after deadline (manually rewind `response_deadline` in DB) → 400.
- Admin resolve → 200, status='resolved'.
- Non-admin resolve → 403.
- Expiry job marks past-deadline `open` rows as `expired`.

---

### Phase D — Reputation read API

**Goal.** A public, no-auth endpoint that returns a wallet's reputation score and dispute history. Per the report (section 6.3): clean record, 1 unresolved → flagged, 3+ → known infringer.

#### D.1 — Score function

Create `src/reputation.ts`:

```ts
export type ReputationLabel = "verified" | "neutral" | "flagged" | "known_infringer";

export type ReputationScore = {
  wallet: string;
  label: ReputationLabel;
  score: number;             // 0..100, higher = better
  totalDisputesAsAccused: number;
  unresolvedDisputesAsAccused: number;
  resolvedAgainst: number;
  dismissed: number;
  totalDisputesAsClaimant: number;
  registeredProofs: number;
  asOf: string;              // ISO timestamp
};

export function scoreFromCounts(c: Pick<ReputationScore,
  "totalDisputesAsAccused" | "unresolvedDisputesAsAccused" | "resolvedAgainst" | "dismissed" | "registeredProofs"
>): { score: number; label: ReputationLabel };
```

Scoring (deterministic, must be stable for tests):

- Start at 100.
- Subtract `15 * resolvedAgainst`.
- Subtract `5 * unresolvedDisputesAsAccused` (i.e. `open` or `responded`).
- Add `2 * min(registeredProofs, 10)` (caps at +20).
- Clamp 0..100.

Label:

- `resolvedAgainst >= 3` → `known_infringer`
- `unresolvedDisputesAsAccused >= 1` OR `resolvedAgainst >= 1` → `flagged`
- `resolvedAgainst === 0 && registeredProofs >= 1 && score >= 95` → `verified`
- otherwise → `neutral`

#### D.2 — Repository helpers

Add to `dispute-repository.ts`:

```ts
countsForWallet(wallet: string): Promise<{
  totalAsAccused: number;
  unresolvedAsAccused: number;
  resolvedAgainst: number;
  dismissed: number;
  totalAsClaimant: number;
}>
```

Add to `proof-repository.ts`:

```ts
countByCreator(wallet: string): Promise<number>
```

#### D.3 — Routes

##### `GET /api/reputation/:wallet`

Public. Cache `s-maxage=30, stale-while-revalidate=120`. No rate limit (intended for third-party platforms).

Returns `ReputationScore`.

##### `GET /api/reputation/:wallet/history?cursor=…&limit=…`

Public paginated dispute history (claimant + accused) for the wallet. Returns `{ disputes: Dispute[], nextCursor }`.

#### Acceptance test for Phase D

- Wallet with 0 proofs, 0 disputes → `{ score: 100, label: "neutral" }`.
- Wallet with 5 registered proofs, 0 disputes → `{ score: 100, label: "verified" }` (capped + reg bonus).
- Wallet with 1 `open` dispute as accused → `label: "flagged"`.
- Wallet with 3 `resolved` against → `label: "known_infringer"`.
- History endpoint paginates correctly across `claimant` and `accused` rows.

---

### Phase E — Public Verification API key gate

**Goal.** Section 9 of the report: monetize verification API for third parties. Add an opt-in API-key layer that, when present, raises rate limits and tags usage.

#### E.1 — Schema

Append to `schema.sql` and create `migrations/005_api_keys.sql`:

```sql
create table if not exists api_keys (
  id text primary key,
  owner_wallet text not null,
  key_hash text not null unique,        -- sha256 of the raw key
  label text,
  monthly_quota integer not null default 10000,
  status text not null default 'active', -- 'active' | 'revoked'
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists api_usage (
  id bigserial primary key,
  api_key_id text not null references api_keys(id) on delete cascade,
  route text not null,
  status_code integer not null,
  occurred_at timestamptz not null default now()
);

create index if not exists api_usage_key_time_idx on api_usage (api_key_id, occurred_at desc);
```

#### E.2 — Helper

Create `src/api-keys.ts`:

```ts
hashApiKey(raw: string): string                 // sha256 hex
generateApiKey(): { raw: string; hash: string } // raw = "vk_live_<32 hex>"
extractApiKey(req: FastifyRequest): string | null  // header "x-api-key"
verifyApiKey(pool, raw): Promise<ApiKey | null>
recordUsage(pool, keyId, route, status): Promise<void>
checkMonthlyQuota(pool, keyId): Promise<{ used: number; quota: number; ok: boolean }>
```

#### E.3 — Hook into existing routes

In `routes.ts`, before each public-API call:

```ts
const apiKey = await tryAuthenticateApiKey(request);  // null if missing
const limits = apiKey ? { max: 600, timeWindow: "1 minute" } : { max: 30, timeWindow: "1 minute" };
```

Wire `tryAuthenticateApiKey` into `/api/proofs/verify`, `/api/proofs/:id`, `/api/reputation/:wallet`. Record usage in an `onResponse` hook.

#### E.4 — Management routes (auth required)

- `POST /api/api-keys` — create. Body: `{ label?, monthlyQuota? }`. Returns `{ rawKey, ...meta }` ONCE — never again.
- `GET /api/api-keys` — list owner's keys (no `rawKey`).
- `DELETE /api/api-keys/:id` — revoke (status='revoked').
- `GET /api/api-keys/:id/usage?from=&to=` — aggregated counts by day.

All scoped to `user.walletAddress` from JWT.

#### Acceptance test for Phase E

- Create key → returns `vk_live_*` once.
- Listing the same key after creation never includes the raw value.
- Hitting `/api/proofs/verify` with `x-api-key` raises rate cap (verify with 31 calls in a minute — first request without key 429s the 31st, with key it succeeds).
- Revoked key returns 401.
- Quota exceeded returns 429 with code `QUOTA_EXCEEDED`.

---

### Phase F — Tests + observability hardening

**Goal.** Make the whole thing a green-CI codebase before submission.

#### F.1 — Test runner

Add to `backend/package.json`:

```json
"devDependencies": {
  "vitest": "^2.1.0",
  "@vitest/coverage-v8": "^2.1.0",
  "supertest": "^7.0.0",
  "@types/supertest": "^6.0.0"
},
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Create `backend/vitest.config.ts` with `test.environment: 'node'`.

#### F.2 — Required specs

Create `backend/tests/`:

- `matcher.test.ts` — Phase A.
- `nft-metadata.test.ts` — round-trip a sample proof, assert JSON shape.
- `reputation.test.ts` — every label boundary covered.
- `routes.licenses.test.ts` — `supertest` against an in-process Fastify, mocked solana.ts.
- `routes.disputes.test.ts` — same, including expiry path.
- `routes.api-keys.test.ts`.

Mock `src/solana.ts` with `vi.mock("../src/solana.js", ...)` so tests do not need real Devnet.

#### F.3 — Structured request log

Replace `logger: true` in `server.ts` with:

```ts
logger: {
  level: process.env.LOG_LEVEL ?? "info",
  redact: ["req.headers.authorization", "req.headers.x-api-key"],
  serializers: {
    req(r) { return { id: r.id, method: r.method, url: r.url, ip: r.ip }; }
  }
}
```

Add a `onResponse` hook that emits `{ requestId, route, status, durationMs }`.

#### F.4 — Update `.env.example`

Add new keys with empty values:

```
VIDCHAIN_PROGRAM_ID=
VIDCHAIN_PLATFORM_WALLET=
VIDCHAIN_ADMIN_WALLETS=
LOG_LEVEL=info
```

Keep existing `DATABASE_URL`, `SOLANA_RPC_URL`, `PINATA_JWT`, `NFT_STORAGE_API_KEY`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `SKIP_TX_VERIFY`. Mirror these into `src/config.ts`.

#### Acceptance test for Phase F

- `npm test --workspace=backend` → all suites green, coverage ≥ 70% lines.
- `npm run typecheck --workspace=backend` clean.
- Hitting the server prints structured logs (one per request) and never logs `Authorization` or `x-api-key` headers.

---

## 3 · Final endpoint inventory (after all phases)

```
GET    /health
GET    /auth/me
GET    /auth/nonce?address=
POST   /auth/wallet
POST   /auth/link-wallet
GET    /users

POST   /api/proofs                          ← existing, extended in A.4
GET    /api/proofs/:id                      ← existing
GET    /api/proofs?creatorWallet=
POST   /api/proofs/verify                   ← existing, real pHash in A.2
GET    /api/proofs/:id/report
POST   /api/proofs/:id/nft-metadata         ← new (A.5)
PATCH  /api/proofs/:id/license-terms        ← new (B)

POST   /api/upload
POST   /api/airdrop

POST   /api/licenses                        ← new (B)
GET    /api/licenses/:id                    ← new (B)
GET    /api/licenses?buyerWallet=
GET    /api/proofs/:id/licenses             ← new (B)

POST   /api/disputes                        ← new (C)
POST   /api/disputes/:id/respond            ← new (C)
POST   /api/disputes/:id/resolve            ← new (C)
GET    /api/disputes/:id                    ← new (C)
GET    /api/disputes?proofId=&wallet=&role=

GET    /api/reputation/:wallet              ← new (D)
GET    /api/reputation/:wallet/history      ← new (D)

POST   /api/api-keys                        ← new (E)
GET    /api/api-keys
DELETE /api/api-keys/:id
GET    /api/api-keys/:id/usage
```

## 4 · Submission checklist (definition of done)

- [ ] Phase A acceptance tests pass.
- [ ] Phase B acceptance tests pass.
- [ ] Phase C acceptance tests pass.
- [ ] Phase D acceptance tests pass.
- [ ] Phase E acceptance tests pass (skip if time-boxed; document in PR).
- [ ] Phase F: `npm test` and `npm run typecheck` clean from `backend/`.
- [ ] All new endpoints documented in this file's "Final endpoint inventory" remain accurate.
- [ ] All new env vars listed in `backend/.env.example`.
- [ ] `backend/migrations/` contains 002, 003, 004, 005 in order; `npm run db:migrate` from a fresh DB applies all of them cleanly.
- [ ] Demo flow works end-to-end: register → mint metadata → verify → license purchase → file dispute → resolve dispute → reputation reflects it.
