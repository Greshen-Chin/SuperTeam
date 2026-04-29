# Frontend Instructions

Frontend goal: make VidChain feel like a normal creator tool, not a crypto app.

## Responsibilities

- Build the user-facing web app.
- Keep UX simple for non-crypto creators.
- Integrate wallet signing without making crypto the main story.
- Display certificate and verification results clearly.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Solana Wallet Adapter
- Web Crypto API
- HTML5 Video + Canvas

## Pages To Build

### `/`

Simple dashboard with two primary actions:

- `Register Video`
- `Check Original`

Do not build a marketing-heavy landing page first. The first screen should make the product usable.

### `/register`

Creator registers an original video.

Required UI:

- video upload dropzone,
- title input,
- optional creator handle input,
- fingerprinting progress,
- wallet connection/signing step,
- transaction confirmation state,
- success state with certificate link.

### `/verify`

Anyone checks whether a video matches a registered original.

Required UI:

- video upload dropzone,
- checking progress,
- result state,
- confidence score,
- original certificate link,
- no-match state.

### `/certificate/[id]`

Public proof page.

Required UI:

- video/proof title,
- creator wallet or verified handle,
- registration timestamp,
- Solana transaction link,
- proof ID,
- fingerprint summary,
- share action.

## UI States

Use explicit states instead of scattered booleans:

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

## UX Copy

Use:

```text
Register Video
Check Original
Video Fingerprint
Proof Certificate
Registered on Solana
Likely Match Found
No Registered Origin Found
```

Avoid:

```text
Mint NFT
Buy Token
Legal Notary
Guaranteed Copyright
```

## Success Criteria

- Non-crypto user can understand the app.
- Demo can be completed without explaining technical terms.
- All loading, error, and success states are polished.
- Certificate page can be opened without wallet.

