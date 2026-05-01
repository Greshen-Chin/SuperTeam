# Manual Setup Guide

Things the code cannot do for you — external accounts, dashboards, and credentials you must create by hand.

---

## Overview

| Service | Why you need it | Free? | Time |
|---|---|---|---|
| **Supabase** | PostgreSQL database — stores proofs + auth users | ✅ Free tier | ~5 min |
| **Web3Auth** | Social login (Google/email) → embedded Solana wallet | ✅ Devnet is free | ~5 min |
| **Google OAuth** | "Continue with Google" button on login page | ✅ Free | ~5 min |
| **NFT.Storage** | Upload videos to IPFS (optional for MVP) | ✅ Free | ~2 min |
| **Solana wallet** | Sign blockchain transactions | ✅ Devnet is free | ~2 min |

> **Minimum to run the app locally:** Supabase only. Web3Auth and Google are only needed when `NEXT_PUBLIC_USE_MOCK_CHAIN=false`.

---

## 1. Supabase — Database

The backend (`backend/`) uses PostgreSQL. Supabase gives you a free managed Postgres.

### Steps

1. Go to https://supabase.com and sign up (GitHub login works).
2. Click **New Project**.
   - **Organization:** your personal org (or create a new one)
   - **Name:** `vidchain`
   - **Database Password:** generate a strong one — save it somewhere safe
   - **Region:** `Southeast Asia (Singapore)` — closest to Indonesia
3. Wait ~2 minutes for provisioning.
4. Go to **Project Settings → Database → Connection string**.
5. Select **Transaction pooler** tab (not Session or Direct).
   - Copy the URI that looks like:
     ```
     postgresql://postgres.XXXX:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
     ```
6. Open `backend/.env` and paste it:
   ```
   DATABASE_URL=postgresql://postgres.XXXX:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
7. Run the database migration to create the tables:
   ```bash
   cd SuperTeam/backend
   npm run db:migrate
   ```

### After setup

The backend will connect on next `npm run dev`. You'll see the migration-failed warning disappear.

---

## 2. Web3Auth — Embedded Solana Wallet

Web3Auth turns a Google login into a real Solana wallet — the user never sees a seed phrase.

> **Skip this for local demo:** Set `NEXT_PUBLIC_USE_MOCK_CHAIN=true` in `frontend/.env.local` and Web3Auth is never initialized. The demo wallet is used instead.

### Steps

1. Go to https://dashboard.web3auth.io and sign up.
2. Click **Create Project**.
   - **Product:** `Plug and Play`
   - **Platform:** `Web`
   - **Chain:** `Solana`
   - **Environment:** `Sapphire Devnet` (free, unlimited users)
   - **Name:** `VidChain`
3. After creation, copy the **Client ID** — it looks like `BHFkzC...`
4. In **Project Settings → Whitelist Domains**, add:
   ```
   http://localhost:3000
   ```
   (Add your Vercel URL later when deploying.)
5. Open `frontend/.env.local` and fill in:
   ```
   NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=BHFkzC...your_client_id_here
   NEXT_PUBLIC_WEB3AUTH_NETWORK=sapphire_devnet
   NEXT_PUBLIC_USE_MOCK_CHAIN=false
   ```

> **Important:** Without the domain whitelisted, the Web3Auth modal will show a blank/error screen. If login breaks, the missing whitelist is the first thing to check.

---

## 3. Google OAuth — "Continue with Google" Button

Two places use Google login:
- **Frontend `/login` page** — uses `@react-oauth/google` with `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- **Backend `/auth/google`** — verifies the Google token with `GOOGLE_CLIENT_ID`

Both keys should be the **same** Google OAuth Client ID.

> **Skip this if:** you only plan to use email/password auth or wallet auth. The Google button is disabled when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is empty.

### Steps

1. Go to https://console.cloud.google.com.
2. Create a new project or select an existing one.
3. Go to **APIs & Services → OAuth consent screen**.
   - **User type:** External
   - Fill in App name (`VidChain`), support email, developer email.
   - Scopes: add `email`, `profile`, `openid`.
   - Save.
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**.
   - **Application type:** Web application
   - **Name:** `VidChain Local`
   - **Authorized JavaScript origins:**
     ```
     http://localhost:3000
     ```
   - **Authorized redirect URIs:** (leave empty for implicit flow)
   - Click **Create**.
