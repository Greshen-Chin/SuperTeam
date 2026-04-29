# GlobalWorker Protocol

> The payroll layer for the world's informal economy - built in Indonesia, for the world.

GlobalWorker Protocol is a Solana payroll and escrow MVP for hackathon demos. The repo is now split into separate frontend and backend apps so the UI, API, and data contracts are easier to maintain.

## Monorepo Layout

```text
apps/frontend/                 Next.js 14 frontend
apps/backend/                  Fastify API + Supabase/Postgres access
packages/shared/               Shared schemas, types, constants, demo fixtures
programs/globalworker-escrow/  Anchor escrow program
scripts/seed-demo.ts           Demo seed script
supabase/schema.sql            Database schema
```

## Environment

Frontend uses `apps/frontend/.env.local`.

Backend uses `apps/backend/.env`.

Important:
- Keep `DATABASE_URL` and `DIRECT_URL` only in backend env.
- Keep `NEXT_PUBLIC_API_URL=http://localhost:4000` in frontend env.

## Run Locally

From repo root:

```bash
cmd /c npm install
cmd /c npm run seed
cmd /c npm run dev
```

Apps will run on:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Demo page: `http://localhost:3000/demo`
- Backend health: `http://localhost:4000/health`

## Verification

These commands are expected to pass:

```bash
cmd /c npm run lint
cmd /c npm run build
cmd /c npm run seed
```

## Notes

- Offramp stays simulated for demo reliability.
- The backend normalizes database payloads before they reach React, so UI components no longer receive broken `jsonb` string payloads.
- The demo flow is intentionally optimized for a 3-minute presentation, not production custody.
