import pg from "pg";
import { config } from "./config.js";

export const pool: pg.Pool | null = config.databaseUrl
  ? new pg.Pool({
      connectionString: config.databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    })
  : null;

export function requirePool(): pg.Pool {
  if (!pool) {
    const err = new Error("DATABASE_URL is not configured.") as Error & { code: string };
    err.code = "ENOTFOUND";
    throw err;
  }
  return pool;
}

export async function migrate() {
  await requirePool().query(`
    create table if not exists users (
      id text primary key,
      email text unique,
      password_hash text,
      google_sub text unique,
      google_email text unique,
      google_linked_at timestamptz,
      wallet_address text unique,
      wallet_linked_at timestamptz,
      created_at timestamptz not null default now()
    );

    alter table users add column if not exists password_hash text;
    alter table users add column if not exists google_sub text unique;
    alter table users add column if not exists google_email text unique;
    alter table users add column if not exists google_linked_at timestamptz;
    alter table users add column if not exists wallet_linked_at timestamptz;

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
      registered_at timestamptz not null default now(),
      status text not null default 'active'
    );

    create index if not exists proofs_sha256_idx on proofs (sha256);
    create index if not exists proofs_fingerprint_root_idx on proofs (fingerprint_root);
    create index if not exists proofs_creator_wallet_idx on proofs (creator_wallet);
    create index if not exists proofs_creator_wallet_registered_idx on proofs (creator_wallet, registered_at desc);
    create index if not exists proofs_status_registered_idx on proofs (status, registered_at desc);
    create index if not exists proofs_mint_address_idx on proofs (mint_address);

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

    alter table proofs add column if not exists phash text;
    alter table proofs add column if not exists mint_address text unique;
    alter table proofs add column if not exists ipfs_video_uri text;
    alter table proofs add column if not exists ipfs_thumbnail_uri text;
    alter table proofs add column if not exists license_fee_lamports bigint not null default 0;
    alter table proofs add column if not exists license_model text not null default 'flat';
    alter table proofs add column if not exists license_split jsonb;
    alter table proofs add column if not exists phash_bucket0 smallint;
    create index if not exists proofs_phash_bucket0_idx on proofs (phash_bucket0);
    create index if not exists proofs_listed_active_registered_idx on proofs (registered_at desc)
      where license_fee_lamports > 0 and status = 'active';
    create index if not exists proofs_listed_active_creator_registered_idx on proofs (creator_wallet, registered_at desc)
      where license_fee_lamports > 0 and status = 'active';
    alter table verifications add column if not exists uploaded_phash text;
  `);
}
