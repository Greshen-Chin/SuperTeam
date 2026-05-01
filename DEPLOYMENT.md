# VidChain Deployment Guide

Deploy VidChain in three independent steps:

1. **Frontend + API** → Vercel (Next.js).
2. **Anchor program** → Solana Devnet (mainnet later).
3. **Database** → Supabase (managed PostgreSQL).
4. **IPFS pinning** → NFT.Storage (free) or Pinata (production).
5. **Auth / embedded wallet** → Web3Auth Sapphire Devnet (free).
6. **Bot** (stretch) → Fly.io.

Every deploy is reversible — Vercel has instant rollback, Anchor programs can be redeployed (with the upgrade authority), Supabase has point-in-time-recovery on the paid tier.

---

## Table of Contents

1. [Pre-flight Checklist](#pre-flight-checklist)
2. [Vercel — Frontend & API](#vercel--frontend--api)
3. [Supabase — Database](#supabase--database)
4. [IPFS — NFT.Storage / Pinata](#ipfs--nftstorage--pinata)
5. [Web3Auth — Social Login](#web3auth--social-login)
6. [Solana — Anchor Program](#solana--anchor-program)
7. [Bot — Fly.io](#bot--flyio)
7. [Custom Domain](#custom-domain)
8. [Environment Variable Matrix](#environment-variable-matrix)
9. [Post-Deploy Smoke Test](#post-deploy-smoke-test)
10. [Rollback](#rollback)
11. [Cost Summary](#cost-summary)
12. [Mainnet Cutover (Post-Hackathon)](#mainnet-cutover-post-hackathon)

---

## Pre-flight Checklist

Before any deploy:

- [ ] `npm run lint && npm run typecheck && npm test && npm run test:e2e` green locally.
- [ ] All env keys exist in `.env.example` files.
- [ ] No real secrets in git: `git ls-files | grep -E "\.env\.(local|production)$"` returns nothing.
- [ ] Anchor program deployed and IDL committed under `blockchain/clients/ts/idl/`.
- [ ] `frontend/fixtures/demo/*.mp4` committed and < 5 MB each.
- [ ] `NEXT_PUBLIC_USE_MOCK_*` flags set to `false` in Vercel production env.
- [ ] Web3Auth project created, Client ID set in Vercel env, all production + preview domains whitelisted in the Web3Auth dashboard.

---

## Vercel — Frontend & API

### One-time setup

1. Create Vercel account + install CLI:
   ```bash
   npm install -g vercel
   vercel login
   ```
2. From `frontend/` directory:
   ```bash
   cd frontend
   vercel link             # connect to a Vercel project (create new or link existing)
   ```
   Select scope, accept defaults except:
   - **Directory** = `./` (you're already in `frontend/`)
   - **Framework** = Next.js (auto-detected)
   - **Build Command** = `npm run build` (auto-detected)
3. Configure root if monorepo: in Vercel dashboard → Settings → General → **Root Directory** = `frontend`.

### Environment variables

In **Vercel Dashboard → Settings → Environment Variables**, add the keys from [`frontend/.env.example`](frontend/.env.example) for **three** environments:

| Scope | Use |
|---|---|
| **Production** | The `main`-branch deployment served at vidchain.app |
| **Preview** | Every PR — perfect for showing judges work-in-progress |
| **Development** | Pulled by `vercel env pull` for `vercel dev` |

| Key | Production value | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://vidchain.app` | Used for absolute URLs in OG tags |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `devnet` | `mainnet-beta` after cutover |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | `https://api.devnet.solana.com` (or a paid RPC like Helius) |
| `NEXT_PUBLIC_VIDCHAIN_PROGRAM_ID` | (from `anchor deploy` output) |
| `NEXT_PUBLIC_USE_MOCK_API` | `false` | **Must be false in prod** |
| `NEXT_PUBLIC_USE_MOCK_CHAIN` | `false` | **Must be false in prod** |
| `DATABASE_URL` | Supabase pooled connection string | server-only |
| `SUPABASE_SERVICE_ROLE_KEY` | (from Supabase dashboard) | server-only |
| `NFT_STORAGE_API_KEY` | (from nft.storage account) | server-only |
| `SOLANA_FEE_PAYER_SECRET` | base58-encoded private key for the demo path (devnet only — never put a real keypair here) | server-only |
| `SENTRY_DSN` | (optional) | server-only |
| `LOG_LEVEL` | `info` | server-only |

> Mark `NEXT_PUBLIC_*` keys as exposed-to-browser (Vercel UI shows the prefix is whitelisted). Mark all others as server-only.

### Deploy

```bash
# preview (for PR-style review)
vercel

# production (only run from the main branch after merge)
vercel --prod
```

Vercel's GitHub integration deploys automatically:

- Push to `main` → production.
- Open a PR → preview URL posted to the PR.

### Build settings (defaults are fine)

- **Build command**: `npm run build`
- **Install command**: `npm ci`
- **Output directory**: `.next` (Next.js default)
- **Node.js version**: 20.x

### Project-level rules

- Enable **Build Logs** retention (free).
- Enable **Speed Insights** + **Web Analytics** (free).
- Add the GitHub Actions workflow status checks as **required** before merge in repo settings.

---

## Supabase — Database

### Create a project

1. https://supabase.com/dashboard → **New Project**.
2. Region: pick closest to your Vercel region (e.g. **ap-southeast-1 Singapore** for Indonesia traffic).
3. Pick a strong DB password — store it in a password manager.
4. Wait ~2 minutes for provisioning.

### Get connection string

**Settings → Database → Connection string → URI (pooled, port 6543)** — use this for serverless. It looks like:

```
postgresql://postgres.<project-ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

Set this as `DATABASE_URL` in Vercel.

### Run migrations

```bash
cd frontend
npx prisma migrate deploy              # applies prisma/migrations/* to the linked DB
```

For local development against a hosted DB, use the **direct** connection string (port 5432) for `prisma migrate dev` and the **pooled** one for runtime.

### RLS (Row Level Security)

Even though our API does the authorization (Anchor proves wallet ownership), enable RLS on every table as a defense-in-depth:

```sql
alter table "Proof"        enable row level security;
alter table "Verification" enable row level security;

-- public read for proofs (certificate page is public)
create policy "public read proofs"
  on "Proof" for select
  using (true);

-- writes only via service role (server-side)
create policy "service writes only"
  on "Proof" for insert
  to service_role using (true) with check (true);
```

### Backups

Free tier: daily automated backups, 7-day retention. No action needed for hackathon. Post-launch, enable point-in-time recovery (paid).

---

## IPFS — NFT.Storage / Pinata

### NFT.Storage (recommended for hackathon)

1. https://nft.storage → sign in (GitHub or email).
2. **API Keys → New Key** → copy the JWT.
3. Set `NFT_STORAGE_API_KEY` in Vercel.

Free tier: unlimited storage for NFT data (videos under 100 MB in our case).

### Pinata (alternative)

1. https://pinata.cloud → create account.
2. **API Keys → New Key** → admin scope.
3. Set `PINATA_JWT` in Vercel.
4. In `src/server/ipfs.ts`, add a `PINATA_JWT ? pinata : nftStorage` switch.

### Server-side upload helper

```ts
// frontend/src/server/ipfs.ts
import { NFTStorage, File } from "nft.storage";
import { env } from "@/lib/env";
const client = new NFTStorage({ token: env.NFT_STORAGE_API_KEY });

export async function uploadVideoToIpfs(buffer: Buffer, mime: string): Promise<string> {
  const cid = await client.storeBlob(new Blob([buffer], { type: mime }));
  return `ipfs://${cid}`;
}
```

The browser usually uploads directly with a **scoped** token, but for security, route uploads through `/api/upload` so the long-lived token never touches the client.

---

## Web3Auth — Social Login

### Create the project

1. https://dashboard.web3auth.io → **Sign in** (Google works) → **New Project**.
2. **Environment** = `Sapphire Devnet` (free, unlimited MAU). Switch to `Sapphire Mainnet` only when going to Solana mainnet (paid plan ~$69/mo at the time of writing).
3. **Product** = `Plug and Play`.
4. **Chain** = `Solana`.
5. Copy the **Client ID**.

### Whitelist domains

Web3Auth blocks unknown origins. In **Project Settings → Whitelist Domains**, add every URL the modal will load on:

- `http://localhost:3000`
- Your Vercel **preview** wildcard, e.g. `https://*.vercel.app` (or each PR preview URL individually if wildcards are not allowed in your plan)
- Your Vercel **production** URL: `https://vidchain.app`

A missing whitelist entry shows the user a generic "Could not load login" — easy to miss in QA.

### Set the env var

In Vercel:

| Key | Production | Preview | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID` | (from dashboard) | (same) | Public; safe to send to the browser. |
| `NEXT_PUBLIC_WEB3AUTH_NETWORK` | `sapphire_devnet` | `sapphire_devnet` | Switch both to `sapphire_mainnet` at mainnet cutover. |

### Custom OAuth (recommended before launch — optional for hackathon)

By default the Google consent screen says **"Web3Auth Demo"**. To rebrand:

1. https://console.cloud.google.com → create OAuth 2.0 Client ID with redirect URI `https://auth.web3auth.io/auth`.
2. Web3Auth Dashboard → **Custom Authentication → Add Verifier** → paste the Google Client ID.
3. Pass `verifier: "<your-verifier-name>"` to `connectTo("auth", { ... })` in code.

### Cost

| Tier | Cost | When to use |
|---|---|---|
| Sapphire Devnet | **$0**, unlimited MAU | Hackathon, all dev/preview environments |
| Sapphire Mainnet (Free) | **$0** up to 1,000 MAU | First weeks of mainnet launch |
| Sapphire Mainnet (Growth) | ~$69/mo | After crossing 1,000 MAU |

> The Web3Auth network does not store funds; it stores **key shares** for MPC. Switching from devnet to mainnet does not migrate users automatically — they re-login and Web3Auth re-derives the same wallet from their social provider.

---

## Solana — Anchor Program

### First deploy to Devnet

```bash
cd blockchain
solana config set --url https://api.devnet.solana.com
solana airdrop 2

anchor build
anchor keys list                              # prints program ID
# Open programs/vidchain/src/lib.rs — replace declare_id!("...") with the printed ID
# Open Anchor.toml — replace [programs.devnet] vidchain = "..."
anchor build                                  # rebuild with correct ID baked in
anchor deploy --provider.cluster devnet
```

Outputs a deployed program ID. Update:

- `frontend/.env.production` (Vercel UI) → `NEXT_PUBLIC_VIDCHAIN_PROGRAM_ID`
- `blockchain/clients/ts/idl/vidchain.json` (commit the IDL produced under `target/idl/`)
- `blockchain/clients/ts/idl/vidchain.ts` (commit the types produced under `target/types/`)

### Subsequent deploys (program upgrade)

The deployer keypair is the **upgrade authority**. To push a new version:

```bash
anchor build && anchor deploy --provider.cluster devnet
```

Account schema changes need a migration plan. For the hackathon: drop the old PDAs (Devnet only), redeploy, re-register.

### Mainnet (post-hackathon)

Mainnet deploys require **real SOL** (~2 SOL for first program deploy). See [Mainnet Cutover](#mainnet-cutover-post-hackathon).

---

## Bot — Fly.io

(Skip if you are not shipping the bot for the hackathon.)

```bash
brew install flyctl
fly auth login

cd bot
fly launch                       # generates fly.toml
fly secrets set TELEGRAM_BOT_TOKEN=xxxx BACKEND_API_URL=https://vidchain.app/api
fly deploy
```

Set the Telegram webhook to your Fly URL:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://vidchain-bot.fly.dev/webhook"
```

---

## Custom Domain

1. Buy a domain (Namecheap, Cloudflare, Porkbun).
2. Vercel Dashboard → **Domains → Add** → enter `vidchain.app`.
3. Follow DNS instructions:
   - **Cloudflare-managed**: add the `A` and `CNAME` records Vercel provides, set proxy to **DNS only** (gray cloud) for cert issuance, then turn proxy back on.
   - **Other**: just add the records as shown.
4. Wait for cert (≤ 5 min). HTTPS is automatic.
5. Update `NEXT_PUBLIC_APP_URL=https://vidchain.app` in Vercel and redeploy.

For preview URLs, Vercel uses `*.vercel.app` (free).

---

## Environment Variable Matrix

| Key | local | preview | production | mainnet | exposed to browser? |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://...vercel.app` | `https://vidchain.app` | same | ✅ |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `devnet` | `devnet` | `devnet` | `mainnet-beta` | ✅ |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | `https://api.devnet.solana.com` | same | same | Helius/Triton paid RPC | ✅ |
| `NEXT_PUBLIC_VIDCHAIN_PROGRAM_ID` | (devnet ID) | (devnet ID) | (devnet ID) | (mainnet ID) | ✅ |
| `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID` | dev project | dev project | prod project | prod project | ✅ |
| `NEXT_PUBLIC_WEB3AUTH_NETWORK` | `sapphire_devnet` | `sapphire_devnet` | `sapphire_devnet` | `sapphire_mainnet` | ✅ |
| `NEXT_PUBLIC_USE_MOCK_API` | `true` | `false` | `false` | `false` | ✅ |
| `NEXT_PUBLIC_USE_MOCK_CHAIN` | `true` | `false` | `false` | `false` | ✅ |
| `DATABASE_URL` | local Postgres | preview branch DB | prod Supabase | same | ❌ |
| `SUPABASE_SERVICE_ROLE_KEY` | from `supabase status` | from project | from project | from project | ❌ |
| `NFT_STORAGE_API_KEY` | personal | shared dev | prod | prod | ❌ |
| `SOLANA_FEE_PAYER_SECRET` | local devnet keypair | demo devnet keypair | demo devnet keypair | **never** — users pay | ❌ |
| `SENTRY_DSN` | empty | dev project | prod project | prod project | ❌ |
| `LOG_LEVEL` | `debug` | `info` | `info` | `info` | ❌ |

CI failsafe: in `frontend/src/lib/env.ts`, `throw` if `NEXT_PUBLIC_USE_MOCK_API === "true"` while `NEXT_PUBLIC_APP_URL` includes `vidchain.app`.

---

## Post-Deploy Smoke Test

Run this from a fresh browser (no cookies) immediately after every production deploy:

1. Open `https://vidchain.app` → home loads, two CTAs visible.
2. Click **Register Video** → sign-in tabs render with **Continue with Google** + **Continue with Email** + **Connect Phantom**.
3. Tap **Continue with Google** → Web3Auth modal → Google consent → returns to app with wallet ready (devnet airdrop runs silently).
4. Upload `original.mp4` → fingerprint progress bar fills, title input appears.
5. Submit → Web3Auth signs silently in popup (or Phantom prompt if user took the wallet path).
6. Wait ≤ 5 s → certificate page loads.
7. Click the Solana Explorer link → opens Devnet Explorer with the tx confirmed.
8. Open `/verify` in a new tab → upload `original-reencoded.mp4` → "Likely Match Found" with confidence ≥ 0.85.
9. Upload `unrelated.mp4` → "No Registered Origin Found".
10. Open the certificate URL on a phone (or Chrome mobile emulation) → renders, share button works.
11. Paste the certificate URL into Slack/Discord → OG preview shows title + image.

If any step fails, [rollback](#rollback) and investigate.

A quick scripted version (Playwright against production):

```bash
PLAYWRIGHT_BASE_URL=https://vidchain.app npm run test:e2e -- tests/e2e/smoke.spec.ts
```

---

## Rollback

### Vercel

- Dashboard → **Deployments** → pick the last green deployment → **Promote to Production**.
- Instant; no rebuild.

### Anchor (Devnet)

- Redeploy the previous build artifact:
  ```bash
  anchor deploy --provider.cluster devnet --program-name vidchain --program-keypair target/deploy/vidchain-keypair.json
  ```
- For state issues, drop and recreate PDAs (devnet is throwaway).

### Supabase

- Migrations are forward-only by default; for hackathon, write a manual `down` SQL script and apply via SQL editor.
- For data loss, restore from the latest daily backup.

---

## Cost Summary

| Component | Hackathon (Devnet) | Production (Mainnet, low scale) |
|---|---|---|
| Vercel | $0 (Hobby) | $0 → $20/mo (Pro) when team or build minutes exceed Hobby |
| Supabase | $0 (Free) | $0 → $25/mo (Pro) for backups + better quotas |
| Web3Auth | $0 (Sapphire Devnet, unlimited MAU) | $0 up to 1,000 MAU on Sapphire Mainnet → ~$69/mo Growth tier |
| NFT.Storage | $0 | $0 |
| Solana RPC (Devnet public) | $0 | n/a |
| Solana RPC (Mainnet, Helius free) | n/a | $0 → $49/mo |
| Solana program deploy | 0 SOL (Devnet airdrop) | ~2 SOL one-time + ~0.001 SOL per upgrade |
| Solana per-tx | 0 SOL | ~0.000005 SOL = $0.0008 at $150 SOL |
| Domain | n/a | ~$12/year |
| Fly.io bot (stretch) | $0 | $0 (free shared CPU) → $5/mo |
| **Total** | **$0** | **~$50/mo + $12/year** |

---

## Mainnet Cutover (Post-Hackathon)

Do not attempt during the hackathon. Plan after judging:

1. **Audit** the Anchor program (Sec3, Ottersec, or community review).
2. Generate a **fresh deploy keypair**, fund with ~2 SOL.
3. `solana config set --url https://api.mainnet-beta.solana.com && anchor deploy --provider.cluster mainnet`.
4. **Transfer upgrade authority** to a Squads/Realms multisig.
5. Update `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta` and `NEXT_PUBLIC_SOLANA_RPC_URL` to a paid RPC (Helius / Triton).
6. Update `NEXT_PUBLIC_VIDCHAIN_PROGRAM_ID` to the mainnet ID.
7. Run the **post-deploy smoke test** against mainnet with a real wallet.
8. Announce.

---

**Bottom line:** `vercel --prod` after a green CI is the entire deploy. Everything else is one-time setup.
