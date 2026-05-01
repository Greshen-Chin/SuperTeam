# Frontend Instructions

The frontend goal: **make VidChain feel like a normal creator tool, not a crypto app.** The wallet step should feel like a one-tap social login, the certificate page like an Instagram screenshot, the verifier like a Shazam for stolen video.

> Stack reference: Next.js 15 App Router · React 19 · TypeScript (strict) · Tailwind CSS 3 · **Web3Auth (social login → embedded Solana wallet)** + Solana Wallet Adapter (Phantom/Solflare for power users) · Web Crypto API · Canvas + blockhash-js.

---

## Table of Contents

1. [Responsibilities](#responsibilities)
2. [Setup](#setup)
3. [Folder Structure](#folder-structure)
4. [Routing & Pages](#routing--pages)
5. [Wallet & Auth Integration (Web3Auth + Phantom)](#wallet--auth-integration-web3auth--phantom)
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
npm install
cp .env.example .env.local
npm run dev                        # http://localhost:3000
```

`.env.local` minimum to boot in mock mode:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=                # see "Wallet & Auth Integration" below
NEXT_PUBLIC_WEB3AUTH_NETWORK=sapphire_devnet
NEXT_PUBLIC_USE_MOCK_API=true
NEXT_PUBLIC_USE_MOCK_CHAIN=true
```

### Required dependencies (already in `package.json` or to add)

```bash
# Already installed
next react react-dom typescript tailwindcss zod clsx lucide-react tailwind-merge

# Add for real Solana integration
npm install @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui \
            @solana/wallet-adapter-base @solana/wallet-adapter-wallets \
            @coral-xyz/anchor @metaplex-foundation/mpl-token-metadata bs58

# Add for Web3Auth (social login → embedded Solana wallet)
npm install @web3auth/modal @web3auth/base @web3auth/solana-provider @web3auth/auth-adapter

# Add for fingerprinting
npm install blockhash-js

# Add for IPFS
npm install nft.storage          # or "@pinata/sdk" if using Pinata

# Add for testing
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
npm install --save-dev @playwright/test

# Optional: better forms + state
npm install react-hook-form @hookform/resolvers
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
│   │       ├── fingerprints/route.ts
│   │       └── airdrop/route.ts          # devnet auto-funding for new Web3Auth wallets
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
│   │   ├── proof/                        # confidence-meter, proof-status-badge
│   │   ├── auth/sign-in-tabs.tsx         # Google / Email / Phantom tabs
│   │   └── providers/                    # client-only context providers
│   │       ├── vidchain-providers.tsx    # composes Connection + Wallet + Web3Auth
│   │       └── web3auth-provider.tsx     # Web3Auth context
│   │
│   ├── lib/                              # framework-agnostic helpers (CLIENT-safe)
│   │   ├── api-client.ts                 # ONE place that hits /api/*
│   │   ├── fingerprint-client.ts         # delegates to fingerprinting/ pkg
│   │   ├── blockchain-adapter.ts         # delegates to @/server/solana on server, client on browser
│   │   ├── use-vidchain-wallet.ts        # unified wallet hook (Web3Auth + adapter)
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

## Wallet & Auth Integration (Web3Auth + Phantom)

VidChain supports **two onboarding paths** so a TikTok creator who has never heard of crypto can register a video in 30 seconds, while a Solana power user can still bring their existing Phantom wallet.

```text
┌──────────────────────────────────────────────────────────────────┐
│            "Sign in to register your video"                      │
│                                                                  │
│   ┌────────────────────────────┐    ┌────────────────────────┐   │
│   │  Continue with Google      │    │  Connect Phantom       │   │
│   │  Continue with Email       │    │  Connect Solflare      │   │
│   │  Continue with Apple       │    └────────────────────────┘   │
│   └────────────────────────────┘                                 │
│           ↓ Web3Auth                            ↓ Wallet Adapter │
│      embedded MPC wallet                    user's existing key  │
│                                                                  │
│   Both paths produce the same `useVidchainWallet()` API:         │
│   { publicKey, signTransaction, signMessage, connection }        │
└──────────────────────────────────────────────────────────────────┘
```

The default tab is **social login** because most Indonesian creators don't have a wallet. The wallet path is one tab over for crypto-native users.

### Why Web3Auth

- Removes the #1 onboarding cliff: "install a wallet, save 12 words, fund it with SOL".
- Non-custodial via MPC — the user's key is split across Web3Auth's network and the user's social-login share. Web3Auth alone cannot sign.
- Users get a real Solana keypair they can later **export** (Settings → Export Private Key) and import into Phantom if they decide they want self-custody.
- Free tier (Sapphire Devnet) is unlimited; paid tier (Sapphire Mainnet) starts at ~$69/mo and is needed only post-hackathon when going to mainnet.

### One-time setup

1. Create a project at https://dashboard.web3auth.io.
2. Pick **Plug and Play → Solana → Devnet (Sapphire Devnet)**.
3. Add `http://localhost:3000` and your Vercel preview/production URLs to **Whitelist Domains**.
4. Copy the **Client ID** → `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID` in `.env.local` (and Vercel envs).
5. Optional but recommended: in **Custom Authentication**, register your own Google OAuth Client ID so the consent screen shows "VidChain" instead of "Web3Auth Demo".

### Provider tree

`Web3AuthProvider` wraps the app **outside** the Solana `ConnectionProvider`, because Web3Auth is one of the wallet sources `ConnectionProvider` needs to know about.

```tsx
// src/app/layout.tsx
import { VidchainProviders } from "@/components/providers/vidchain-providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <VidchainProviders>{children}</VidchainProviders>
      </body>
    </html>
  );
}
```

```tsx
// src/components/providers/vidchain-providers.tsx
"use client";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { useMemo } from "react";
import { Web3AuthProvider } from "./web3auth-provider";
import { env } from "@/lib/env";

export function VidchainProviders({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={env.NEXT_PUBLIC_SOLANA_RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <Web3AuthProvider>{children}</Web3AuthProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

### Web3Auth provider

```tsx
// src/components/providers/web3auth-provider.tsx
"use client";
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK, type IProvider } from "@web3auth/base";
import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";
import { AuthAdapter } from "@web3auth/auth-adapter";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { env } from "@/lib/env";

type Ctx = {
  web3auth: Web3Auth | null;
  provider: IProvider | null;
  ready: boolean;
};
const Web3AuthCtx = createContext<Ctx>({ web3auth: null, provider: null, ready: false });
export const useWeb3Auth = () => useContext(Web3AuthCtx);

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.SOLANA,
  // Solana Devnet chain ID (per Web3Auth docs); use "0x65" for mainnet, "0x66" for testnet, "0x67" for devnet
  chainId: "0x67",
  rpcTarget: env.NEXT_PUBLIC_SOLANA_RPC_URL,
  displayName: "Solana Devnet",
  blockExplorerUrl: "https://explorer.solana.com?cluster=devnet",
  ticker: "SOL",
  tickerName: "Solana",
};

export function Web3AuthProvider({ children }: { children: React.ReactNode }) {
  const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const privateKeyProvider = new SolanaPrivateKeyProvider({ config: { chainConfig } });
      const w3a = new Web3Auth({
        clientId: env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID,
        web3AuthNetwork:
          env.NEXT_PUBLIC_WEB3AUTH_NETWORK === "sapphire_mainnet"
            ? WEB3AUTH_NETWORK.SAPPHIRE_MAINNET
            : WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
        privateKeyProvider,
        uiConfig: {
          appName: "VidChain",
          mode: "auto",                       // light/dark follows system
          loginMethodsOrder: ["google", "email_passwordless", "apple", "discord"],
          defaultLanguage: "en",
        },
      });
      w3a.configureAdapter(new AuthAdapter({ adapterSettings: { uxMode: "popup" } }));
      await w3a.initModal();
      setWeb3auth(w3a);
      setProvider(w3a.provider);
      setReady(true);
    })();
  }, []);

  return (
    <Web3AuthCtx.Provider value={useMemo(() => ({ web3auth, provider, ready }), [web3auth, provider, ready])}>
      {children}
    </Web3AuthCtx.Provider>
  );
}
```

### Unified hook — `useVidchainWallet`

This is the **only** wallet API the rest of the app uses. It transparently picks Web3Auth or `@solana/wallet-adapter-react` depending on which path the user took.

```ts
// src/lib/use-vidchain-wallet.ts
"use client";
import { useConnection, useWallet as useAdapterWallet } from "@solana/wallet-adapter-react";
import { PublicKey, type Transaction, type VersionedTransaction } from "@solana/web3.js";
import { SolanaWallet } from "@web3auth/solana-provider";
import { useEffect, useMemo, useState } from "react";
import { useWeb3Auth } from "@/components/providers/web3auth-provider";

