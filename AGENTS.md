# AGENTS.md — Build VidChain (Read this first)

This file is the **deterministic playbook** for an AI coding agent (Claude Sonnet) building VidChain end-to-end. Read it top to bottom, follow the phases in order, and never skip a phase's acceptance test.

If a phase fails its acceptance test, **stop, fix it, then continue**. Do not proceed with broken foundations.

---

## How to use this document

1. Read this file completely before writing any code.
2. Read [`README.md`](README.md) for the product picture.
3. Read the workstream `instruction.md` for the phase you are about to execute (e.g. before Phase 4, read `frontend/instruction.md`).
4. Execute one phase at a time. After each phase, run its **Acceptance test** and confirm it passes before moving on.
5. When stuck, re-read the relevant `instruction.md` — never invent answers.

---

## Hard rules (non-negotiable)

These prevent the most common AI agent failure modes. Violating any of them invalidates the build.

1. **No invented dependencies.** Every `pnpm add` call must use a package listed in the workstream `instruction.md`. If you think you need a new package, stop and ask the user.
2. **No invented APIs.** Use only the Zod schemas and function signatures defined in `shared/instruction.md` and the workstream docs. If you need a new field, add it to `shared/src/schemas.ts` first and update every consumer in the same edit.
3. **No `any` and no `as` casts** outside narrowing parsed `unknown` values. Strict TypeScript is enforced.
4. **No placeholders left in code.** No `// TODO: implement later`, no `throw new Error("not implemented")`, no `return null as any`. If you cannot finish a function in this phase, stop and ask.
5. **No skipping tests.** Every phase's acceptance test must pass. Do not commit code with failing tests.
6. **No skipping the env validator.** Every package reads env via `lib/env.ts` (Zod-parsed). Never read `process.env.X` directly outside that file.
7. **No secrets in code or docs.** If a value is a secret, it lives in `.env.local` (gitignored). The `.env.example` file gets the key with an empty value.
8. **No mock data in production paths.** Mocks live behind `NEXT_PUBLIC_USE_MOCK_API=true` / `NEXT_PUBLIC_USE_MOCK_CHAIN=true`. Production builds must fail if these flags are true on the production URL.
9. **No direct `window.solana`, no direct `@web3auth/*` imports outside the providers and `useVidchainWallet`.** Always go through `useVidchainWallet()`.
10. **No "Day 2 cleanup" PRs.** If you change a file, finish it. Half-done refactors break the next agent.
11. **No commits to `main`.** Always work on `feat/<topic>` branches.
12. **Reuse existing code before writing new code.** Search the repo (`rg <symbol>`) before creating a new helper — there is probably one already.

---

## Build phases

The 8 phases are ordered by dependency. Earlier phases unblock later ones.

```
Phase 0  Repo bootstrap                         ← you are here
Phase 1  shared/  (Zod schemas, errors)         ← unblocks everything
Phase 2  fingerprinting/  (pure TS)             ← unblocks frontend + backend
Phase 3  frontend skeleton + mock mode          ← unblocks UI iteration
Phase 4  blockchain/ Anchor program             ← unblocks real signing
Phase 5  backend (Next.js API routes + Prisma)  ← unblocks real persistence
Phase 6  Web3Auth + wallet integration          ← unblocks real onboarding
Phase 7  E2E + CI                               ← unblocks deployment
Phase 8  Deploy to Vercel + Devnet              ← submission
```

Each phase below has:

- **Goal** — one sentence.
- **Read first** — docs to load into context.
- **Files to create / modify** — exact paths.
- **Commands** — exact commands to run.
- **Acceptance test** — pass/fail check before moving on.
- **Common pitfalls** — what AI agents get wrong here.

---

### Phase 0 — Repo bootstrap

**Goal.** Wire up the monorepo so every package can be installed and built with one command.

**Read first.** [`README.md`](README.md) sections "Repository Layout", "Monorepo Setup", "Quick Start".

**Files to create.**

```
SuperTeam/
├── package.json                   # root, with pnpm workspaces script
├── pnpm-workspace.yaml
├── .nvmrc                         # contents: 20
├── .editorconfig                  # standard 2-space indent
└── .github/workflows/ci.yml       # see TESTING.md "CI Pipeline"
```

