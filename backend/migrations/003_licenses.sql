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

alter table proofs add column if not exists license_fee_lamports bigint default 0;
alter table proofs add column if not exists license_model text default 'flat';
alter table proofs add column if not exists license_split jsonb;
