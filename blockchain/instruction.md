# Blockchain Instructions

The blockchain goal: **create a public, timestamped, tamper-proof proof of video ownership** that no platform controls. Solana is chosen for sub-second confirmation and ~$0.00025 fees — both required for consumer UX.

> Stack reference: Solana Devnet (→ Mainnet later) · Anchor 0.30+ · `@coral-xyz/anchor` TS client · Metaplex MPL Token Metadata for the NFT layer · `@solana/web3.js` on the frontend.

---

## Table of Contents

1. [Responsibilities](#responsibilities)
2. [Setup](#setup)
3. [Folder Structure](#folder-structure)
4. [Anchor Workspace](#anchor-workspace)
5. [Program Instructions](#program-instructions)
6. [PDA Design](#pda-design)
7. [Frontend Integration](#frontend-integration)
8. [Deployment](#deployment)
9. [Security & Cost](#security--cost)
10. [Testing](#testing)
11. [Success Criteria](#success-criteria)

---

## Responsibilities

- Author and deploy the Anchor program that records proofs, license purchases, and disputes on-chain.
- Generate the IDL and TypeScript client and check both into the repo so other workstreams can compile.
- Provide a tiny, documented helper at `blockchain/clients/ts/` that wraps `@coral-xyz/anchor` calls.
- Surface a Solana Explorer link for every transaction the user creates.

The blockchain workstream does **not**:

- Store raw video bytes on-chain (use IPFS).
- Implement matching or fingerprinting (lives in `fingerprinting/`).
- Hold user wallet keys (the user signs with Phantom).

---

## Setup

### Install toolchain (one-time)

```bash
# Rust (stable)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default stable

# Solana CLI 1.18+
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Anchor via avm (required for version pinning)
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.30.1
avm use 0.30.1

# Node.js for tests + client
nvm install 20 && nvm use 20

# Verify
solana --version       # solana-cli 1.18.x
anchor --version       # anchor-cli 0.30.x
```

### Configure for Devnet

```bash
solana config set --url https://api.devnet.solana.com

# Create a deploy keypair (KEEP THIS FILE OUT OF GIT)
solana-keygen new --outfile ~/.config/solana/devnet-deployer.json
solana config set --keypair ~/.config/solana/devnet-deployer.json

# Fund it (Devnet faucet)
solana airdrop 2
solana balance
```

### Initialize the workspace

```bash
cd blockchain
anchor init vidchain --no-git    # creates programs/vidchain, tests, Anchor.toml
# move generated content up if needed so layout matches below
npm install                      # install Anchor's TS test deps
```

---

## Folder Structure

```text
blockchain/
├── instruction.md
├── Anchor.toml
├── Cargo.toml                       # workspace
├── package.json                     # mocha/ts-mocha for anchor test
├── tsconfig.json
├── programs/
│   └── vidchain/
│       ├── Cargo.toml
│       ├── Xargo.toml
│       └── src/
│           ├── lib.rs               # declare_id! + program module
│           ├── state.rs             # Proof, License, Dispute account structs
│           ├── instructions/
│           │   ├── mod.rs
│           │   ├── register_proof.rs
│           │   ├── purchase_license.rs   # stretch
│           │   ├── file_dispute.rs       # stretch
│           │   └── resolve_dispute.rs    # stretch
│           └── errors.rs            # #[error_code] enum
├── tests/
│   ├── register-proof.ts
│   ├── purchase-license.ts          # stretch
│   └── file-dispute.ts              # stretch
├── migrations/
│   └── deploy.ts                    # post-deploy initialization (if needed)
├── clients/
│   └── ts/
│       ├── package.json
│       ├── src/
│       │   ├── index.ts             # high-level helpers used by frontend
│       │   ├── connection.ts
│       │   └── instructions.ts
│       └── idl/
│           └── vidchain.json        # generated, committed
└── target/                          # build artifacts (gitignored)
```

---

## Anchor Workspace

`Anchor.toml`:

```toml
[toolchain]
anchor_version = "0.30.1"

[features]
seeds = false
skip-lint = false

[programs.localnet]
vidchain = "Replace1111111111111111111111111111111111"

[programs.devnet]
vidchain = "Replace1111111111111111111111111111111111"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/devnet-deployer.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 'tests/**/*.ts'"
```

After the first `anchor build`, replace the placeholder Program ID everywhere with the real one printed by `anchor keys list`.

---

## Program Instructions

### MVP — `register_proof`

Stores a proof PDA derived from `[b"proof", creator.key().as_ref(), sha256[..]]`.

```rust
// programs/vidchain/src/state.rs
#[account]
pub struct Proof {
    pub creator: Pubkey,                 // 32
    pub sha256: [u8; 32],                // 32
    pub fingerprint_root: [u8; 32],      // 32
    pub metadata_uri: String,            // 4 + ≤ 200
    pub created_at: i64,                 // 8
    pub status: u8,                      // 1   (0 active, 1 archived, 2 disputed)
    pub bump: u8,                        // 1
}

impl Proof {
    pub const MAX_LEN: usize = 8 + 32 + 32 + 32 + 4 + 200 + 8 + 1 + 1;
}
```

```rust
// programs/vidchain/src/instructions/register_proof.rs
#[derive(Accounts)]
#[instruction(sha256: [u8; 32])]
pub struct RegisterProof<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = Proof::MAX_LEN,
        seeds = [b"proof", creator.key().as_ref(), sha256.as_ref()],
        bump
    )]
    pub proof: Account<'info, Proof>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RegisterProof>,
    sha256: [u8; 32],
    fingerprint_root: [u8; 32],
    metadata_uri: String,
) -> Result<()> {
    require!(metadata_uri.len() <= 200, VidchainError::MetadataUriTooLong);
    let p = &mut ctx.accounts.proof;
    p.creator = ctx.accounts.creator.key();
    p.sha256 = sha256;
    p.fingerprint_root = fingerprint_root;
    p.metadata_uri = metadata_uri;
    p.created_at = Clock::get()?.unix_timestamp;
    p.status = 0;
    p.bump = ctx.bumps.proof;
    Ok(())
}
```

Errors:

```rust
// programs/vidchain/src/errors.rs
#[error_code]
pub enum VidchainError {
    #[msg("metadata_uri too long")]
    MetadataUriTooLong,
    #[msg("not the original creator")]
    NotCreator,
    #[msg("proof is archived")]
    Archived,
    // stretch
    #[msg("license fee mismatch")]
    LicenseFeeMismatch,
    #[msg("dispute window closed")]
    DisputeWindowClosed,
}
```

### Stretch — `purchase_license`

Atomically: verify payment, transfer SOL to creator (90%) and platform (10%), mint a License Token NFT to buyer using Metaplex.

### Stretch — `file_dispute` / `resolve_dispute`

Create `Dispute` PDA with claimant + accused + status; accept response within a window; admin resolves; reputation count updated on a `Reputation` PDA per wallet.

> Implement `register_proof` first and verify the demo end-to-end before touching license/dispute.

---

## PDA Design

| PDA | Seeds | Purpose |
|---|---|---|
| `proof` | `[b"proof", creator.key, sha256]` | One per registered video. SHA-256 prevents same creator double-registering same file. |
| `license` | `[b"license", proof.key, buyer.key]` | One per buyer-per-proof. |
| `dispute` | `[b"dispute", claimant_proof.key, accused_proof.key]` | One per pair. |
| `reputation` | `[b"reputation", wallet.key]` | Singleton per wallet. |

PDAs are **deterministic** — derive in TS without an RPC call:

```ts
const [proofPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("proof"), creator.toBuffer(), sha256Bytes],
  programId
);
```

---

## Frontend Integration

The frontend uses `clients/ts/` (or imports Anchor types directly from `target/types/vidchain.ts`). Wrap the SDK in a thin file:

```ts
// blockchain/clients/ts/src/index.ts
import { AnchorProvider, Program, web3 } from "@coral-xyz/anchor";
import idl from "../idl/vidchain.json";
import type { Vidchain } from "../idl/vidchain";

export function getProgram(provider: AnchorProvider): Program<Vidchain> {
  return new Program<Vidchain>(idl as Vidchain, provider);
}

export async function registerProofTx(
  program: Program<Vidchain>,
  creator: web3.PublicKey,
  sha256: Uint8Array,
  fingerprintRoot: Uint8Array,
  metadataUri: string,
) {
  const [proofPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("proof"), creator.toBuffer(), sha256],
    program.programId,
  );
  return program.methods
    .registerProof(Array.from(sha256), Array.from(fingerprintRoot), metadataUri)
    .accounts({ creator, proof: proofPda, systemProgram: web3.SystemProgram.programId })
    .transaction();
}
```

Frontend usage:

```ts
// frontend/src/lib/blockchain-adapter.ts
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram, registerProofTx } from "@vidchain/blockchain-client";

export function useRegisterProof() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  return async (input: RegisterInput) => {
    if (!wallet) throw new Error("connect wallet");
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const program = getProgram(provider);
    const tx = await registerProofTx(program, wallet.publicKey, input.sha256, input.fingerprintRoot, input.metadataUri);
    const sig = await provider.sendAndConfirm(tx);
    return { signature: sig, explorerUrl: `https://explorer.solana.com/tx/${sig}?cluster=devnet` };
  };
}
```

UX rules: never expose PDA, account rent, or "lamports" terminology to the user.

---

## Deployment

### Devnet

```bash
cd blockchain
anchor build                                          # generates IDL + types
anchor keys list                                      # prints program IDs
# If first deploy, copy the printed ID into Anchor.toml + lib.rs declare_id!
anchor build                                          # rebuild with correct ID
anchor deploy --provider.cluster devnet
```

After a successful deploy:

1. Copy the program ID into `frontend/.env.local` as `NEXT_PUBLIC_VIDCHAIN_PROGRAM_ID`.
2. Copy `target/idl/vidchain.json` → `blockchain/clients/ts/idl/vidchain.json`.
3. Copy `target/types/vidchain.ts` → `blockchain/clients/ts/idl/vidchain.ts`.
4. Commit IDL + types so frontend builds without the Rust toolchain.

### Mainnet (post-hackathon)

```bash
solana config set --url https://api.mainnet-beta.solana.com
# Fund the deployer wallet with REAL SOL (≈ 2 SOL for first deploy)
anchor deploy --provider.cluster mainnet
```

Use a multisig for the upgrade authority on mainnet.

### Upgrade-authority hygiene

Default is the deployer wallet has upgrade authority. After hackathon judging, transfer to a multisig:

```bash
solana program set-upgrade-authority <PROGRAM_ID> --new-upgrade-authority <MULTISIG>
```

---

## Security & Cost

- **Validate every account** with Anchor's `#[account(constraint = ...)]` attributes — never trust client-provided keys.
- **PDA bumps**: store and re-derive with the stored bump (faster + safer).
- **Rent-exempt** accounts only — Anchor handles this when using `init`.
- **Compute units**: `register_proof` is well under the 200 k default; do not import heavy crypto.
- **Cost (Devnet)**: ~0.002 SOL per `register_proof` (account rent). Free Devnet SOL is plenty.
- **Cost (Mainnet)**: ~$0.30 per registration at $150 SOL. Sponsor it server-side for first-time creators.
- **Never** put a user secret on-chain (private keys, tokens, emails). Only public, hash-like data.

---

## Testing

See **[TESTING.md](../TESTING.md)** for the unified guide. Blockchain specifics:

```bash
# Local validator-based test
anchor test                              # auto-starts solana-test-validator

# Run only one file
anchor test -- --grep "register_proof"
```

`tests/register-proof.ts` (mocha + chai):

```ts
import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { Vidchain } from "../target/types/vidchain";

describe("register_proof", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Vidchain as anchor.Program<Vidchain>;

  it("creates a proof PDA", async () => {
    const sha256 = new Uint8Array(32).fill(7);
    const root   = new Uint8Array(32).fill(8);

    const [proofPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("proof"), provider.wallet.publicKey.toBuffer(), Buffer.from(sha256)],
      program.programId,
    );

    await program.methods
      .registerProof(Array.from(sha256), Array.from(root), "ipfs://demo")
      .accounts({ creator: provider.wallet.publicKey, proof: proofPda, systemProgram: anchor.web3.SystemProgram.programId })
      .rpc();

    const proof = await program.account.proof.fetch(proofPda);
    expect(proof.creator.toBase58()).to.equal(provider.wallet.publicKey.toBase58());
    expect(Buffer.from(proof.sha256)).to.deep.equal(Buffer.from(sha256));
  });

  it("rejects metadata_uri longer than 200 chars", async () => {
    // ...
  });
});
```

CI: `anchor build` runs in GitHub Actions on a `solana-cli` action. Full `anchor test` is heavy — run on `main` only, not every PR.

---

## Success Criteria

- [ ] `anchor build` succeeds locally and in CI.
- [ ] `anchor test` passes for `register_proof` (creation + duplicate-creator rejection).
- [ ] Program is deployed to Devnet with a stable Program ID.
- [ ] IDL and TS types are committed under `blockchain/clients/ts/idl/`.
- [ ] Frontend can sign + submit a `register_proof` and the certificate links to a valid Devnet Explorer URL.
- [ ] Per-tx fee on Devnet < 0.005 SOL.
- [ ] No secret keys committed; deployer keypair lives only on local + a 1Password/Bitwarden vault entry.
