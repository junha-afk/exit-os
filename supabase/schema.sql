-- ExitOS 해커톤 스키마 (Supabase SQL Editor에 그대로 실행)
-- 해커톤용: Auth/RLS 미사용. 서버(service role)에서만 접근한다. 프로덕션 전에 RLS 필수.

create extension if not exists pgcrypto;

create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_anonymous boolean not null default false,
  industry text,
  region text,
  intro text,
  photos text[] default '{}',
  created_at timestamptz default now()
);

-- 인터뷰/폼으로 채우는 정성 정보. key는 FACT_KEYS 참고
create table store_facts (
  store_id uuid references stores(id) on delete cascade,
  key text not null,
  value jsonb,
  provenance text not null default 'user_input'
    check (provenance in ('verified','user_input','needs_check')),
  updated_at timestamptz default now(),
  primary key (store_id, key)
);

-- 업로드 CSV를 정규화한 행
create table financial_records (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  kind text not null check (kind in ('pos','card_settlement','delivery','purchases','fixed','payroll')),
  month text not null,                 -- 'YYYY-MM'
  category text,                       -- channel / platform / vendor / item / role
  amount bigint not null,              -- 원
  extra jsonb default '{}',            -- fees, net_payout, hours, included_in_pos 등
  dedupe_key text not null,
  is_duplicate boolean not null default false,
  created_at timestamptz default now(),
  unique (store_id, dedupe_key)
);

create table interview_sessions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  mode text not null check (mode in ('diagnosis','knowhow')),
  messages jsonb not null default '[]', -- [{role:'ai'|'user', text, at}]
  done boolean not null default false,
  created_at timestamptz default now()
);

create table analyses (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  result jsonb not null,               -- AnalysisResult
  created_at timestamptz default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  listing_id uuid,
  kind text not null check (kind in ('seller','buyer_risk')),
  content jsonb not null,
  created_at timestamptz default now()
);

create table listings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  status text not null default 'published' check (status in ('draft','published','closed')),
  premium_ask bigint,                  -- 희망 권리금
  deposit bigint,                      -- 임대보증금
  monthly_rent bigint,
  maintenance_fee bigint,
  est_initial_cost bigint,             -- 예상 초기 인수 비용
  premium_breakdown jsonb,             -- {facility, goodwill, other}
  premium_breakdown_level text not null default 'approved'
    check (premium_breakdown_level in ('public','approved')),
  created_at timestamptz default now()
);

create table deals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  status text not null default 'in_progress',
  created_at timestamptz default now()
);

create table handover_tasks (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  stage text not null,
  category text not null,
  title text not null,
  description text,
  checklist jsonb default '[]',
  owner text not null check (owner in ('seller','buyer','both')),
  priority text not null default 'normal',
  status text not null default 'todo' check (status in ('todo','doing','done','blocked')),
  due_date date,
  depends_on uuid[] default '{}',
  sort int default 0
);

create index on financial_records (store_id, kind, month);
create index on handover_tasks (deal_id, stage);