Use the exact `package.json` and `pnpm-workspace.yaml` content from [`README.md` → Monorepo Setup](README.md#monorepo-setup).

**Commands.**

```bash
pnpm install
node --version       # must print v20.x
pnpm --version       # must print 9.x
```

**Acceptance test.**

- `pnpm install` exits 0.
- `pnpm -r typecheck` runs (it will succeed trivially since packages are still empty stubs).

**Common pitfalls.**

- Forgetting `"packageManager": "pnpm@9.x"` in root `package.json` → CI uses npm by accident.
- Adding workspaces both in `package.json` and `pnpm-workspace.yaml`. Use only `pnpm-workspace.yaml`.

---

### Phase 1 — `shared/`

**Goal.** Publish all Zod schemas, error codes, and the response envelope so every other package imports types from one source of truth.

**Read first.** [`shared/instruction.md`](shared/instruction.md) in full.

**Files to create.**

```
shared/
├── package.json                   # exact contents in shared/instruction.md
├── tsconfig.json                  # see "Exact-content appendices" below
├── vitest.config.ts
├── src/
│   ├── index.ts
│   ├── schemas.ts
│   ├── errors.ts
│   ├── envelope.ts
│   └── constants.ts
└── tests/
    └── schemas.test.ts
```

`src/schemas.ts`, `src/errors.ts`, `src/envelope.ts` — copy verbatim from `shared/instruction.md`.

**Commands.**

```bash
cd shared
pnpm add zod
pnpm add -D typescript vitest
pnpm test
pnpm typecheck
```

**Acceptance test.**

- `pnpm test` shows ≥ 2 passing specs (round-trip parse, regex rejection).
- `pnpm typecheck` exits 0.
- Importing `proofSchema, type Proof` from `@vidchain/shared` works in a sibling package (verify with a one-line import in `frontend/src/shared/schemas.ts` replaced by `export * from "@vidchain/shared"`).

**Common pitfalls.**

- Declaring TS `interface Proof` AND a Zod schema → drift. Use only `z.infer<typeof proofSchema>`.
- Forgetting to add `frontend/src/shared/schemas.ts` re-export → frontend keeps a local duplicate.

---

### Phase 2 — `fingerprinting/`

**Goal.** Deterministic SHA-256 + pHash + matcher with green unit tests.

**Read first.** [`fingerprinting/instruction.md`](fingerprinting/instruction.md) in full.

**Files to create.**

```
fingerprinting/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts
│   ├── sha256.ts
│   ├── phash.ts
│   ├── frame-sampler.ts
│   ├── browser-adapter.ts
│   ├── matcher.ts
│   ├── types.ts
│   └── constants.ts
└── tests/
    ├── sha256.test.ts
    ├── matcher.test.ts
    └── fixtures/
        ├── tiny.mp4               # < 100 KB, commit it
        └── tiny-reencoded.mp4
```

**Commands.**

```bash
cd fingerprinting
pnpm add blockhash-js
pnpm add -D typescript vitest @vitest/coverage-v8
pnpm test
```

**Acceptance test.**

- `sha256.test.ts` — same buffer twice → same hex; one byte changed → different hex.
- `matcher.test.ts` — `hammingDistance("ffff…", "ffff…") === 0`; one-bit change → 1; sliding-window finds shorter inside longer.
- All exports are typed, no `any`.

**Common pitfalls.**

- Importing `document` / `HTMLVideoElement` in `src/sha256.ts` — DOM APIs must live only in `src/browser-adapter.ts`.
- Using `Buffer` in browser bundles. Use `Uint8Array` + `crypto.subtle`.

---

### Phase 3 — Frontend skeleton + mock mode

**Goal.** A user can `pnpm dev`, navigate to `/`, `/register`, `/verify`, `/certificate/proof_demo`, complete the register flow with mocked wallet + chain + API, and see a certificate page render.

**Read first.** [`frontend/instruction.md`](frontend/instruction.md) sections "Setup", "Folder Structure", "Routing & Pages", "State Machine", "API Client", "Mock vs Real Modes".

**Files to create / verify.** All entries under `frontend/src/` listed in `frontend/instruction.md` → "Folder Structure". Frontend already has some scaffolding (verify it matches; complete missing pieces).

**Required env in `frontend/.env.local`:**

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_USE_MOCK_API=true
NEXT_PUBLIC_USE_MOCK_CHAIN=true
NEXT_PUBLIC_VIDCHAIN_PROGRAM_ID=11111111111111111111111111111111
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=mock_client_id
NEXT_PUBLIC_WEB3AUTH_NETWORK=sapphire_devnet
```

**Commands.**

```bash
cd frontend
pnpm install
pnpm dev
# in another terminal:
pnpm typecheck
pnpm lint
```

**Acceptance test.**

- `http://localhost:3000` loads with two CTAs.
- `/register` shows the dropzone (mock wallet auto-connected).
- Drop `frontend/fixtures/demo/original.mp4`, type a title, submit → certificate page renders with mock signature + Solana Explorer link.
- `/verify` accepts a file and renders a result badge.
- `/certificate/proof_demo` SSR-renders without JS (test with `curl localhost:3000/certificate/proof_demo | grep "Demo"`).
- `pnpm typecheck && pnpm lint` clean.

**Common pitfalls.**

- Importing server modules from client components → "Module not found: fs". Enforce with the ESLint `no-restricted-imports` rule from `frontend/instruction.md`.
- Forgetting `"use client"` on hooks/components that use state.
- Hard-coding `process.env.X` instead of importing from `@/lib/env`.

---

### Phase 4 — `blockchain/` Anchor program

**Goal.** `register_proof` instruction deployed to Devnet, IDL + types committed under `blockchain/clients/ts/idl/`.

**Read first.** [`blockchain/instruction.md`](blockchain/instruction.md) in full.

**Files to create.** All under `blockchain/` — see `blockchain/instruction.md` → "Folder Structure".

**Commands.**

```bash
# one-time toolchain (skip if already installed)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.30.1 && avm use 0.30.1

cd blockchain
solana config set --url https://api.devnet.solana.com
solana-keygen new --outfile ~/.config/solana/devnet-deployer.json --no-bip39-passphrase
solana config set --keypair ~/.config/solana/devnet-deployer.json
solana airdrop 2

anchor build
anchor keys list                                        # → copy program ID
# Replace the placeholder declare_id!() and Anchor.toml [programs.devnet] with this ID
anchor build && anchor deploy --provider.cluster devnet

cp target/idl/vidchain.json   clients/ts/idl/vidchain.json
cp target/types/vidchain.ts   clients/ts/idl/vidchain.ts

anchor test                                             # local validator test
```

**Acceptance test.**

- `anchor build` exits 0.
- `anchor deploy --provider.cluster devnet` returns a program ID; that ID appears in Solana Explorer (Devnet cluster).
- `anchor test` passes for `register_proof` create + duplicate-rejection cases.
- `blockchain/clients/ts/idl/vidchain.json` and `.ts` are committed.

**Common pitfalls.**

- Forgetting to update `declare_id!()` after `anchor keys list` — first deploy succeeds but every test fails with "DeclaredProgramIdMismatch".
- Adding `String` fields without size budget → `Proof::MAX_LEN` is wrong → "AccountDidNotDeserialize".
- Missing `system_program: Program<'info, System>` in `#[derive(Accounts)]` for any instruction that uses `init`.

---

### Phase 5 — Backend (Next.js API routes + Prisma)

**Goal.** `POST /api/proofs`, `GET /api/proofs/:id`, `POST /api/proofs/verify`, `POST /api/airdrop` all work against a real local Postgres.

**Read first.** [`backend/instruction.md`](backend/instruction.md) in full.

**Files to create / modify.** Routes under `frontend/src/app/api/*`, server modules under `frontend/src/server/*`, Prisma schema at `frontend/prisma/schema.prisma`.

**Commands.**

```bash
# Local Postgres (one of)
supabase start                          # if Supabase CLI installed
# or
docker run --name vidchain-pg -e POSTGRES_PASSWORD=postgres -p 54322:5432 -d postgres:16

cd frontend
pnpm add prisma @prisma/client pino
pnpm exec prisma init
# Replace prisma/schema.prisma with the content from backend/instruction.md
pnpm exec prisma migrate dev --name init
pnpm exec prisma generate
```

Then turn off the API mock:

```bash
# frontend/.env.local
NEXT_PUBLIC_USE_MOCK_API=false
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

**Acceptance test.**

- `POST /api/proofs` with a valid body returns `{ success: true, data: { id, ... } }` and the row exists in `Proof`.
- `GET /api/proofs/:id` returns the row.
- `POST /api/proofs/verify` with the same `sha256` returns `{ matchType: "exact", confidence: 1 }`.
- Frontend register flow still works end-to-end against the real backend (mock chain still on for now).

**Common pitfalls.**

- Body parser limit too low → uploads fail. Set `bodyParser: { sizeLimit: '5mb' }` per route.
- Forgetting to run `prisma generate` after schema change.
- Importing server-only modules into client code (the ESLint rule from Phase 3 catches this — do not disable it).

---

### Phase 6 — Web3Auth + real wallet integration

**Goal.** A user can sign in with Google (Web3Auth), get a real Solana keypair, get auto-airdropped 0.05 SOL on Devnet, and sign a real `register_proof` transaction.

**Read first.** [`frontend/instruction.md` → "Wallet & Auth Integration"](frontend/instruction.md#wallet--auth-integration-web3auth--phantom) in full. Also [`DEPLOYMENT.md` → "Web3Auth — Social Login"](DEPLOYMENT.md#web3auth--social-login).

**One-time setup (manual, not code).**

1. Create a Web3Auth project at https://dashboard.web3auth.io: Plug and Play → Solana → Sapphire Devnet.
2. Whitelist `http://localhost:3000`.
3. Copy the Client ID into `frontend/.env.local` → `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID`.

**Files to create / modify.**

- `frontend/src/components/providers/web3auth-provider.tsx` — verbatim from `frontend/instruction.md`.
- `frontend/src/components/providers/vidchain-providers.tsx` — verbatim.
- `frontend/src/lib/use-vidchain-wallet.ts` — verbatim.
- `frontend/src/components/auth/sign-in-tabs.tsx` — verbatim.
- `frontend/src/server/airdrop.ts` and `frontend/src/app/api/airdrop/route.ts` — verbatim.
- Replace any direct `useWallet()` from `@solana/wallet-adapter-react` in features with `useVidchainWallet()`.
- `frontend/src/app/layout.tsx` — wrap children with `<VidchainProviders>`.

**Commands.**

```bash
cd frontend
pnpm add @web3auth/modal @web3auth/base @web3auth/solana-provider @web3auth/auth-adapter
# turn off the chain mock
# frontend/.env.local: NEXT_PUBLIC_USE_MOCK_CHAIN=false
pnpm dev
```

**Acceptance test.**

- Visit `/register` → sign-in tabs render (Google, Email, Phantom).
- Click "Continue with Google" → Web3Auth modal opens → Google consent → modal closes → wallet shows as connected.
- Wallet balance ≥ 0.05 SOL on Devnet (auto-airdrop ran).
- Submitting a register flow produces a real Devnet transaction; clicking the Solana Explorer link shows the tx as confirmed and invoking the VidChain program.
- Logging out (disconnect) clears `useVidchainWallet().publicKey` to `null`.
- `pnpm typecheck && pnpm lint` clean.

**Common pitfalls.**

- Calling `web3auth.initModal()` more than once — leads to "Web3Auth already initialized". Initialize only inside `useEffect` with empty deps.
- Wrapping the providers in the wrong order — `Web3AuthProvider` must be inside `WalletProvider`, not outside, because `useVidchainWallet` reads both contexts.
- Importing `@web3auth/*` outside the provider files — breaks bundle splitting. Lazy-import if you must.

---

### Phase 7 — E2E + CI

**Goal.** `pnpm test`, `pnpm test:e2e`, `pnpm anchor:test` all green locally and on GitHub Actions.

**Read first.** [`TESTING.md`](TESTING.md) in full. Especially "End-to-End Tests", "Mocking the Wallet", "CI Pipeline".

**Files to create.**

- `frontend/playwright.config.ts` — verbatim.
- `frontend/tests/e2e/fixtures/pages.ts` — verbatim.
- `frontend/tests/e2e/register-flow.spec.ts`
- `frontend/tests/e2e/verify-flow.spec.ts`
- `frontend/tests/e2e/certificate-share.spec.ts`
- `frontend/fixtures/demo/original.mp4` (commit, ≤ 5 MB)
- `frontend/fixtures/demo/original-reencoded.mp4` (HandBrake re-encode)
- `frontend/fixtures/demo/unrelated.mp4`
- `.github/workflows/ci.yml` — verbatim.

**Commands.**

```bash
cd frontend
pnpm add -D @playwright/test
pnpm exec playwright install chromium
pnpm test
pnpm test:e2e
```

**Acceptance test.**

- All required specs from `TESTING.md` → "Coverage & Required Specs" pass.
- A pushed PR shows green CI on lint + typecheck + test + e2e.
- Playwright HTML report uploaded as a CI artifact.

**Common pitfalls.**

- Selecting elements by text or class instead of `data-testid` — flaky on copy or Tailwind changes.
- Forgetting to set `NEXT_PUBLIC_USE_MOCK_CHAIN=true` in the Playwright `webServer.env` — tests open the real Web3Auth modal and hang.
- Running Playwright against `pnpm dev` instead of `pnpm build && pnpm start` — picks up dev-only behavior that doesn't ship.

---

### Phase 8 — Deploy

**Goal.** `https://vidchain.app` (or `*.vercel.app`) lives, and the post-deploy smoke test from `DEPLOYMENT.md` passes from a fresh browser.

**Read first.** [`DEPLOYMENT.md`](DEPLOYMENT.md) in full.

**Steps.**

1. Push branch → open PR → merge after green CI.
2. Vercel auto-deploys to production from `main`.
3. Run [`DEPLOYMENT.md` → "Post-Deploy Smoke Test"](DEPLOYMENT.md#post-deploy-smoke-test) by hand.
4. If smoke test fails, [`DEPLOYMENT.md` → "Rollback"](DEPLOYMENT.md#rollback).

**Acceptance test.**

- All 11 smoke-test steps pass.
- `playwright test` against the production URL passes.

---

## Decision tree — which doc to read

| If you need to ... | Read |
|---|---|
| Understand the product | `README.md` + `WORKFLOW.md` |
| Add a Zod schema or change a type | `shared/instruction.md` |
| Touch fingerprinting math | `fingerprinting/instruction.md` |
| Touch UI / pages / hooks | `frontend/instruction.md` |
| Touch the Anchor program | `blockchain/instruction.md` |
| Touch a backend route | `backend/instruction.md` (and `frontend/src/app/api/*` for code location) |
| Touch wallet / login | `frontend/instruction.md` → "Wallet & Auth Integration" |
| Add or fix a test | `TESTING.md` |
| Deploy or change env | `DEPLOYMENT.md` |
| Open a PR | `CONTRIBUTING.md` |

---

## Common AI agent failure modes (and how to avoid them)

| Failure | Avoidance |
|---|---|
| Inventing a package because it "should exist" | Search npm before adding. If unsure, ask. |
| Inventing an API method on `@web3auth/modal` | Open the package's `package.json` `types` field, read the actual `.d.ts`. |
| Refactoring beyond the task | Stop. Open a separate PR. The current task does not require it. |
| Adding a config file you don't need | If the build works without it, do not add it. |
| Writing a function that "logs and returns null" on error | Throw a typed error. Caller decides UX. |
| Skipping the env validator and reading `process.env.X` directly | Always import `env` from `@/lib/env`. |
| Updating the schema in one package and not the consumers | Use `rg "<old field name>"` to find every reference, update all in the same edit. |
| Leaving `console.log` in committed code | Remove before commit. Use `pino` server-side. |
| Marking a task complete with failing tests | Tests passing is the definition of done. |
| Asking the user to set env vars without updating `.env.example` | Always update `.env.example` in the same edit. |

---

## Exact-content appendices

These are drop-in files — copy them verbatim so every package matches.

### A. `tsconfig.json` — strict, ES2022, bundler resolution

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": false,
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist", ".next"]
}
```

For `frontend/tsconfig.json`, additionally include Next defaults (already generated by `create-next-app`):

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "src/**/*", "tests/**/*", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### B. `frontend/src/lib/env.ts` — Zod-validated env loader

```ts
import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL:               z.string().url(),
  NEXT_PUBLIC_SOLANA_CLUSTER:        z.enum(["devnet", "testnet", "mainnet-beta"]),
  NEXT_PUBLIC_SOLANA_RPC_URL:        z.string().url(),
  NEXT_PUBLIC_VIDCHAIN_PROGRAM_ID:   z.string().min(32).max(44),
  NEXT_PUBLIC_WEB3AUTH_CLIENT_ID:    z.string().min(1),
  NEXT_PUBLIC_WEB3AUTH_NETWORK:      z.enum(["sapphire_devnet", "sapphire_mainnet"]),
  NEXT_PUBLIC_USE_MOCK_API:          z.enum(["true", "false"]).transform((v) => v === "true"),
  NEXT_PUBLIC_USE_MOCK_CHAIN:        z.enum(["true", "false"]).transform((v) => v === "true"),
});

