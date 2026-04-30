# VidChain Workflow

This document covers **product flows**, **technical data flow**, **development workflow**, **git workflow**, and the **3-day hackathon plan**.

For setup commands see [README.md](README.md). For testing see [TESTING.md](TESTING.md). For deployment see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Table of Contents

1. [Product Workflow](#product-workflow)
2. [Technical Data Flow](#technical-data-flow)
3. [Development Workflow](#development-workflow)
4. [Git Workflow](#git-workflow)
5. [3-Day Hackathon Plan](#3-day-hackathon-plan)
6. [3-Minute Demo Script](#3-minute-demo-script)
7. [Definition of Done](#definition-of-done)
8. [Pitch Positioning](#pitch-positioning)

---

## Product Workflow

### 1. Register Original Video (Creator)

```text
Creator opens VidChain
  → connects Phantom wallet (Devnet)
  → uploads original video (drag-drop or click)
  → app generates SHA-256 + pHash IN THE BROWSER (no server upload yet)
  → app shows fingerprint preview + duration
  → creator fills title (required) + handle (optional) + license fee (optional)
  → creator clicks "Register"
  → app uploads file to IPFS via NFT.Storage and gets CID
  → app builds register_proof tx and asks wallet to sign
  → tx confirmed on Solana Devnet (~400 ms)
  → backend stores proof metadata indexed by sha256, fingerprintRoot, creatorWallet
  → app displays Certificate URL: /certificate/<proof_id>
```

**Outputs:**

- `proof_id` — server-side ID, also a PDA seed on-chain
- Solana transaction signature + Explorer URL
- Certificate URL (public, shareable)
- Fingerprint summary (sha256 prefix, frameCount, fingerprintRoot)

**Failure modes & UX:**

| Failure | Surface |
|---|---|
| File too large (>200 MB) | Reject before fingerprinting; show size limit |
| Browser missing crypto.subtle / Canvas | Show "browser not supported" with list |
| IPFS upload timeout | Retry once, then show error with manual retry button |
| Wallet rejects signature | Return to "ready_to_sign" state, no error toast |
| RPC timeout after sign | Poll signature status for 30 s, then show "check Explorer" |
| Backend write failure | Show partial-success: "On-chain proof exists, indexing retry in progress" |

### 2. Verify Reposted Video (Anyone)

```text
Verifier opens /verify (no wallet required)
  → uploads suspect video
  → app generates SHA-256 + pHash in the browser
  → POST /api/proofs/verify with hashes only (NOT the video file)
  → backend runs:
       1. exact SHA-256 lookup in DB
       2. if no match → pHash search (Hamming distance ≤ threshold)
       3. if no match → return { matchType: "none" }
  → app shows result + confidence score + certificate link if match
```

**Match outcomes:**

```text
exact      sha256 identical                         confidence = 1.00
visual     pHash distance ≤ 10 across ≥ 60% frames  confidence 0.85–0.99
possible   pHash distance ≤ 18 across ≥ 40% frames  confidence 0.65–0.84
none       no candidate above threshold             confidence < 0.65
```

**Wording rules:**

- Never say "stolen" or "infringed" — say **"Likely Match Found"** or **"Possible Match"**.
- Never say "no theft" — say **"No Registered Origin Found"**.
- Always link to the original certificate when there is a match.

### 3. Public Certificate Page (`/certificate/[id]`)

Must render without a wallet, without JavaScript-only data fetches that block first paint, and must be link-shareable on TikTok, Instagram, X.

Required content:

- Title + creator handle
- Creator wallet (truncated, with copy button + Solana Explorer link)
- Registration timestamp (UTC + relative)
- Solana transaction signature → Explorer link
- Proof ID
- Fingerprint summary (SHA-256 first 16 chars, frame count, pHash version)
- IPFS CID + gateway link
- "Verify another video" CTA → `/verify`
- Open Graph tags (og:title, og:image, og:description) for rich link previews

### 4. License Video (Stretch — Buyer)

```text
Buyer views /certificate/<id>
  → sees license fee (e.g. 0.5 SOL) and license type
  → clicks "License this video"
  → connects wallet, signs purchase_license tx
  → Anchor program atomically:
       1. transfers SOL from buyer → creator (90%)
       2. transfers SOL from buyer → platform wallet (10%)
       3. mints License Token NFT to buyer
  → buyer sees license token in their wallet
  → backend records license event for analytics
```

### 5. File On-Chain Dispute (Stretch — Original Creator)

```text
Creator finds a wallet that registered a copy of their video
  → opens /dispute/new
  → enters their proof_id + accused proof_id
  → signs file_dispute tx
  → on-chain dispute record created with creator as claimant
  → accused has 72h window to respond_to_dispute
  → admin (or future DAO vote) calls resolve_dispute
  → reputation score updated for accused wallet
```

---

## Technical Data Flow

```text
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER (client)                           │
│                                                                     │
│  Upload  →  fingerprinting/  →  { sha256, frameHashes,              │
│             (pure TS, no DOM    fingerprintRoot, duration }         │
│              dependencies)                                          │
│                  │                                                  │
│                  ▼                                                  │
│             frontend/src/lib/api-client.ts                          │
│                  │                                                  │
└──────────────────┼──────────────────────────────────────────────────┘
                   │ HTTP (Zod-validated body)
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  SERVER (Next.js API routes)                        │
│                                                                     │
│  /api/fingerprints     →  optional server-side regen for trust      │
│  /api/proofs (POST)    →  validate → upload metadata to IPFS →     │
│                            store in DB → return Proof               │
│  /api/proofs/:id (GET) →  read DB → return public certificate       │
│  /api/proofs/verify    →  candidate search (sha256 → pHash) →       │
│                            return VerificationResult                │
│                  │                                                  │
└──────────────────┼──────────────────────────────────────────────────┘
                   │
        ┌──────────┼─────────────┐
        ▼          ▼             ▼
   Postgres    IPFS gateway    Solana RPC
   (Supabase)  (NFT.Storage)   (Devnet/Mainnet)
```

**Key invariants:**

- Browser computes the canonical SHA-256 + pHash. Server may **re-compute** for fraud-resistance but never **fabricates** them.
- The video file goes to IPFS, **never** to the backend DB.
- The server's DB is a **search index** — the blockchain is the source of truth. If the DB is wiped, you can rebuild the index by replaying on-chain events.
- All API responses use the envelope `{ success, data, error, requestId }` (see `shared/instruction.md`).

---

## Development Workflow

### Day-zero order

1. **`shared/`** first — define Zod schemas, error codes, types. Everything else imports from here.
2. **`fingerprinting/`** second — pure functions that take a `File` and return a typed `Fingerprint`. No React, no fetch.
3. **Backend API routes** — implement `/api/proofs` (POST/GET) and `/api/proofs/verify` against an in-memory store first.
4. **Frontend** — wire upload → fingerprint → API → certificate flow against the real backend.
5. **Blockchain** — Anchor program with `register_proof`. Replace the mock blockchain adapter.
6. **Persistence** — swap in Supabase + Prisma. Run migrations.
7. **Stretch** — license, dispute, bot, pose fingerprint.

### Local feedback loop

```bash
# Terminal 1 — frontend (Next.js)
pnpm dev

# Terminal 2 — Anchor local validator + program
solana-test-validator
cd blockchain && anchor build && anchor deploy

# Terminal 3 — tests in watch mode
pnpm test --watch

# Terminal 4 — Supabase local (optional)
supabase start
```

### Code style

- TypeScript **strict mode** everywhere (`"strict": true` in every `tsconfig.json`).
- ESLint config extends `next/core-web-vitals` for frontend, `eslint:recommended` + `@typescript-eslint/recommended` for libs.
- Prettier with default config (no need to commit a `.prettierrc` unless overriding).
- Filenames: `kebab-case.ts`. Components: `PascalCase.tsx`. Hooks: `use-camel-case.ts`.
- No `any` without a `// eslint-disable-next-line` and a one-line reason.
- Imports ordered: external → `@/shared` → `@/server`/`@/lib` → `@/components`/`@/features` → relative.

---

## Git Workflow

### Branches

- `main` — protected, always deployable. CI must pass before merge.
- `feat/<topic>` — new features (e.g. `feat/verify-page`).
- `fix/<topic>` — bug fixes (e.g. `fix/phash-frame-count`).
- `chore/<topic>` — tooling, deps, docs (e.g. `chore/playwright-config`).

### Commits — Conventional Commits

```text
<type>(<scope>): <subject>

[optional body]
```

- `type`: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`.
- `scope`: workstream (`frontend`, `backend`, `blockchain`, `bot`, `fingerprinting`, `shared`) or `repo` for cross-cutting.
- `subject`: imperative, lowercase, ≤ 60 chars, no trailing period.

Examples:

```text
feat(frontend): add verify page with confidence meter
fix(blockchain): correct PDA seed for proof account
chore(repo): add pnpm-workspace.yaml
test(fingerprinting): add re-encoded video match spec
```

### Pull request checklist

- [ ] Branch is rebased on latest `main`
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass locally
- [ ] Playwright spec added or updated for any new user-facing flow
- [ ] `.env.example` updated if new env vars introduced
- [ ] Screenshots/GIFs attached for UI changes
- [ ] Linked to a workstream `instruction.md` task if applicable

### Required CI checks (GitHub Actions)

`.github/workflows/ci.yml` runs on every PR:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (Vitest)
- `pnpm test:e2e` (Playwright on Chromium)
- `cd blockchain && anchor build` (cargo cache)

A green PR auto-deploys a Vercel preview; merging to `main` deploys to production.

---

## 3-Day Hackathon Plan

Hour-level granularity is optimistic; treat as a sequencing aid, not a contract.

### Day 1 — Foundations & Happy Path

| Block | Workstream | Output |
|---|---|---|
| Morning | `shared/` | All Zod schemas defined and exported. `pnpm test` covers schema parse. |
| Morning | `fingerprinting/` | `sha256(file)` + `phash(file)` + `match()` working with unit tests. |
| Afternoon | `frontend/` | Home + Register page UI (no real wallet yet). Mock API client wired. |
| Afternoon | `backend/` (API routes) | `POST /api/proofs` + `GET /api/proofs/:id` against in-memory Map. |
| Evening | `blockchain/` | Anchor scaffold (`anchor init vidchain`), `register_proof` instruction stub, deploys to Devnet. |
| End of day | All | One person can register a video locally end-to-end with mocks; certificate page renders. |

### Day 2 — Real Integrations

| Block | Workstream | Output |
|---|---|---|
| Morning | `frontend/` | Solana Wallet Adapter wired. Connect Phantom on Devnet. |
| Morning | `blockchain/` | Real `register_proof` writes a PDA. Anchor TS client generated and committed. |
| Afternoon | `frontend/` ↔ `blockchain/` | Replace mock adapter. Real signed tx visible on Devnet Explorer. |
| Afternoon | `backend/` | Swap in Supabase + Prisma. Migrations committed. `findCandidates` uses pHash bucket index. |
| Evening | `frontend/` | `/verify` page working end-to-end against real backend. Confidence meter polished. |
| End of day | All | Demo dataset (original / re-encoded / unrelated) verifies correctly. |

### Day 3 — Polish, Test, Ship

| Block | Workstream | Output |
|---|---|---|
| Morning | All | Playwright e2e for register → verify → certificate. Fix any flake. |
| Morning | `frontend/` | Empty/loading/error states polished. Open Graph tags on certificate. |
| Afternoon | DevOps | Deploy to Vercel production. Smoke test from a fresh browser. |
| Afternoon | Pitch | Record 3-minute demo. Finalize deck. |
| Evening | All | README/CONTRIBUTING/TESTING/DEPLOYMENT proofread. Tag `v1.0.0-demo`. |

### Stretch (if time remains)

- Royalty smart contract (`purchase_license`) + UI button on `/certificate/[id]`.
- On-chain dispute (`file_dispute`) + reputation badge on certificate.
- Telegram bot — `/start` and video upload handlers.

---

## 3-Minute Demo Script

The demo wins or loses the round. Rehearse it five times.

### Setup (before the room)

- Two laptops on the same Wi-Fi (creator + buyer/verifier).
- Phantom wallet on each, Devnet selected, ≥ 2 SOL airdropped.
- Demo videos pre-staged in `frontend/fixtures/demo/`:
  - `original.mp4` — short (10–20 s) original clip.
  - `original-reencoded.mp4` — same clip recompressed via HandBrake (different SHA-256, same pHash).
  - `unrelated.mp4` — different content.
- Browser tabs pre-opened: Vercel app, Solana Explorer, Phantom wallet.

### Minute 1 — Register & Prove

1. Open VidChain. Click **Connect Wallet**. Phantom modal → approve.
2. Click **Register Video** → drop `original.mp4`.
3. Narrate while UI shows fingerprint progress: *"VidChain is computing two hashes locally — SHA-256 for an exact match, and a perceptual hash that survives re-encoding."*
4. Type title → click **Register** → approve in Phantom.
5. Tx confirms in <1 s. Click the Solana Explorer link. *"Permanent. Public. Indonesian creators have never had this."*

### Minute 2 — Verify & Catch the Repost

1. Open `/verify`.
2. Upload `original-reencoded.mp4`. *"This file has a totally different SHA-256 — TikTok would not catch it."*
3. UI shows: SHA-256 ❌ exact, pHash ✅ visual match, confidence 0.94.
4. Click the certificate link. Same creator wallet. Same timestamp.
5. Upload `unrelated.mp4` → "No Registered Origin Found." *"Honest result, no false positives."*

### Minute 3 — License & Earn (or alt: Dispute)

1. On the buyer laptop, open the same certificate. Show **License: 0.5 SOL**.
2. Click **License this video** → approve in Phantom.
3. Switch to creator laptop — Phantom updates in <1 s. *"No bank, no PayPal, no 30-day wait. The contract is the middleman."*
4. Closing: *"VidChain is the first platform where Indonesian creators can prove ownership, earn from licensing, and hold thieves accountable — all on Solana, all in real time."*

---

## Definition of Done

A feature is **Done** when:

- Code merged to `main` via PR.
- Vitest unit tests cover happy + at least one error path.
- Playwright spec exists if there is a user-facing flow.
- `.env.example` updated if new env vars introduced.
- Manually tested on Vercel preview URL.
- Screenshot/GIF in PR for UI changes.
- No `console.log` left behind. Use `pino` logger or remove.

---

## Pitch Positioning

✅ **Use this:**

> VidChain helps Indonesian creators prove the origin of viral short videos and dances across platforms using video fingerprinting and Solana timestamped proof — and lets them earn from licensing, all on-chain.

❌ **Avoid this:**

> VidChain turns videos into NFTs.

🎯 **Best one-liner for skeptical judges:**

> YouTube and TikTok have platform-specific copyright systems. VidChain is a portable public proof layer that works across TikTok, Instagram, YouTube, WhatsApp, brands, agencies, and game culture — with built-in licensing settlement in 400 milliseconds.
