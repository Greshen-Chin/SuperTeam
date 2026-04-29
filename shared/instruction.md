# Shared Contracts & Patterns

Shared goal: keep frontend, backend, fingerprinting, blockchain, and bot aligned.

## Shared Schemas

Use Zod for API input/output validation.

Shared schemas should cover:

- proof,
- fingerprint,
- verification result,
- certificate,
- API response envelope,
- error codes.

## Data Model

### Proof

```text
id
creatorWallet
creatorHandle
title
description
sha256
frameHashes
fingerprintVersion
fingerprintRoot
metadataUri
solanaSignature
registeredAt
createdAt
updatedAt
```

### VerificationResult

```text
id
uploadedSha256
uploadedFingerprintRoot
matchedProofId
matchType
confidence
hammingDistance
createdAt
```

## Design Patterns

### Layered Architecture

```text
UI layer             React components/pages
Application layer    use cases
Domain layer         proof, fingerprint, matching, certificate
Infrastructure layer Solana, database, storage, bot
```

### Use Case Pattern

```text
registerVideoProof()
verifyVideoOrigin()
generateVideoFingerprint()
compareFingerprints()
createCertificate()
```

### Repository Pattern

```text
proofRepository.create()
proofRepository.findById()
proofRepository.findCandidates()
verificationRepository.create()
```

### Adapter Pattern

```text
solanaProofAdapter
storageAdapter
telegramBotAdapter
fingerprintAdapter
```

### Strategy Pattern

```text
exactHashMatchStrategy
frameHashMatchStrategy
sequenceMatchStrategy
poseMatchStrategy
```

## Code Quality Rules

- Use TypeScript everywhere.
- Avoid `any` unless there is a clear reason.
- Keep functions small and named by product intent.
- Put complex fingerprinting code behind clear interfaces.
- Keep environment variables in `.env.example`.
- Never commit private keys, API tokens, or wallet seed phrases.
- Use demo-safe fallback data when external services are down.
- Write at least smoke tests for fingerprint matching and proof registration.