export type VidchainWallet = {
  publicKey: PublicKey | null;
  source: "web3auth" | "adapter" | null;
  connected: boolean;
  connecting: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: () => Promise<void>;            // shows the Web3Auth modal email tab
  connectAdapterWallet: () => Promise<void>;      // opens the standard wallet modal
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>;
  disconnect: () => Promise<void>;
};

export function useVidchainWallet(): VidchainWallet {
  const { web3auth, provider, ready } = useWeb3Auth();
  const adapter = useAdapterWallet();
  const { connection } = useConnection();
  const [w3aPubkey, setW3aPubkey] = useState<PublicKey | null>(null);

  useEffect(() => {
    (async () => {
      if (!provider || !web3auth?.connected) { setW3aPubkey(null); return; }
      const sw = new SolanaWallet(provider);
      const [account] = await sw.requestAccounts();
      setW3aPubkey(new PublicKey(account));
    })();
  }, [provider, web3auth?.connected]);

  const source: VidchainWallet["source"] = w3aPubkey ? "web3auth" : adapter.publicKey ? "adapter" : null;
  const publicKey = w3aPubkey ?? adapter.publicKey ?? null;

  return useMemo<VidchainWallet>(() => ({
    publicKey,
    source,
    connected: Boolean(publicKey),
    connecting: !ready || adapter.connecting,

    async loginWithGoogle() {
      if (!web3auth) throw new Error("web3auth not ready");
      await web3auth.connectTo("auth", { loginProvider: "google" });
    },
    async loginWithEmail() {
      if (!web3auth) throw new Error("web3auth not ready");
      await web3auth.connect();   // opens the modal; user picks email_passwordless
    },
    async connectAdapterWallet() {
      // Triggered by the WalletMultiButton from @solana/wallet-adapter-react-ui
      // No imperative call needed — the Wallet Modal handles selection + connect.
    },
    async signTransaction(tx) {
      if (source === "web3auth" && provider) {
        const sw = new SolanaWallet(provider);
        return (await sw.signTransaction(tx as any)) as typeof tx;
      }
      if (source === "adapter" && adapter.signTransaction) {
        return adapter.signTransaction(tx);
      }
      throw new Error("no wallet connected");
    },
    async signMessage(msg) {
      if (source === "web3auth" && provider) {
        const sw = new SolanaWallet(provider);
        return await sw.signMessage(msg);
      }
      if (source === "adapter" && adapter.signMessage) {
        return adapter.signMessage(msg);
      }
      throw new Error("no wallet connected");
    },
    async disconnect() {
      if (source === "web3auth" && web3auth) await web3auth.logout();
      if (source === "adapter") await adapter.disconnect();
    },
  }), [publicKey, source, ready, web3auth, provider, adapter]);
}
```

Usage from a feature hook:

```ts
// src/features/register/use-register-video-flow.ts (excerpt)
const wallet = useVidchainWallet();

