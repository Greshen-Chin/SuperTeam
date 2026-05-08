create extension if not exists pgcrypto;

create table if not exists users (
  id text primary key,
  email text,
  display_name text,
  wallet_address text unique not null,
  wallet_linked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists nonces (
  address text primary key,
  nonce text not null,
  expired_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists proofs (
  id text primary key,
  title text not null,
  description text,
  creator_wallet text not null,
  creator_handle text,
  sha256 text not null,
  phash text,
  frame_hashes jsonb not null default '[]'::jsonb,
  fingerprint_root text not null,
  duration numeric not null default 0,
  solana_signature text not null,
  mint_address text unique,
  metadata_uri text,
  ipfs_video_uri text,
  ipfs_thumbnail_uri text,
  license_fee_lamports bigint not null default 0,
  license_model text not null default 'flat',
  license_split jsonb,
  phash_bucket0 smallint,
  registered_at timestamptz not null default now(),
  status text not null default 'active'
);

-- Ensure phash_bucket0 and other new columns exist before creating their indexes
alter table proofs add column if not exists phash text;
alter table proofs add column if not exists mint_address text unique;
alter table proofs add column if not exists ipfs_video_uri text;
alter table proofs add column if not exists ipfs_thumbnail_uri text;
alter table proofs add column if not exists license_fee_lamports bigint default 0;
alter table proofs add column if not exists license_model text default 'flat';
alter table proofs add column if not exists license_split jsonb;
alter table proofs add column if not exists phash_bucket0 smallint;

create index if not exists proofs_sha256_idx on proofs (sha256);
create index if not exists proofs_fingerprint_root_idx on proofs (fingerprint_root);
create index if not exists proofs_creator_wallet_idx on proofs (creator_wallet);
create index if not exists proofs_mint_address_idx on proofs (mint_address);
create index if not exists proofs_phash_bucket0_idx on proofs (phash_bucket0);

create table if not exists verifications (
  id text primary key,
  uploaded_sha256 text not null,
  uploaded_fingerprint_root text not null,
  uploaded_phash text,
  match_type text not null,
  confidence numeric not null,
  matched_proof_id text references proofs(id) on delete set null,
  certificate_url text,
  created_at timestamptz not null default now()
);

create table if not exists nft_certificates (
  mint_address text primary key,
  proof_id text references proofs(id) on delete set null,
  creator_wallet text not null,
  title text not null,
  description text,
  sha256 text not null,
  phash text not null,
  metadata_uri text not null,
  ipfs_video_uri text,
  ipfs_thumbnail_uri text,
  solana_signature text,
  registered_at timestamptz not null default now()
);

create table if not exists licenses (
  id text primary key,
  proof_id text not null references proofs(id) on delete cascade,
  buyer_wallet text not null,
  seller_wallet text not null,
  license_model text not null,
  fee_lamports bigint not null,
  split_config jsonb,
  license_token_mint text unique,
  solana_signature text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists licenses_proof_id_idx on licenses (proof_id);
create index if not exists licenses_buyer_wallet_idx on licenses (buyer_wallet);
create index if not exists licenses_seller_wallet_idx on licenses (seller_wallet);
create index if not exists licenses_buyer_wallet_created_idx on licenses (buyer_wallet, created_at desc);
create index if not exists licenses_proof_id_created_idx on licenses (proof_id, created_at desc);
create index if not exists licenses_signature_idx on licenses (solana_signature);

create table if not exists disputes (
  id text primary key,
  proof_id text not null references proofs(id) on delete cascade,
  claimant_wallet text not null,
  accused_wallet text not null,
  accused_url text,
  reason text not null,
  evidence jsonb,
  filing_fee_lamports bigint not null default 10000000,
  filing_signature text not null unique,
  response_deadline timestamptz not null,
  response_text text,
  response_signature text,
  resolution text,
  resolution_note text,
  resolution_signature text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists disputes_proof_id_idx on disputes (proof_id);
create index if not exists disputes_claimant_idx on disputes (claimant_wallet);
create index if not exists disputes_accused_idx on disputes (accused_wallet);
create index if not exists disputes_status_idx on disputes (status);

create table if not exists api_keys (
  id text primary key,
  owner_wallet text not null,
  key_hash text not null unique,
  label text,
  monthly_quota integer not null default 10000,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists api_usage (
  id bigserial primary key,
  api_key_id text not null references api_keys(id) on delete cascade,
  route text not null,
  status_code integer not null,
  occurred_at timestamptz not null default now()
);

create index if not exists api_usage_key_time_idx on api_usage (api_key_id, occurred_at desc);

-- ── Idempotent upgrade alters (safe to re-run) ─────────────────────────────

-- Remove legacy columns (no-op if already dropped)
alter table users drop column if exists password_hash;
alter table users drop column if exists google_sub;
alter table users drop column if exists google_email;
alter table users drop column if exists google_linked_at;

-- Add new columns to users (no-op if already exist)
alter table users add column if not exists display_name text;
alter table users add column if not exists wallet_address text unique;
alter table users add column if not exists wallet_linked_at timestamptz;
alter table users add column if not exists email text;

-- Backfill wallet_linked_at
update users set wallet_linked_at = created_at where wallet_address is not null and wallet_linked_at is null;


alter table verifications add column if not exists uploaded_phash text;
