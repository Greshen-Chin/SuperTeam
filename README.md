# VidChain

Proof-of-origin for Indonesian short-form creators, powered by video fingerprinting and Solana timestamped proof.

VidChain helps creators prove the origin of viral short videos, dances, memes, and brand content across TikTok, Instagram Reels, YouTube Shorts, Facebook, and other platforms. The MVP focuses on one clear promise: register an original video, then verify whether a reposted or compressed version matches the registered origin.

## Hackathon Track

**Consumer Apps**

VidChain is designed as an everyday blockchain application for mass adoption. The product hides crypto complexity behind a simple creator workflow: upload, register, verify, share proof.

## Core Problem

Indonesian creators often lose attribution when their videos become viral. Reposts, edits, compression, and platform re-uploads make it hard to prove who created a video first. Platform timestamps are useful, but they are not portable across TikTok, Instagram, YouTube Shorts, WhatsApp, brand campaigns, or games.

VidChain creates an independent public proof layer:

- video fingerprint for originality checking,
- Solana timestamp for tamper-resistant registration,
- public certificate page for sharing proof,
- verifier tool for reposted or re-encoded videos.

VidChain does **not** claim to replace legal copyright registration or a licensed notary. It creates timestamped evidence that can support takedown reports, disputes, licensing conversations, and creator attribution.

## MVP Scope

The hackathon MVP must stay focused. The winning version is not a full NFT marketplace. It is a working proof and verification tool.

### Must Build

1. **Register Original Video**
   - Creator uploads a video.
   - App generates a video fingerprint.
   - App stores proof metadata on Solana.
   - Creator receives a public certificate link.

2. **Verify Suspected Repost**
   - Anyone uploads a suspected repost or compressed copy.
   - App generates a fingerprint for the uploaded video.
   - App compares it with registered proofs.
   - App returns match confidence and original certificate.

3. **Public Certificate Page**
   - Shows creator wallet or verified handle.
   - Shows registration timestamp.
   - Shows Solana transaction link.
   - Shows video title, proof ID, and fingerprint summary.
   - Provides a shareable URL.

4. **Demo Dataset**
   - Original test video.
   - Re-encoded/compressed version of the same video.
   - Different unrelated video.
   - Demo must prove that SHA-256 alone fails but video fingerprint matching still works.

### Nice To Have

- Telegram bot for register/check flow.
- WhatsApp bot as roadmap or stretch goal.
- Remix/origin chain for dance trends.
- License request button.
- Evidence report PDF.

### Do Not Build First

- Full NFT marketplace.
- Token launch.
- Crypto investment features.
- Complex dispute court.
- Full legal-notary claim.
- Revenue-share automation before proof flow is stable.

## Recommended Tech Stack

### Frontend

- **Next.js + React + TypeScript**
- **Tailwind CSS**
- **Solana Wallet Adapter**
- **Web Crypto API** for SHA-256
- **HTML5 Video + Canvas** for frame extraction

### Video Fingerprinting

- **SHA-256** for exact file match.
- **Frame perceptual hash** for compressed/re-encoded match.
- **Sequence matching** for trimmed videos.

Implementation target:

- sample frame every 1-2 seconds,
- resize frame to small grayscale image,
- generate perceptual hash per frame,
- compare frame sequences using Hamming distance,
- return confidence score.

Stretch algorithm:

- **MediaPipe Pose / MoveNet** for dance motion fingerprinting.
- **Dynamic Time Warping** for motion sequence similarity.

### Backend

- **Node.js + Fastify** or **Next.js API routes**
- **PostgreSQL / Supabase** for indexed metadata and fast search
- **Prisma** or Supabase client
- **IPFS / Pinata / Web3.Storage** for optional media or metadata storage

Backend stores searchable metadata. Solana stores the tamper-resistant proof reference.

### Blockchain

- **Solana Devnet**
- **Anchor** for on-chain program
- **@solana/web3.js**

On-chain proof should store only compact data:

- creator wallet,
- video proof ID,
- SHA-256 hash,
- fingerprint hash/root or metadata URI,
- timestamp,
- metadata URI,
- proof status.

