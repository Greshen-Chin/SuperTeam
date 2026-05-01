# Bot Instructions

The bot goal: **let creators register and verify videos directly inside Telegram (and later WhatsApp)** without leaving their daily app. Bot is a **stretch goal** — never ship a half-working bot at the cost of a polished web demo.

> Stack reference: `grammY` (Telegram TS framework) · Node.js 20 · TypeScript (strict) · the same `/api/*` endpoints the web app uses · `@grammyjs/files` for file downloads.

---

## Table of Contents

1. [Responsibilities](#responsibilities)
2. [Priority](#priority)
3. [Setup](#setup)
4. [Folder Structure](#folder-structure)
5. [Telegram Flow](#telegram-flow)
6. [Backend Integration](#backend-integration)
7. [Wallet Hand-off](#wallet-hand-off)
8. [Rate Limiting & Abuse](#rate-limiting--abuse)
9. [Deployment](#deployment)
10. [Testing](#testing)
11. [Success Criteria](#success-criteria)

---

## Responsibilities

- Receive videos from a Telegram chat, fingerprint them server-side (or call backend), and return a result.
- Hand off **registration** to the web app via a deep-link to `/register?intent=register&fp=<id>` so the user signs with their wallet.
- Return verification results inline (no wallet required).
- Never ask for a seed phrase, private key, or API token.

---

## Priority

1. **Telegram bot** (this doc) — fastest to ship for a hackathon, mature SDK.
2. **WhatsApp Cloud API** — more relevant for Indonesia, but requires Meta Business verification (slow).

Build Telegram first. WhatsApp goes on the post-hackathon roadmap.

---

## Setup

```bash
cd bot
npm init -y
npm install grammy @grammyjs/files zod pino dotenv
npm install --save-dev typescript tsx vitest @types/node

cp .env.example .env
# fill TELEGRAM_BOT_TOKEN (from @BotFather) and BACKEND_API_URL
```

`bot/package.json`:

```json
{
  "name": "@vidchain/bot",
  "type": "module",
  "scripts": {
    "dev":   "tsx watch src/index.ts",
    "start": "node --enable-source-maps dist/index.js",
    "build": "tsc -p tsconfig.json",
    "test":  "vitest run",
    "lint":  "eslint src",
    "typecheck": "tsc --noEmit"
  }
}
```

Get a token from `@BotFather` on Telegram — `/newbot` → name → username → token.

---

## Folder Structure

```text
bot/
├── instruction.md
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts                  # bootstraps grammY bot
│   ├── env.ts                    # Zod-validated env
│   ├── handlers/
│   │   ├── start.ts              # /start command, intro + buttons
│   │   ├── help.ts               # /help
│   │   ├── on-video.ts           # any video upload triggers menu
│   │   ├── on-register.ts        # callback: deep-link to web register
│   │   └── on-verify.ts          # callback: download → API call → reply
│   ├── api/
│   │   └── vidchain-client.ts    # typed wrapper of /api/* endpoints
│   ├── log.ts
│   └── rate-limit.ts             # in-memory + optional Redis
└── tests/
    └── on-verify.test.ts
```

---

## Telegram Flow

```text
User              Bot
 │  sends video    │
 │ ─────────────▶  │
 │                 │  reply: inline keyboard
 │                 │  [ Register Original ] [ Check Original ]
 │ ─── tap ───▶    │
 │                 │
 │  REGISTER:      │  reply: "Open this link to sign in your wallet:"
 │                 │  https://vidchain.app/register?intent=bot&token=<one-time>
 │                 │  (the token lets the web app pull the already-uploaded file from storage)
 │                 │
 │  VERIFY:        │  download file via getFile → POST /api/proofs/verify
 │                 │  reply with match type + certificate link or "no match"
 │                 │
 │  /help          │  text + links
```

### Commands

| Command | Behavior |
|---|---|
| `/start` | Welcome message + two buttons (Register / Verify) |
| `/help` | Short doc + link to web app |
| (any video upload) | Inline keyboard appears |
| Inline `register` | Deep-link to `/register?intent=bot&token=...` |
| Inline `verify` | Run verify pipeline, reply with result |

### Reply formats

**Verify hit:**

```
✅ Likely Match Found (confidence 0.94)

Original creator: vidchain.app/certificate/proof_abc123
Registered: 2 days ago
```

**Verify miss:**

```
🟡 No Registered Origin Found

This video does not match anything registered on VidChain.
Want to register it as your original? → vidchain.app/register
```

---

## Backend Integration

The bot is a **client of the same `/api/*` endpoints** the web uses. Never duplicate fingerprinting or matching logic in the bot.

```ts
// src/api/vidchain-client.ts
import { z } from "zod";
import { env } from "../env";
import { verificationResultSchema } from "@vidchain/shared";

export async function verifyVideo(buffer: Buffer, filename: string) {
  const form = new FormData();
  form.append("file", new Blob([buffer]), filename);
  const res = await fetch(`${env.BACKEND_API_URL}/proofs/verify`, { method: "POST", body: form });
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return verificationResultSchema.parse(json.data);
}
```

**Note:** the web app sends a precomputed `Fingerprint`. The bot does not run a browser, so it sends the raw file to a server-side fingerprinting endpoint (`POST /api/fingerprints`), then sends that fingerprint to `/api/proofs/verify`. The backend must accept either path.

---

## Wallet Hand-off

The bot **never** signs Solana transactions itself. Registration always returns to the web app where the user signs with Phantom.

1. Bot receives the video + creator's Telegram user ID.
2. Bot uploads the file to the backend → backend returns a one-time `claimToken` (TTL 10 min).
3. Bot replies with `https://vidchain.app/register?intent=bot&token=<claimToken>`.
4. Web app pulls the staged file by token, runs fingerprinting (or accepts the server-computed one), and proceeds with the normal sign flow.

---

## Rate Limiting & Abuse

Telegram lets users spam. Defend the backend:

- 5 video uploads per user per 5 min.
- 1 GB / day per user (`grammY` middleware reads `ctx.from.id`).
- Reject files > 50 MB (`message.video.file_size`).
- Reject non-video MIME types.
- Use a sliding window via Redis (`@upstash/redis` free tier) for production.

---

## Deployment

Two options:

| Host | Pros | Cons |
|---|---|---|
| **Render Web Service** (free tier) | One file deploy, free TLS | Sleeps after 15 min idle (cold start ~10 s) |
| **Fly.io** | Always-on, fast, Indonesia region | Credit card required |
| **Vercel Cron + Telegram webhook** | Zero infra | Webhook only — no long-poll |

Recommended: **Fly.io** for production, **`bot.start()` long-polling locally** for dev.

`bot/Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["node", "--enable-source-maps", "dist/index.js"]
```

Set webhook (production):

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://bot.vidchain.app/webhook"
```

---

## Testing

See **[TESTING.md](../TESTING.md)** for the unified guide. Bot specifics:

- **Unit (Vitest):** mock `grammY`'s `Context` and assert reply contents.
- **Integration:** point the bot at a local Next.js dev server and a stubbed Telegram API (`grammY` provides a `MemorySessionStorage` and test transformer).
- **Smoke:** manually `/start` → upload demo video → verify → register hand-off.

---

## Success Criteria

- [ ] `/start` returns a friendly intro within 2 s.
- [ ] User can upload a video and tap `Verify`, receiving a result within 5 s.
- [ ] Verify hit returns the certificate URL.
- [ ] Verify miss returns the register CTA.
- [ ] Register tap returns a working deep-link that completes registration in the web app.
- [ ] Bot never asks for a seed phrase, private key, or API token.
- [ ] Bot enforces per-user rate limits.
- [ ] Bot deployed to a public host with a webhook (or running long-poll on a paid host).
