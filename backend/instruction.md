# Backend Instructions

Backend goal: be the source of truth for proof metadata, verification results, and candidate search.

## Responsibilities

- Accept fingerprint payloads or generate fingerprints server-side if needed.
- Create proof metadata.
- Store proof records.
- Retrieve public certificate data.
- Compare uploaded video fingerprints against registered proofs.
- Store verification history.
- Provide API used by web and bot.

## Tech Stack

- Node.js
- Fastify or Next.js API Routes
- PostgreSQL / Supabase
- Prisma or Supabase client
- Zod for validation

## Minimum Endpoints

```text
POST /api/fingerprints
POST /api/proofs
GET  /api/proofs/:id
POST /api/proofs/verify
GET  /api/proofs/:id/report
```

## Response Shape

All API responses should be stable:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "requestId": "req_123"
}
```

Error response:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "FINGERPRINT_FAILED",
    "message": "Could not generate video fingerprint."
  },
  "requestId": "req_123"
}
```

## API Contract

### Create Fingerprint

```http
POST /api/fingerprints
Content-Type: multipart/form-data
```

Returns SHA-256, frame hashes, fingerprint root, and duration.

### Register Proof

```http
POST /api/proofs
Content-Type: application/json
```

Stores proof metadata after wallet signature and Solana transaction are ready.

### Get Proof

```http
GET /api/proofs/:id
```

Returns certificate metadata for public display.

### Verify Video

```http
POST /api/proofs/verify
Content-Type: multipart/form-data
```

Returns match type, confidence, matched proof ID, and certificate URL.

## Repositories

Database access should go through repositories:

```text
proofRepository.create()
proofRepository.findById()
proofRepository.findCandidates()
verificationRepository.create()
```

## Success Criteria

- Frontend has stable API.
- Certificate can be loaded by ID.
- Verification result is stored and reproducible.
- Demo data can be seeded quickly.
- External services can fail without breaking the full demo.