Do not store raw video on-chain.

### Bot Access

- **Telegram Bot API** for MVP accessibility.
- **WhatsApp Cloud API** as stretch goal.

Bot should call the same backend APIs as the web app.

## Engineering Instructions

Build VidChain like a real product, not a throwaway demo. Keep the MVP small, but keep the code structure clean enough that each team member can work without blocking the others.

### Design Patterns To Use

#### 1. Layered Architecture

Separate the app into clear layers:

```text
UI layer             React pages and components
Application layer    use cases like registerProof and verifyVideo
Domain layer         fingerprint, proof, match score, certificate types
Infrastructure layer Solana, database, storage, bot, external APIs
```

Do not put Solana calls, database queries, and fingerprint logic directly inside React components.

#### 2. Use Case / Service Pattern

Create one service per product action:

```text
registerVideoProof()
verifyVideoOrigin()
createCertificate()
generateFingerprint()
compareFingerprints()
```

Each service should accept typed input and return typed output. This makes it easier to test and easier to connect the same logic to web UI, API routes, and Telegram bot.

#### 3. Repository Pattern

Access stored data through repositories:

```text
proofRepository.create()
proofRepository.findById()
proofRepository.findCandidates()
verificationRepository.create()
```

The rest of the app should not care whether the data comes from Supabase, Prisma, local JSON, or mock data during demo.

#### 4. Adapter Pattern

Wrap external systems behind adapters:

```text
solanaProofAdapter
ipfsStorageAdapter
telegramBotAdapter
videoFingerprintAdapter
```

This keeps external API details out of the core product logic and makes demo fallbacks easier if one provider fails.

#### 5. Strategy Pattern for Matching

Video matching should support multiple strategies:

```text
exactHashMatchStrategy
frameHashMatchStrategy
sequenceMatchStrategy
poseMatchStrategy // stretch
```

Start with exact hash and frame hash. Add sequence or pose matching only after the main flow works.

#### 6. State Machine for Upload Flow

The registration and verification UI should use explicit states:

```text
idle
selecting_file
fingerprinting
uploading_metadata
waiting_for_signature
confirming_on_chain
success
error
```

Do not manage complex upload state with many unrelated booleans.

#### 7. Shared Schema Validation

Use one shared schema for API inputs and outputs:

- `zod` for runtime validation,
- TypeScript types inferred from schemas,
- same schema reused by frontend, backend, and bot.

This prevents silent mismatch between frontend and backend during the hackathon.

### Code Quality Rules

- Use TypeScript everywhere.
- Avoid `any` unless there is a clear reason.
- Keep functions small and named by product intent.
- Put complex fingerprinting code behind clear interfaces.
- Keep environment variables in `.env.example`.
- Never commit private keys, API tokens, or wallet seed phrases.
- Use demo-safe fallback data when external services are down.
- Write at least smoke tests for fingerprint matching and proof registration.

### Suggested Folder Structure

```text
apps/web/
  app/
    register/
    verify/
    certificate/[id]/
  components/
  lib/
    api-client.ts
    wallet.ts

apps/api/
  src/
    routes/
    use-cases/
    repositories/
    adapters/
    schemas/

packages/core/
  src/
    fingerprint/
    matching/
    proof/
    certificate/

packages/shared/
  src/
    schemas/
    types/
    constants/

programs/vidchain-proof/
  programs/
  tests/
```

If the team chooses a simpler single Next.js app for speed, keep the same logical separation inside `src/`.

## Product Flow

### Creator Flow

1. Open VidChain.
2. Click **Register Video**.
3. Upload original video.
4. App generates video fingerprint locally.
5. Creator signs with Solana wallet.
6. Proof is registered on Solana Devnet.
7. App creates certificate page.
8. Creator shares certificate link.

### Verifier Flow

1. Open VidChain.
2. Click **Check Original**.
3. Upload suspicious repost video.
4. App generates fingerprint.
5. Backend compares against registered proofs.
6. Result shows:
   - no match,
   - exact match,
   - likely visual match,
   - confidence score,
   - original certificate link.