const serverSchema = z.object({
  DATABASE_URL:                      z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY:         z.string().optional(),
  NFT_STORAGE_API_KEY:               z.string().optional(),
  PINATA_JWT:                        z.string().optional(),
  SOLANA_FEE_PAYER_SECRET:           z.string().optional(),
  SENTRY_DSN:                        z.string().optional(),
  LOG_LEVEL:                         z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const isServer = typeof window === "undefined";

const parsedPublic = publicSchema.parse({
  NEXT_PUBLIC_APP_URL:             process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SOLANA_CLUSTER:      process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
  NEXT_PUBLIC_SOLANA_RPC_URL:      process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  NEXT_PUBLIC_VIDCHAIN_PROGRAM_ID: process.env.NEXT_PUBLIC_VIDCHAIN_PROGRAM_ID,
  NEXT_PUBLIC_WEB3AUTH_CLIENT_ID:  process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID,
  NEXT_PUBLIC_WEB3AUTH_NETWORK:    process.env.NEXT_PUBLIC_WEB3AUTH_NETWORK,
  NEXT_PUBLIC_USE_MOCK_API:        process.env.NEXT_PUBLIC_USE_MOCK_API ?? "false",
  NEXT_PUBLIC_USE_MOCK_CHAIN:      process.env.NEXT_PUBLIC_USE_MOCK_CHAIN ?? "false",
});

const parsedServer = isServer ? serverSchema.parse(process.env) : ({} as z.infer<typeof serverSchema>);

// Production safety: fail the build if mocks are on for the production URL.
if (parsedPublic.NEXT_PUBLIC_APP_URL.includes("vidchain.app") &&
    (parsedPublic.NEXT_PUBLIC_USE_MOCK_API || parsedPublic.NEXT_PUBLIC_USE_MOCK_CHAIN)) {
  throw new Error("Mock flags are enabled in production. Set NEXT_PUBLIC_USE_MOCK_* to false.");
}

export const env = { ...parsedPublic, ...parsedServer };
```

### C. `.eslintrc.json` for `frontend/`

```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-imports": "error",
    "no-restricted-imports": ["error", {
      "patterns": [
        { "group": ["**/server/**"], "message": "Server modules cannot be imported from client code. Use an API route." },
        { "group": ["@web3auth/*"], "importNames": ["*"], "message": "Import Web3Auth only from src/components/providers/* and src/lib/use-vidchain-wallet.ts." }
      ]
    }],
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  },
  "overrides": [
    { "files": ["src/components/providers/**", "src/lib/use-vidchain-wallet.ts"], "rules": { "no-restricted-imports": "off" } }
  ]
}
```

### D. Root `package.json`

```json
{
  "name": "vidchain",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "dev":           "pnpm --filter frontend dev",
    "build":         "pnpm -r build",
    "lint":          "pnpm -r lint",
    "typecheck":     "pnpm -r typecheck",
    "test":          "pnpm -r test",
    "test:e2e":      "pnpm --filter frontend test:e2e",
    "anchor:build":  "cd blockchain && anchor build",
    "anchor:test":   "cd blockchain && anchor test",
    "anchor:deploy": "cd blockchain && anchor deploy --provider.cluster devnet"
  }
}
```

### E. `pnpm-workspace.yaml`

```yaml
packages:
  - "frontend"
  - "backend"
  - "fingerprinting"
  - "bot"
  - "shared"
```

---

## After every phase

Before moving on:

1. Run the phase's **Acceptance test**. If it fails, fix and re-run.
2. Run `pnpm typecheck && pnpm lint && pnpm test` from the repo root.
3. Commit with a Conventional Commit message scoped to the phase: `feat(shared): add proof + verification schemas (phase 1)`.
4. Open a draft PR if you want CI feedback.

---

## When you finish all 8 phases

Run the full submission checklist from [`README.md` → "Success Criteria"](README.md#success-criteria). If every box is checked, VidChain is ready to demo.

**Welcome. Build it carefully. Tests are the definition of done.**
