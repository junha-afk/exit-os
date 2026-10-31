-- ExitOS Supabase schema.
-- Apply to a new project or use a reviewed migration for an existing database.
-- The application must access these tables only from server code with the service-role key.

begin;

create extension if not exists pgcrypto;

create table if not exists stores (
  id text primary key,
  name text not null,
  is_anonymous boolean not null default false,
  industry text,
  region text,
  intro text,
  photos text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Structured seller inputs and document-read values. `note` stores source evidence.
create table if not exists store_facts (
  store_id text not null references stores(id) on delete cascade,
  key text not null,
  value jsonb not null,
  provenance text not null default 'user_input'
    check (provenance in ('verified', 'user_input', 'needs_check')),
  note text,
  updated_at timestamptz not null default now(),
  primary key (store_id, key)
);

-- One row per uploaded file; the original binary is not stored in this table.
create table if not exists uploaded_documents (
  id text primary key,
  store_id text not null references stores(id) on delete cascade,
  requested_kind text not null,
  detected_kind text not null,
  filename text not null,
  mime text not null default '',
  read_by text not null check (read_by in ('code_table', 'llm_document')),
  summary text not null default '',
  filled_facts text[] not null default '{}',
  record_count integer not null default 0 check (record_count >= 0),
  unreadable boolean not null default false,
  notes text[] not null default '{}',
  uploaded_at timestamptz not null default now()
);

create index if not exists uploaded_documents_store_uploaded_idx
  on uploaded_documents (store_id, uploaded_at desc);

-- Request state used by the diagnosis flow, including "not available" responses.
create table if not exists document_request_states (
  store_id text not null references stores(id) on delete cascade,
  kind text not null,
  status text not null check (status in ('requested', 'received', 'declined')),
  summary text,
  updated_at timestamptz not null default now(),
  primary key (store_id, kind)
);

-- Matches FinancialRow: date/month, arbitrary catalog fields, read method, and source document.
create table if not exists financial_records (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references stores(id) on delete cascade,
  document_id text not null references uploaded_documents(id) on delete cascade,
  kind text not null check (kind in (
    'pos', 'card_settlement', 'delivery', 'purchases', 'fixed', 'payroll',
    'cash_receipt', 'bank_deposit'
  )),
  date text not null check (date ~ '^[0-9]{4}-(0[1-9]|1[0-2])(-[0-9]{2})?$'),
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  fields jsonb not null default '{}',
  read_by text not null check (read_by in ('code_table', 'llm_document')),
  created_at timestamptz not null default now()
);

create index if not exists financial_records_store_kind_month_idx
  on financial_records (store_id, kind, month);
create index if not exists financial_records_document_idx
  on financial_records (document_id);

-- Persistable shape of the current in-memory InterviewState.
create table if not exists interview_sessions (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references stores(id) on delete cascade,
  mode text not null check (mode in ('diagnosis', 'knowhow')),
  state jsonb not null default '{"history":[],"current":null,"turn":0,"requestsMade":0}'::jsonb,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists interview_sessions_store_mode_idx
  on interview_sessions (store_id, mode, updated_at desc);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references stores(id) on delete cascade,
  status text not null default 'published' check (status in ('draft', 'published', 'closed')),
  premium_ask bigint,
  deposit bigint,
  monthly_rent bigint,
  maintenance_fee bigint,
  est_initial_cost bigint,
  premium_breakdown jsonb,
  premium_breakdown_level text not null default 'approved'
    check (premium_breakdown_level in ('public', 'approved')),
  created_at timestamptz not null default now()
);

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references stores(id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists analyses_store_created_idx
  on analyses (store_id, created_at desc);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references stores(id) on delete cascade,
  listing_id uuid references listings(id) on delete set null,
  kind text not null check (kind in ('seller', 'buyer_risk')),
  content jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  status text not null default 'in_progress',
  created_at timestamptz not null default now()
);

create table if not exists handover_tasks (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  stage text not null,
  category text not null,
  title text not null,
  description text,
  checklist jsonb not null default '[]',
  owner text not null check (owner in ('seller', 'buyer', 'both')),
  priority text not null default 'normal',
  status text not null default 'todo' check (status in ('todo', 'doing', 'done', 'blocked')),
  due_date date,
  depends_on uuid[] not null default '{}',
  sort integer not null default 0
);

create index if not exists handover_tasks_deal_stage_idx
  on handover_tasks (deal_id, stage);

-- No client-facing policies are defined. RLS denies anon/authenticated access;
-- server-side service-role access bypasses RLS and must never reach browser code.
alter table stores enable row level security;
alter table store_facts enable row level security;
alter table uploaded_documents enable row level security;
alter table document_request_states enable row level security;
alter table financial_records enable row level security;
alter table interview_sessions enable row level security;
alter table listings enable row level security;
alter table analyses enable row level security;
alter table reports enable row level security;
alter table deals enable row level security;
alter table handover_tasks enable row level security;

revoke all on table
  stores, store_facts, uploaded_documents, document_request_states, financial_records,
  interview_sessions, listings, analyses, reports, deals, handover_tasks
from anon, authenticated;

grant all on table
  stores, store_facts, uploaded_documents, document_request_states, financial_records,
  interview_sessions, listings, analyses, reports, deals, handover_tasks
to service_role;

commit;
