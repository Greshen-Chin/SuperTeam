# VidChain Workflow

Dokumen ini menjelaskan alur produk, alur teknis, dan alur kerja tim.

## Product Workflow

### 1. Register Original Video

```text
Creator opens app
-> uploads original video
-> app generates SHA-256 + visual fingerprint
-> creator connects wallet
-> creator signs Solana transaction
-> backend stores proof metadata
-> Solana stores timestamped proof reference
-> app shows public certificate link
```

Output:

- proof ID,
- public certificate URL,
- Solana transaction signature,
- fingerprint summary.

### 2. Verify Reposted Video

```text
Verifier opens app
-> uploads suspected repost
-> app generates fingerprint
-> backend compares fingerprint with registered proofs
-> backend returns match result
-> app shows confidence score and original certificate
```

Possible result:

```text
exact match
visual match
possible match
no registered origin found
```

### 3. Public Certificate

Certificate page must be accessible without wallet.

It should show:

- title,
- creator wallet or handle,
- registration timestamp,
- proof ID,
- Solana Explorer link,
- fingerprint summary,
- share action.

## Technical Workflow

```text
Frontend
  -> handles upload, wallet UX, certificate UI

Fingerprinting
  -> generates SHA-256, frame hashes, fingerprint root

Backend
  -> stores proof metadata, searches candidates, returns verification result

Blockchain
  -> registers timestamped proof on Solana Devnet

Bot
  -> calls backend API for Telegram/WhatsApp access
```

## Development Workflow

1. Start from shared schemas.
2. Backend exposes stable API contracts.
3. Frontend integrates with mock API first, then real API.
4. Fingerprinting module exposes pure functions.
5. Blockchain module exposes a TypeScript client helper.
6. Bot uses the same backend APIs as frontend.
7. Demo dataset is prepared early and tested daily.

## 3-Minute Demo Workflow

1. Register original video.
2. Show fingerprint generated.
3. Sign Solana transaction.
4. Open certificate page.
5. Upload compressed/re-encoded copy.
6. Show exact SHA-256 does not match.
7. Show VidChain still finds original by visual fingerprint.
8. Close with Indonesia creator impact.

## Team Workflow

### Day 1

- Create repo/app skeleton.
- Define shared schemas.
- Build upload UI.
- Build basic fingerprint function.
- Build proof API.
- Create Anchor account schema.

### Day 2

- Connect frontend to backend.
- Implement visual matching.
- Deploy Anchor program to Devnet.
- Build certificate page.
- Prepare demo videos.

### Day 3

- Polish UX.
- Add error states.
- Add Solana Explorer links.
- Test full demo repeatedly.
- Record demo video.
- Finish pitch deck.

## Pitch Positioning

Use this:

> VidChain helps Indonesian creators prove the origin of viral short videos and dances across platforms using video fingerprinting and Solana timestamped proof.

Avoid this:

> VidChain turns videos into NFTs.

Best explanation:

> YouTube and TikTok have platform-specific copyright systems. VidChain is a portable public proof layer that works across platforms, brands, agencies, games, and creator communities.

