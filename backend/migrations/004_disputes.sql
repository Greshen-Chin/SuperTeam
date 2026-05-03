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
