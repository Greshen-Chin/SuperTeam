alter table proofs add column if not exists phash_bucket0 smallint;
create index if not exists proofs_phash_bucket0_idx on proofs (phash_bucket0);