if (!wallet.connected) {
  // show <SignInTabs /> with Google / Email / Phantom options
  return;
}

const tx = await registerProofTx(program, wallet.publicKey!, sha256, fingerprintRoot, metadataUri);
const signed = await wallet.signTransaction(tx);
const sig = await connection.sendRawTransaction(signed.serialize());
```

### `<SignInTabs />` UI

```tsx
// src/components/auth/sign-in-tabs.tsx
"use client";
import { useVidchainWallet } from "@/lib/use-vidchain-wallet";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function SignInTabs() {
  const { loginWithGoogle, loginWithEmail, connecting } = useVidchainWallet();
  return (
    <div className="space-y-4 max-w-sm mx-auto">
      <button
        data-testid="signin-google"
        disabled={connecting}
        onClick={loginWithGoogle}
        className="w-full h-12 rounded-xl border bg-white text-zinc-900 hover:bg-zinc-50">
        Continue with Google
      </button>
      <button
        data-testid="signin-email"
        disabled={connecting}
        onClick={loginWithEmail}
        className="w-full h-12 rounded-xl border bg-white text-zinc-900 hover:bg-zinc-50">
        Continue with Email
      </button>
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <div className="h-px flex-1 bg-zinc-200" /> already have a wallet? <div className="h-px flex-1 bg-zinc-200" />
      </div>
      <WalletMultiButton data-testid="signin-wallet" className="!w-full !h-12 !rounded-xl !bg-zinc-900" />
    </div>
  );
}
```

Place `<SignInTabs />` on `/register` and `/dashboard` (any wallet-gated page) when `wallet.connected === false`.

### Auto-airdrop for new Web3Auth users (Devnet only)

A brand-new Web3Auth wallet has 0 SOL. The `register_proof` instruction needs ~0.002 SOL for PDA rent. On Devnet, request an airdrop the first time we see a wallet with zero balance:

```ts
// src/server/airdrop.ts (called by /api/airdrop)
import { Connection, PublicKey } from "@solana/web3.js";
import { env } from "@/lib/env";

