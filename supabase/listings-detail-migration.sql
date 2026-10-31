-- Apply once to an existing project before deploying listing persistence.
alter table listings
  add column if not exists detail jsonb not null default '{}'::jsonb;
