# VidChain

**Decentralized video ownership & creator economy on Solana.**

VidChain gives Indonesian short-form video creators a permanent, tamper-proof, publicly verifiable record of who created what — and when. Upload an original video, mint an on-chain proof, share a public certificate, and verify reposts (even after re-encoding) using dual SHA-256 + perceptual fingerprinting.

> **Track:** Consumer Apps · **Event:** Solana National Blockchain Competition 2025 · **Region:** Indonesia

---

## 🤖 Building this with an AI agent?

**Read [`AGENTS.md`](AGENTS.md) first.** It is the deterministic 8-phase build playbook (foundation → fingerprinting → frontend → blockchain → backend → Web3Auth → tests → deploy) with exact files, commands, acceptance tests, and hard "DO NOT" rules. Every other doc in this repo is referenced from there in the right order.

A human reading top-to-bottom is fine too — the rest of this README is for you.

---

## Table of Contents

1. [Problem & Solution](#problem--solution)
2. [Core User Flows](#core-user-flows)
3. [Architecture Overview](#architecture-overview)
4. [Repository Layout](#repository-layout)
5. [Tech Stack](#tech-stack)
6. [Quick Start](#quick-start)
7. [Environment Variables](#environment-variables)
8. [Development Workflow](#development-workflow)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [MVP Scope](#mvp-scope)
12. [Workstream Documentation](#workstream-documentation)
13. [Success Criteria](#success-criteria)

---

## Problem & Solution

Indonesian creators lose attribution every day — viral TikTok dances, YouTube Shorts, Reels and Bigo highlights get downloaded, re-encoded, and re-uploaded by other accounts who then monetize them. Centralized platforms control the only ownership record, and small creators have no legal recourse.

**VidChain solution:**

- Onboard creators with **one-tap social login** (Google, email, Apple, Discord) via Web3Auth — a real Solana wallet is created behind the scenes; the user never sees a seed phrase. Power users can still **Connect Phantom** instead.
- Generate a **dual fingerprint** of the video locally in the browser:
  - SHA-256 (exact file match — instant)
  - pHash perceptual hash (survives re-encoding, compression, resolution change)
- Store the file on **IPFS** (off-chain, decentralized).
- Mint an **NFT proof on Solana** containing both hashes, IPFS CID, creator wallet, timestamp, and license terms.
- Issue a public, shareable **certificate URL** anyone can verify without a wallet.
- Allow buyers to **license** the video on-chain with a 10% protocol fee, atomically routed to the creator.
- Record disputes and resolutions on-chain to build a public **reputation layer** for known infringers.

---

## Core User Flows

```text
Onboard      "Continue with Google" (Web3Auth → embedded Solana wallet)  OR  "Connect Phantom"
Creator      Upload → Hash (SHA-256 + pHash) → IPFS upload → Sign tx → Mint NFT → Certificate URL
Verifier     Upload → Hash (SHA-256 + pHash) → SHA-256 check → pHash search → Result + certificate
Buyer        View certificate → Click "License" → Sign tx → SOL routed atomically → License Token in wallet
Disputant    File on-chain dispute → Accused responds → Resolution + reputation update
```

Read [WORKFLOW.md](WORKFLOW.md) for the detailed product, technical, and team workflow.

---

## Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                          Browser (creator/verifier/buyer)                │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  frontend/  (Next.js 15 App Router · React 19 · Tailwind)        │    │
│  │  - Wallet Adapter (Phantom, Backpack, Solflare)                  │    │
│  │  - Web Crypto API (SHA-256)                                      │    │
│  │  - HTML5 Video + Canvas + blockhash-js (pHash)                   │    │
│  └────────┬───────────────────────────────────────────────┬─────────┘    │
└───────────┼───────────────────────────────────────────────┼──────────────┘
            │ HTTPS                                         │ JSON-RPC
            ▼                                               ▼
┌──────────────────────────────┐         ┌────────────────────────────────┐
│  Backend (Next.js API routes │         │     Solana Devnet / Mainnet    │
│  or sibling Fastify service) │         │  ┌──────────────────────────┐  │
│  - /api/proofs (CRUD)        │         │  │  Anchor program          │  │
│  - /api/proofs/verify        │         │  │  - register_proof        │  │
│  - /api/fingerprints         │         │  │  - purchase_license      │  │
│  - Zod-validated I/O         │         │  │  - file_dispute          │  │
│  - Repository pattern        │         │  │  - query_reputation      │  │
└─────┬────────────────────┬───┘         │  └──────────────────────────┘  │
      │                    │             └────────────────────────────────┘
      ▼                    ▼                            ▲
┌──────────────┐   ┌────────────────┐                   │
│  PostgreSQL  │   │  IPFS / NFT.   │ ◀─────────────────┘
│  (Supabase)  │   │  Storage       │     metadata_uri (ipfs://...)
└──────────────┘   └────────────────┘
```

- **Frontend** never talks to the database directly.
- **Backend** is the only writer to PostgreSQL and the source of truth for verification candidate search.
- **Blockchain** is the source of truth for ownership + licensing + disputes.
- **IPFS** holds the actual video file; only its CID lives on-chain.
- **Bot** (Telegram) shares the same backend API as the web app.

---

## Repository Layout

```text
SuperTeam/
├── README.md                  # ← you are here
├── WORKFLOW.md                # product / dev / git workflow
├── TESTING.md                 # unit + e2e (Playwright) testing guide
├── DEPLOYMENT.md              # Vercel + Anchor devnet deploy
├── CONTRIBUTING.md            # branch naming, commits, PR template
├── .gitignore
├── .env.example               # template — copy to .env.local at root
│
├── frontend/                  # Next.js 15 app (App Router)
│   ├── instruction.md         # detailed frontend build guide
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── playwright.config.ts   # e2e config
│   ├── vitest.config.ts       # unit config
│   ├── .env.example
│   ├── public/
│   ├── src/
│   │   ├── app/               # routes: /, /register, /verify, /certificate/[id], /dashboard, /api/*
│   │   ├── features/          # feature-scoped React components + hooks
│   │   ├── components/        # reusable UI + layout primitives
│   │   ├── lib/               # framework-agnostic helpers (api-client, fingerprint, blockchain adapter)
│   │   ├── server/            # API route handlers, repositories, Solana server-side helpers
│   │   └── shared/            # Zod schemas + shared TS types (single source of truth)
│   ├── tests/
│   │   ├── unit/              # Vitest specs colocated or here
│   │   └── e2e/               # Playwright specs
│   └── fixtures/              # demo videos used by e2e + manual demo
│
├── backend/                   # OPTIONAL standalone API (use only if Next.js routes outgrow)
│   └── instruction.md         # Fastify + Prisma layout, kept as design reference
│
├── blockchain/                # Anchor workspace
│   ├── instruction.md         # Anchor program build/test/deploy guide
│   ├── Anchor.toml
│   ├── Cargo.toml
│   ├── programs/
│   │   └── vidchain/          # Rust program crate
│   ├── tests/                 # Anchor mocha/ts tests against local validator
│   ├── migrations/            # Anchor deploy script
│   └── target/                # build artifacts (gitignored)
│
├── fingerprinting/            # Pure TypeScript package — no React, no DOM in core
│   ├── instruction.md
│   ├── package.json
│   ├── src/
│   │   ├── sha256.ts
│   │   ├── phash.ts
│   │   ├── frame-extractor.ts
│   │   ├── matcher.ts
│   │   └── index.ts
│   └── tests/                 # Vitest
│
├── bot/                       # Telegram bot (stretch)
│   ├── instruction.md
│   ├── package.json
│   └── src/
│
└── shared/                    # Cross-package types/Zod schemas/error codes
    ├── instruction.md
    ├── package.json
    └── src/
        ├── schemas.ts
        ├── errors.ts
        └── index.ts
```

> The repo is structured to be **monorepo-ready** with `pnpm` workspaces. See [Monorepo Setup](#monorepo-setup) below. For hackathon speed you may keep `frontend/` self-contained and skip workspaces — the per-folder `instruction.md` files are valid either way.

### Monorepo Setup (recommended)

Add a root `package.json`:

```json
{
  "name": "vidchain",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "workspaces": ["frontend", "backend", "fingerprinting", "bot", "shared"],
  "scripts": {
    "dev":        "pnpm --filter frontend dev",
    "build":      "pnpm -r build",
    "lint":       "pnpm -r lint",
    "typecheck":  "pnpm -r typecheck",
    "test":       "pnpm -r test",
    "test:e2e":   "pnpm --filter frontend test:e2e",
    "anchor:build": "cd blockchain && anchor build",
    "anchor:test":  "cd blockchain && anchor test",
    "anchor:deploy":"cd blockchain && anchor deploy --provider.cluster devnet"
  }
}
```

Add `pnpm-workspace.yaml`:

```yaml
packages:
  - "frontend"
  - "backend"
  - "fingerprinting"
  - "bot"
  - "shared"
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend framework | Next.js 15 (App Router) | SSR, file-based routing, edge-friendly, easy Vercel deploy |
| UI lib | React 19 + TypeScript | Standard component model, strict typing |
| Styling | Tailwind CSS 3 | Speed of iteration, consistent design tokens |
| Wallet (power user) | `@solana/wallet-adapter-react` + Phantom | Largest Solana wallet, supports Devnet |
| Social login → wallet | **Web3Auth** (`@web3auth/modal` + `@web3auth/solana-provider`) | Google/email/Apple login → MPC-derived Solana wallet, no seed phrase. Removes the #1 onboarding barrier for non-crypto creators. |
| Blockchain client | `@solana/web3.js` + `@coral-xyz/anchor` | Anchor TS client for typed program calls |
| Smart contract | Anchor (Rust) | De-facto Solana framework, fast iteration |
| NFT standard | Metaplex `@metaplex-foundation/mpl-token-metadata` | Standard NFT metadata schema |
| Hashing (exact) | Web Crypto `subtle.digest('SHA-256')` | Browser-native, zero deps |
| Hashing (perceptual) | `blockhash-js` + Canvas | Survives re-encoding |
| File storage | IPFS via `nft.storage` (free tier) or Pinata | Decentralized, content-addressed |
| Backend | Next.js API Routes (default) — Fastify if scale needed | Single deploy on Vercel |
| Database | PostgreSQL via Supabase | Free tier, generous, RLS-ready |
| ORM | Prisma 5 (recommended) or Supabase JS client | Typed queries, migrations |
| Validation | Zod 3 | Shared between frontend & backend |
| Bot | `grammY` (Telegram) | Modern TS-first Telegram framework |
| Unit tests | Vitest | Fast, ESM-native, Jest-compatible API |
| E2E tests | Playwright | Multi-browser, video capture, network stubbing |
| Hosting (web) | Vercel | One-click Next.js deploy, env mgmt, preview URLs |
| Hosting (program) | Solana Devnet → Mainnet | Target chain |
| CI | GitHub Actions | Lint + typecheck + test + Playwright on PR |
| Logging | `pino` (server) + console + Sentry (optional) | Structured logs |

---

## Quick Start

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org or `nvm install 20` |
| pnpm | 9+ | `npm install -g pnpm` |
| Rust toolchain | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Solana CLI | 1.18+ | `sh -c "$(curl -sSfL https://release.solana.com/stable/install)"` |
| Anchor | 0.30+ | `cargo install --git https://github.com/coral-xyz/anchor avm --locked && avm install latest && avm use latest` |
| Supabase CLI | latest | `brew install supabase/tap/supabase` (optional, for local Postgres) |
| Phantom wallet | latest | https://phantom.app — switch to **Devnet** in settings (optional: only needed to test the "power user" path; Web3Auth covers the default path) |
| Web3Auth dashboard | account | https://dashboard.web3auth.io — create a project (Sapphire Devnet), copy the Client ID into `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID` |

### One-time setup

```bash
# 1. Clone
git clone <repo-url>
cd SuperTeam

# 2. Install JS deps (after monorepo root package.json + pnpm-workspace.yaml are added)
pnpm install

# 3. Copy env templates
cp .env.example .env.local
cp frontend/.env.example frontend/.env.local

# 4. Configure Solana CLI for Devnet
solana config set --url https://api.devnet.solana.com
solana-keygen new --outfile ~/.config/solana/devnet.json   # if you don't have one
solana airdrop 2                                           # fund the keypair

# 5. Build & deploy the Anchor program to Devnet
cd blockchain
anchor build
anchor deploy --provider.cluster devnet
# Copy the printed Program ID into:
#   - blockchain/Anchor.toml [programs.devnet]
#   - blockchain/programs/vidchain/src/lib.rs (declare_id!)
#   - frontend/.env.local NEXT_PUBLIC_VIDCHAIN_PROGRAM_ID
anchor build && anchor deploy --provider.cluster devnet     # rebuild with correct ID
cd ..

# 6. Start the dev server
pnpm dev   # http://localhost:3000
```

### Hackathon "fast lane" (skip blockchain temporarily)

The frontend ships with an **adapter mock** at `frontend/src/lib/blockchain-adapter.ts` so you can demo registration without deploying the Anchor program. Set `NEXT_PUBLIC_USE_MOCK_CHAIN=true` in `frontend/.env.local` and the UI will simulate Devnet transactions. Replace with the real adapter as soon as the Anchor program is deployed.

---

## Environment Variables

All env files have a committed `.env.example`. Never commit `.env.local`, `.env.production`, or any file containing real secrets.

### Root `.env.example`

```bash
# Empty by default — used by orchestration scripts only.
NODE_ENV=development
```

### `frontend/.env.example`

```bash
# --- Public (sent to the browser, must be NEXT_PUBLIC_ prefixed) ---
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_VIDCHAIN_PROGRAM_ID=                       # fill after anchor deploy
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=                        # from https://dashboard.web3auth.io
NEXT_PUBLIC_WEB3AUTH_NETWORK=sapphire_devnet           # sapphire_devnet | sapphire_mainnet
NEXT_PUBLIC_USE_MOCK_CHAIN=false                       # true = skip real on-chain tx
NEXT_PUBLIC_USE_MOCK_API=false                         # true = use in-memory api-client mocks

# --- Server-only (no NEXT_PUBLIC_ prefix; never sent to browser) ---
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
SUPABASE_SERVICE_ROLE_KEY=                             # server-side admin key
NFT_STORAGE_API_KEY=                                   # https://nft.storage
PINATA_JWT=                                            # alternative to nft.storage
SOLANA_FEE_PAYER_SECRET=                               # base58 secret for paying tx fees server-side (devnet only)
SENTRY_DSN=                                            # optional
```

### `blockchain/.env.example`

```bash
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=~/.config/solana/devnet.json
```

### `bot/.env.example`

```bash
TELEGRAM_BOT_TOKEN=                                    # from @BotFather
BACKEND_API_URL=http://localhost:3000/api
```

---

## Development Workflow

See [WORKFLOW.md](WORKFLOW.md) for the day-by-day team plan and product flow. Day-to-day commands:

```bash
pnpm dev                  # start frontend dev server (http://localhost:3000)
pnpm lint                 # run ESLint across all packages
pnpm typecheck            # run tsc --noEmit across all packages
pnpm test                 # run all unit tests (Vitest)
pnpm test:e2e             # run Playwright e2e tests against built app
pnpm anchor:build         # build Solana program
pnpm anchor:test          # run Anchor tests against local validator
pnpm anchor:deploy        # deploy to Devnet (requires funded keypair)
```

### Branch & commit convention

- Trunk: `main` — always green, always deployable.
- Feature branches: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`.
- Commits follow **Conventional Commits**: `feat(frontend): add verify page` / `fix(blockchain): pda seed mismatch`.
- All work merges to `main` via PR with passing CI (lint + typecheck + unit + e2e).

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor guide.

---

## Testing

VidChain uses a three-layer test pyramid:

1. **Unit tests (Vitest)** — pure functions: hashing, pHash, matching, schema parsing.
2. **Integration tests (Vitest + msw)** — API route handlers with mocked DB and Solana.
3. **E2E tests (Playwright)** — register → verify → certificate full flow against a built app.

Quick run:

```bash
pnpm test            # unit + integration
pnpm test:e2e        # e2e (auto-starts dev server)
pnpm anchor:test     # Anchor program tests against `solana-test-validator`
```

Read **[TESTING.md](TESTING.md)** for the complete testing guide, including:

- How to write a Playwright spec for the register-verify flow
- How to seed the demo dataset (original / re-encoded / unrelated videos)
- How to mock wallet signing in Playwright
- CI integration

---

## Deployment

VidChain deploys to:

- **Vercel** for the Next.js frontend + API routes (free tier).
- **Solana Devnet** for the Anchor program during the hackathon, **Solana Mainnet** post-launch.
- **Supabase** for managed PostgreSQL.
- **NFT.Storage / Pinata** for IPFS pinning.

Quick deploy (after first-time setup):

```bash
# Frontend (one command, requires Vercel CLI logged in)
cd frontend && vercel --prod

# Anchor program update
cd blockchain && anchor deploy --provider.cluster devnet
```

Read **[DEPLOYMENT.md](DEPLOYMENT.md)** for first-time Vercel setup, env-var management, custom domain, and post-deploy smoke tests.

---

## MVP Scope

### Must Have (hackathon submission)

- [x] Register an original video (upload → fingerprint → mint NFT → certificate)
- [x] Public certificate page (no wallet required)
- [x] Verify a re-encoded copy of the same video (SHA-256 + pHash)
- [x] Reject unrelated video with "no match"
- [x] Solana Devnet transaction visible on Solana Explorer
- [x] Working demo on Vercel-hosted URL
- [x] Demo dataset (original / compressed / unrelated)
- [x] Public GitHub repo
- [x] 3-minute demo video + pitch deck

### Out of Scope (MVP)

- Full NFT marketplace
- Token launch / VidChain coin
- Crypto investment / yield
- Legal-grade dispute court
- Claims of being a registered notary
- Mainnet launch (post-hackathon Phase 1)

### Stretch (if MVP is solid)

- Royalty smart contract — `purchase_license` + atomic split
- On-chain dispute system — `file_dispute` + reputation score
- Telegram bot — register/verify via chat
- Pose / motion fingerprinting (MediaPipe)

---

## Workstream Documentation

Each workstream has detailed, implementation-ready instructions:

- **[Frontend](frontend/instruction.md)** — Next.js pages, wallet flow, UI states, copy
- **[Backend](backend/instruction.md)** — API contracts, repositories, Supabase schema
- **[Fingerprinting](fingerprinting/instruction.md)** — SHA-256 + pHash algorithm, frame extraction, matching
- **[Blockchain](blockchain/instruction.md)** — Anchor program, instructions, PDAs, deployment
- **[Bot](bot/instruction.md)** — Telegram bot flow, backend integration
- **[Shared](shared/instruction.md)** — Zod schemas, error codes, layered architecture

Cross-cutting docs:

- **[AGENTS.md](AGENTS.md)** — 🤖 deterministic AI-agent build playbook (read first if using Claude/Sonnet to implement)
- **[WORKFLOW.md](WORKFLOW.md)** — product, technical, team workflow, demo plan
- **[TESTING.md](TESTING.md)** — Vitest + Playwright + Anchor testing
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Vercel + Devnet deployment
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — branches, commits, PRs, code style

---

## Success Criteria

VidChain MVP is **submission-ready** when all of the following are true:

- [ ] `pnpm install && pnpm dev` works from a clean clone in under 5 minutes
- [ ] User can register an original video and get a Devnet transaction signature
- [ ] Certificate page is publicly accessible and shows a valid Solana Explorer link
- [ ] Re-encoded copy of the original returns a `visual` match with confidence ≥ 0.85
- [ ] Unrelated video returns `none` with confidence < 0.65
- [ ] All Vitest tests pass (`pnpm test`)
- [ ] Playwright e2e covers register → verify → certificate happy path
- [ ] Anchor program tests pass (`pnpm anchor:test`)
- [ ] Deployed to Vercel with a public HTTPS URL
- [ ] 3-minute demo recording + pitch deck checked into `docs/`
- [ ] GitHub repo is public, README renders, `.env.example` is complete

---

**VidChain — Prove It. Own It. Earn From It.**
Built for Indonesian creators. Powered by Solana.