export async function maybeAirdrop(walletBase58: string) {
  if (env.NEXT_PUBLIC_SOLANA_CLUSTER !== "devnet") return;     // mainnet uses fee-payer pattern, see below
  const conn = new Connection(env.NEXT_PUBLIC_SOLANA_RPC_URL, "confirmed");
  const pk = new PublicKey(walletBase58);
  const lamports = await conn.getBalance(pk);
  if (lamports >= 5_000_000) return;                            // already has 0.005+ SOL, nothing to do
  const sig = await conn.requestAirdrop(pk, 50_000_000);        // 0.05 SOL
  await conn.confirmTransaction(sig, "confirmed");
}
```

```ts
// src/app/api/airdrop/route.ts
import { ok, fail } from "@/server/api-helpers";
import { maybeAirdrop } from "@/server/airdrop";
import { z } from "zod";

const body = z.object({ wallet: z.string().min(32).max(44) });

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { wallet } = body.parse(await req.json());
    await maybeAirdrop(wallet);
    return ok({ funded: true }, requestId);
  } catch {
    return fail("INTERNAL", "airdrop failed", requestId);
  }
}
```

The frontend calls this **once**, immediately after a successful Web3Auth login, and silently retries before the first `signTransaction`. UI never mentions "airdrop" or "SOL" — the user just sees a normal "Preparing your wallet…" splash.

> **Mainnet:** drop the airdrop, switch to a **fee-payer** pattern: server signs as fee payer, user signs as authority, both signatures combine into one tx. Document this when planning the mainnet cutover; do **not** ship custodial signing.

### Hard rules

- The rest of the app **never** imports `@web3auth/*` or `@solana/wallet-adapter-react` directly. Always go through `useVidchainWallet()`. This keeps the swap painless and the UI consistent.
- Never store the user's email, OAuth ID, or social profile data on our backend. The wallet public key is the only identifier we persist.
- Never call `web3auth.provider.request({ method: "solanaPrivateKey" })` — it returns the raw key. There is no reason to ever read it from app code.
- Never fall back to a server-signed "demo wallet" in production. Mock paths are dev-only and gated behind `NEXT_PUBLIC_USE_MOCK_CHAIN=true`.

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
- **E2E (Playwright):** `tests/e2e/*.spec.ts` against `npm run build && npm start` with `NEXT_PUBLIC_USE_MOCK_*=true`.
- **Wallet mocking:** for e2e, inject a fake wallet via Playwright `addInitScript` that auto-approves `signTransaction`.

Quick:

```bash
npm test                  # vitest
npm run test:e2e          # playwright
npm run test:e2e -- --ui  # playwright debugger
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
- [ ] `npm run typecheck && npm run lint` clean.
- [ ] Vitest unit + Playwright e2e green in CI.
- [ ] Lighthouse Performance ≥ 90 on `/` and `/certificate/[id]`.
- [ ] Lives at the production Vercel URL with mock flags `false`.
