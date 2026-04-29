# Blockchain Instructions

Blockchain goal: create a public timestamped proof that is not controlled by one platform.

## Responsibilities

- Build Anchor program.
- Register proof on Solana Devnet.
- Expose TypeScript client helper.
- Provide Solana Explorer transaction link for certificate page.

## Tech Stack

- Solana Devnet
- Anchor
- `@solana/web3.js`
- Solana Wallet Adapter on frontend

## What Goes On-Chain

Only compact proof data:

```text
proof_id
creator
sha256_hash
fingerprint_root
metadata_uri
created_at
status
```

Do not store raw video on-chain.

## Anchor Instruction

Minimum instruction:

```text
register_proof
```

Future instructions:

```text
update_metadata
mark_disputed
revoke_or_archive
```

These future instructions are not required for MVP.

## Frontend Integration

Frontend should show:

- wallet connect,
- sign transaction,
- confirmation state,
- Solana Explorer link.

Avoid making the user understand PDA, account rent, or Anchor internals.

## Success Criteria

- Anchor program builds.
- Program is deployed to Devnet.
- Register proof creates a real Devnet transaction.
- Certificate links to a valid Solana Explorer transaction.
- Minimal test exists for `register_proof`.

