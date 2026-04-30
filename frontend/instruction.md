# Frontend Instructions

The frontend goal: **make VidChain feel like a normal creator tool, not a crypto app.** The wallet step should feel like a one-tap social login, the certificate page like an Instagram screenshot, the verifier like a Shazam for stolen video.

> Stack reference: Next.js 15 App Router · React 19 · TypeScript (strict) · Tailwind CSS 3 · Solana Wallet Adapter · Web Crypto API · Canvas + blockhash-js.

---

## Table of Contents

1. [Responsibilities](#responsibilities)
2. [Setup](#setup)
3. [Folder Structure](#folder-structure)
4. [Routing & Pages](#routing--pages)
5. [Wallet Integration](#wallet-integration)
6. [State Machine](#state-machine)
7. [API Client](#api-client)
8. [UI Conventions](#ui-conventions)
9. [Mock vs Real Modes](#mock-vs-real-modes)
10. [Testing](#testing)
11. [Performance & Accessibility](#performance--accessibility)
12. [Success Criteria](#success-criteria)

---

## Responsibilities

- Render every user-facing surface (home, register, verify, certificate, dashboard, license, dispute).
- Own all wallet UX (connect, sign, error recovery).
- Run fingerprinting **in the browser** — never upload the raw video to the backend.
- Talk to the backend via a single `apiClient` boundary so swapping mock ↔ real is one env flag.
- Serve OG-tagged certificate pages that share well on social.

The frontend does **not**:

- Hold private keys or seed phrases.
- Implement matching logic — that lives in `fingerprinting/` and the backend.
- Talk to the database directly.

---

## Setup

```bash
cd frontend
pnpm install                       # or npm/yarn if not on workspaces
cp .env.example .env.local
pnpm dev                           # http://localhost:3000
```

`.env.local` minimum to boot in mock mode:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_USE_MOCK_API=true
NEXT_PUBLIC_USE_MOCK_CHAIN=true
```

### Required dependencies (already in `package.json` or to add)

```bash
# Already installed
next react react-dom typescript tailwindcss zod clsx lucide-react tailwind-merge

# Add for real Solana integration
pnpm add @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui \
        @solana/wallet-adapter-base @solana/wallet-adapter-wallets \
        @coral-xyz/anchor @metaplex-foundation/mpl-token-metadata bs58

# Add for fingerprinting
pnpm add blockhash-js

# Add for IPFS
pnpm add nft.storage   # or "@pinata/sdk" if using Pinata

# Add for testing
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event
pnpm add -D @playwright/test

# Optional: better forms + state
pnpm add react-hook-form @hookform/resolvers
```

---

## Folder Structure

```text
frontend/
├── src/
│   ├── app/                              # App Router — routing only, thin pages
│   │   ├── layout.tsx                    # global providers (Wallet, Theme)
│   │   ├── page.tsx                      # → renders <HomePage />
│   │   ├── globals.css
│   │   ├── register/page.tsx             # → renders <RegisterView />
│   │   ├── verify/page.tsx               # → renders <VerifyView />
│   │   ├── certificate/[id]/
│   │   │   ├── page.tsx                  # SSR certificate (good for OG tags)
│   │   │   └── opengraph-image.tsx       # dynamic OG image
│   │   ├── dashboard/page.tsx            # creator's registered videos
│   │   └── api/                          # Backend API routes (see backend/instruction.md)
│   │       ├── proofs/
│   │       │   ├── route.ts              # POST create, GET list
│   │       │   └── [id]/route.ts         # GET single
│   │       ├── proofs/verify/route.ts
│   │       └── fingerprints/route.ts
│   │
│   ├── features/                         # Feature-scoped components + hooks
│   │   ├── home/home-page.tsx
│   │   ├── register/
│   │   │   ├── register-view.tsx
│   │   │   └── use-register-video-flow.ts
│   │   ├── verify/
│   │   │   ├── verify-view.tsx
│   │   │   └── use-verify-video-flow.ts
│   │   ├── certificate/certificate-view.tsx
│   │   └── dashboard/dashboard-view.tsx
│   │
│   ├── components/                       # Reusable, feature-agnostic
│   │   ├── ui/                           # primitives: button, card, badge, text-field
│   │   ├── layout/app-shell.tsx
│   │   ├── upload/                       # video-dropzone, video-preview
│   │   └── proof/                        # confidence-meter, proof-status-badge
│   │
│   ├── lib/                              # framework-agnostic helpers (CLIENT-safe)
│   │   ├── api-client.ts                 # ONE place that hits /api/*
│   │   ├── fingerprint-client.ts         # delegates to fingerprinting/ pkg
│   │   ├── blockchain-adapter.ts         # delegates to @/server/solana on server, client on browser
│   │   ├── routes.ts                     # typed route helpers
│   │   ├── env.ts                        # validated env exports (Zod)
│   │   ├── utils.ts                      # cn(), format helpers
│   │   └── demo-data.ts                  # mock data for NEXT_PUBLIC_USE_MOCK_*
│   │
│   ├── server/                           # SERVER-ONLY code (do not import from client)
│   │   ├── db.ts                         # Prisma client singleton
│   │   ├── repositories/
│   │   │   ├── proof-repository.ts
│   │   │   └── verification-repository.ts
│   │   ├── solana/
│   │   │   ├── connection.ts
│   │   │   ├── program.ts                # Anchor program loader
│   │   │   └── register-proof.ts
│   │   ├── ipfs.ts                       # NFT.Storage / Pinata wrapper
│   │   ├── matching.ts                   # pHash candidate search
│   │   └── api-helpers.ts                # response envelope, requestId, error mapping
│   │
│   └── shared/                           # Zod schemas + types (re-exported from /shared pkg in monorepo)
│       └── schemas.ts
│
├── tests/
│   ├── unit/                             # *.test.ts colocated or here
│   └── e2e/                              # *.spec.ts (Playwright)
│       ├── register-flow.spec.ts
│       ├── verify-flow.spec.ts
│       └── certificate-share.spec.ts
│
├── fixtures/
│   └── demo/
│       ├── original.mp4
│       ├── original-reencoded.mp4
│       └── unrelated.mp4
│
├── public/
├── playwright.config.ts
├── vitest.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Hard rule:** files in `src/server/` must never be imported from `src/features/`, `src/components/`, or `src/lib/`. Enforce with an ESLint rule:

```js
// .eslintrc.json — add
"no-restricted-imports": ["error", {
  "patterns": [{
    "group": ["**/server/**"],
    "message": "Server code cannot be imported from client. Use an API route."
  }]
}]
```

---

## Routing & Pages

| Route | Purpose | Renders | Notes |
|---|---|---|---|
| `/` | Home — two CTAs | `<HomePage />` | No marketing wall. Click "Register Video" or "Check Original". |
| `/register` | Creator flow | `<RegisterView />` | Auth-gated by wallet (prompt if not connected). |
| `/verify` | Verifier flow | `<VerifyView />` | No wallet required. |
| `/certificate/[id]` | Public proof | `<CertificateView />` | **SSR** for OG tags. Loads even with JS disabled. |
| `/dashboard` | My registrations | `<DashboardView />` | Wallet-gated. Lists proofs by `creatorWallet`. |
| `/license/[id]` (stretch) | License purchase | `<LicenseView />` | Buyer signs `purchase_license`. |
| `/dispute/new` (stretch) | File dispute | `<DisputeView />` | Creator signs `file_dispute`. |

### Page implementation rules

- `app/*/page.tsx` is **thin** — it imports a feature component and nothing else.
- Pages that read params: use the typed App Router signature `({ params }: { params: { id: string } })`.
- Use `loading.tsx` and `error.tsx` per route segment for instant feedback.
- Certificate page uses `generateMetadata()` for OG tags — fetch the proof on the server and inject `og:title`, `og:image`, `og:description`.

---

## Wallet Integration

```tsx
// src/app/layout.tsx
import { SolanaWalletProviders } from "@/components/providers/solana-wallet-providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SolanaWalletProviders>{children}</SolanaWalletProviders>
      </body>
    </html>
  );
}
```

```tsx
// src/components/providers/solana-wallet-providers.tsx
"use client";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { useMemo } from "react";
import { env } from "@/lib/env";

export function SolanaWalletProviders({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={env.NEXT_PUBLIC_SOLANA_RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

Use `useWallet()` and `useConnection()` from `@solana/wallet-adapter-react` inside features. **Never** read `window.solana` directly.

---

## State Machine

Every multi-step flow uses a discriminated state union, **not** scattered booleans.

```ts
// src/features/register/use-register-video-flow.ts
type RegisterState =
  | { kind: "idle" }
  | { kind: "file_selected"; file: File }
  | { kind: "fingerprinting"; file: File }
  | { kind: "uploading_to_ipfs"; file: File; fingerprint: Fingerprint }
  | { kind: "ready_to_sign"; file: File; fingerprint: Fingerprint; cid: string }
  | { kind: "waiting_for_signature"; ... }
  | { kind: "confirming_on_chain"; signature: string }
  | { kind: "indexing_on_backend"; signature: string }
  | { kind: "success"; proof: Proof }
  | { kind: "error"; message: string; recoverable: boolean };
```

Renders use exhaustive `switch (state.kind)` — TypeScript will yell if you miss a case.

---

## API Client

`src/lib/api-client.ts` is the **only** place the frontend calls `/api/*`. It must:

1. Validate every response with the Zod schema from `@/shared/schemas`.
2. Return typed data or throw `ApiError`.
3. Forward `requestId` from response headers to logs/Sentry.
4. Switch to `demo-data` if `NEXT_PUBLIC_USE_MOCK_API === "true"`.

```ts
import { proofSchema, verificationResultSchema } from "@/shared/schemas";
import { env } from "@/lib/env";
import * as mock from "@/lib/demo-data";

export const apiClient = {
  async registerProof(input: RegisterProofInput): Promise<Proof> {
    if (env.NEXT_PUBLIC_USE_MOCK_API) return mock.registerProof(input);
    const res = await fetch("/api/proofs", { method: "POST", body: JSON.stringify(input) });
    const json = await res.json();
    if (!json.success) throw new ApiError(json.error.code, json.error.message);
    return proofSchema.parse(json.data);
  },
  // ...
};
```

---

## UI Conventions

### Copy

✅ Use:

```text
Register Video       Check Original       Video Fingerprint     Proof Certificate
Registered on Solana Likely Match Found   Possible Match        No Registered Origin Found
```

❌ Avoid:

```text
Mint NFT             Buy Token            Legal Notary          Guaranteed Copyright
Smart Contract       Web3                 Decentralized App     Crypto
```

### Visual

- One brand color (e.g. `#5B3DF5` Solana-adjacent purple), neutral greys, semantic states.
- 8-pt spacing scale via Tailwind.
- Use `lucide-react` for icons; never inline SVG more than once.
- Buttons: primary (filled), secondary (outline), ghost (text). All ≥ 44 px tap target on mobile.
- Empty states: illustration or icon + one-line explanation + primary CTA.
- Loading: shimmer or skeleton — never spinners > 800 ms without text feedback.

### Forms

- React Hook Form + Zod resolver for any form > 2 fields.
- Inline validation, never submit-time alerts.
- Disable submit until valid; show why next to disabled button.

### Accessibility

- All interactive elements reachable by keyboard.
- `aria-live="polite"` on the state announcement region during register/verify flows.
- Color contrast ≥ AA (use Tailwind `text-zinc-900 dark:text-zinc-50`, etc.).

---

## Mock vs Real Modes

The frontend ships with two flags so any teammate can develop without backend or chain:

| Flag | Default | Effect when `true` |
|---|---|---|
| `NEXT_PUBLIC_USE_MOCK_API` | `false` | `apiClient` returns `demo-data.ts` fixtures with simulated latency. |
| `NEXT_PUBLIC_USE_MOCK_CHAIN` | `false` | `blockchain-adapter` returns a fake `signature` and explorer URL. |

**Demo-day rule:** flags must be `false` on the production Vercel deployment. CI fails the build if `NEXT_PUBLIC_USE_MOCK_*=true` is detected in the production env.

---

## Testing

See **[TESTING.md](../TESTING.md)** for the full guide. Frontend-specific:

- **Unit (Vitest + Testing Library):** test `lib/`, `features/*` hooks, and pure components.
- **E2E (Playwright):** `tests/e2e/*.spec.ts` against `pnpm build && pnpm start` with `NEXT_PUBLIC_USE_MOCK_*=true`.
- **Wallet mocking:** for e2e, inject a fake wallet via Playwright `addInitScript` that auto-approves `signTransaction`.

Quick:

```bash
pnpm test              # vitest
pnpm test:e2e          # playwright
pnpm test:e2e --ui     # playwright debugger
```

---

## Performance & Accessibility

- Lighthouse score target: **Performance ≥ 90, Accessibility ≥ 95** on `/` and `/certificate/[id]`.
- Lazy-import `blockhash-js` and Solana adapters: `const phash = (await import("blockhash-js")).default`.
- Use `next/image` for all images; certificate OG image is generated dynamically.
- No client-side rendering of certificate proof data — SSR for crawler + share preview.
- Bundle budget: gzipped JS for `/` ≤ 150 kB.

---

## Success Criteria

- [ ] Non-crypto user can register a video without reading any docs.
- [ ] Demo can be performed in under 3 minutes on a stage laptop.
- [ ] All loading, error, success states are explicit and on-screen.
- [ ] Certificate page is server-rendered, share-ready, and works without JS.
- [ ] `pnpm typecheck && pnpm lint` clean.
- [ ] Vitest unit + Playwright e2e green in CI.
- [ ] Lighthouse Performance ≥ 90 on `/` and `/certificate/[id]`.
- [ ] Lives at the production Vercel URL with mock flags `false`.
