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