### Telegram Bot Flow

1. User sends video to bot.
2. Bot asks: `Register Original` or `Check Original`.
3. Bot uploads video to backend for fingerprinting.
4. For registration, bot returns a web link for wallet signature.
5. For verification, bot returns match result and certificate link.

## API Plan

```text
POST /api/videos/fingerprint
Generate SHA-256 and perceptual fingerprint from uploaded video.

POST /api/proofs/register
Create off-chain metadata and prepare Solana transaction.

GET /api/proofs/:id
Read certificate metadata.

POST /api/proofs/verify
Compare uploaded video fingerprint against registered proofs.

GET /api/proofs/:id/report
Generate evidence report payload or PDF.
```

## Data Model

```text
Proof
- id
- creatorWallet
- creatorHandle
- title
- description
- sha256
- frameHashes
- fingerprintVersion
- metadataUri
- solanaSignature
- registeredAt
- createdAt

VerificationResult
- id
- uploadedSha256
- matchedProofId
- matchType: exact | visual | sequence | none
- confidence
- hammingDistance
- createdAt
```

## 3-Minute Demo Script

1. **Register**
   - Upload original dance/video.
   - Show fingerprint generated.
   - Sign transaction.
   - Open certificate page with Solana link.

2. **Verify**
   - Upload compressed/re-encoded version.
   - Show SHA-256 does not match.
   - Show visual fingerprint match found.
   - Open original certificate.

3. **Impact**
   - Explain Indonesian creator use case.
   - Mention viral cases like dance trends, memes, and brand reposts.
   - Close with: VidChain is a public proof layer, not another closed platform.

## Team Split for 4 Developers

### Developer 1: Solana / Anchor

Owns:

- Anchor program for proof registration.
- Devnet deployment.
- Transaction instruction design.
- Solana transaction link integration.

Deliverables:

- `register_proof` instruction.
- Proof account schema.
- Devnet program ID.
- TypeScript client helper.
- Simple integration test.

### Developer 2: Video Fingerprinting Backend

Owns:

- SHA-256 generation pipeline.
- Frame extraction and pHash logic.
- Similarity scoring.
- Verification API.

Deliverables:

- `/api/videos/fingerprint`
- `/api/proofs/verify`
- confidence score logic,
- demo dataset with original/re-encoded/unrelated videos.

### Developer 3: App Backend / Database / Storage

Owns:

- Database schema.
- Proof metadata APIs.
- Certificate API.
- IPFS or metadata storage.

Deliverables:

- `Proof` table/model.
- `/api/proofs/register`
- `/api/proofs/:id`
- metadata URI generation.
- seed script for demo proofs.

### Developer 4: Frontend / UX / Bot

Owns:

- Creator registration UI.
- Verifier UI.
- Certificate page.
- Telegram bot integration if time allows.

Deliverables:

- `/register`
- `/verify`
- `/certificate/:id`
- wallet connect and transaction signing UI,
- Telegram bot proof/check flow as stretch goal.

## Build Priority

### Day 1

- Finalize data model.
- Build basic upload UI.
- Implement SHA-256.
- Create Anchor proof account.
- Create proof registration API.

### Day 2

- Implement frame pHash.
- Implement verification matching.
- Connect frontend to backend.
- Deploy Solana program to Devnet.
- Build certificate page.

### Day 3

- Polish 3-minute demo.
- Add demo videos.
- Add confidence score UI.
- Add Solana Explorer link.
- Record demo video.
- Prepare pitch deck.

## Pitch Positioning

Use this:

> VidChain helps Indonesian creators prove the origin of viral short videos and dances across platforms using video fingerprinting and Solana timestamped proof.

Avoid this:

> VidChain turns videos into NFTs.

Better explanation:

> YouTube and TikTok have platform-specific copyright systems. VidChain is a portable public proof layer that works across platforms, brands, agencies, and communities.

## Success Criteria

The MVP is successful if a judge can see this in under 3 minutes:

- original video registered,
- Solana proof created,
- public certificate opened,
- re-encoded copy verified,
- original creator identified,
- product feels usable by non-crypto creators.