5. Copy the **Client ID** — it looks like `123456789-abc.apps.googleusercontent.com`.
6. Fill in both files:

   `frontend/.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
   ```

   `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
   ```

---

## 4. NFT.Storage — IPFS Video Upload (Optional for MVP)

Used when you want to upload the actual video file to IPFS and get a `ipfs://` URL for the proof metadata. For the hackathon demo you can skip this — just leave `metadataUri` empty.

### Steps

1. Go to https://nft.storage and sign up (GitHub works).
2. Go to **API Keys → New Key**.
   - **Name:** `VidChain Dev`
3. Copy the API key.
4. Fill in `backend/.env`:
   ```
   NFT_STORAGE_API_KEY=eyJhbGci...your_key_here
   ```

---

## 5. Solana Wallet — Devnet Transactions

The app signs Solana transactions when `NEXT_PUBLIC_USE_MOCK_CHAIN=false`. You need a funded devnet wallet.

### Option A — Phantom (for manual testing in browser)

1. Install Phantom: https://phantom.app
2. Open Phantom → **Settings → Developer Settings → Testnet Mode → Enable** (or manually switch network to Devnet).
3. Copy your wallet address.
4. Get free devnet SOL from the faucet:
   ```bash
   solana airdrop 2 YOUR_WALLET_ADDRESS --url https://api.devnet.solana.com
   ```
   Or use the web faucet: https://faucet.solana.com

### Option B — Solana CLI keypair (for server-side transactions)

Only needed if the backend needs to pay for transactions (demo path without a connected wallet).

```bash
# Install Solana CLI if not already installed
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Create a devnet keypair
solana-keygen new --outfile ~/.config/solana/devnet.json --no-bip39-passphrase

# Airdrop 2 SOL
solana config set --url https://api.devnet.solana.com
solana airdrop 2

# Get the base58-encoded private key (for backend env)
cat ~/.config/solana/devnet.json
# This prints a JSON array — convert to base58 or keep as JSON depending on your adapter
```

For the hackathon, `NEXT_PUBLIC_USE_MOCK_CHAIN=true` makes this unnecessary.

---

## 6. JWT Secret — Backend Auth

The backend uses JWT for auth tokens. The default secret in `.env` is a placeholder — change it before deploying:

`backend/.env`:
```
JWT_SECRET=change-me-to-something-random-at-least-32-chars
```

Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Summary — What to fill in

### `backend/.env`

```env
DATABASE_URL=          ← Supabase pooled connection string (required to start DB)
JWT_SECRET=            ← Random 32+ char string (required for auth)
GOOGLE_CLIENT_ID=      ← From Google Console (only if using Google login)
PORT=4000
HOST=0.0.0.0
FRONTEND_ORIGIN=http://localhost:3000
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000   ← already set, points to backend

# Mock flags — set both to false when you have real credentials:
NEXT_PUBLIC_USE_MOCK_API=false                   ← already false
NEXT_PUBLIC_USE_MOCK_CHAIN=true                  ← change to false when Web3Auth is set up

# Fill these in when ready:
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=                  ← from Web3Auth dashboard
NEXT_PUBLIC_GOOGLE_CLIENT_ID=                    ← from Google Console
NEXT_PUBLIC_VIDCHAIN_PROGRAM_ID=                 ← from `anchor deploy` output
```

---

## Quick Start Order

If you want to run the full stack step by step:

1. **Day 1 — demo mode (no external services)**
   - Leave `NEXT_PUBLIC_USE_MOCK_CHAIN=true`
   - Register/verify flow works with mock data
   - Run: `cd SuperTeam && npm run dev`

2. **Day 2 — add real database**
   - Create Supabase project (step 1 above)
   - Fill `DATABASE_URL` in `backend/.env`
   - Run `npm run db:migrate` in `backend/`
   - Proof registration and verification now persist to Postgres

3. **Day 3 — add Google login**
   - Create Google OAuth credentials (step 3 above)
   - Fill `NEXT_PUBLIC_GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_ID`
   - Login page now works with real Google accounts

4. **Day 4 — add Web3Auth (real wallet)**
   - Create Web3Auth project (step 2 above)
   - Set `NEXT_PUBLIC_USE_MOCK_CHAIN=false`
   - Users get real Solana wallets from Google login
