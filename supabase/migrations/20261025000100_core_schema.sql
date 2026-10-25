-- Core schema: organizations, users, referential, testers, equipment,
-- candidates, sessions, results, certificates and audit log.
-- Every business table carries organization_id (multi-tenant isolation by RLS).

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin', 'secretariat', 'tester');
create type public.session_status as enum ('draft', 'planned', 'in_progress', 'closed');
create type public.practical_status as enum ('pending', 'incomplete', 'passed', 'failed');
create type public.theory_kind as enum ('qcm', 'qcm_ipr');
create type public.identity_document_type as enum ('cni', 'passport', 'residence_permit', 'driving_license');

create or replace function public.random_token(bytes integer default 24)
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(bytes), 'base64'), '+/=', '-_');
$$;

-- Organizations (one per OTC) ------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  siret text not null check (siret ~ '^[0-9]{14}$'),
  certificate_prefix text not null check (certificate_prefix ~ '^[A-Z0-9]{2,10}$'),
  -- GDPR: how long personal data of candidates is kept after their last certificate expires.
  retention_months integer not null default 120 check (retention_months between 12 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (siret)
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role public.app_role not null,
  full_name text not null,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_organization_idx on public.profiles (organization_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.app_role not null,
  token text not null unique default public.random_token(),
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invitations_organization_idx on public.invitations (organization_id);

-- Referential (copied per organization from the reference_* templates) -------

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  label text not null,
  validity_years integer not null check (validity_years between 1 and 20),
  theory_pass_percent numeric(5, 2) not null default 70 check (theory_pass_percent between 0 and 100),
  requires_ipr boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  recommendation_id uuid not null,
  code text not null,
  label text not null,
  -- Overrides the recommendation's validity when set.
  validity_years integer check (validity_years between 1 and 20),
  practical_duration_minutes integer check (practical_duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (recommendation_id, organization_id)
    references public.recommendations (id, organization_id) on delete cascade,
  unique (recommendation_id, code),
  unique (id, organization_id)
);

create table public.grids (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category_id uuid not null,
  name text not null,
  version integer not null default 1 check (version > 0),
  is_active boolean not null default true,
  -- Example grid shipped with the product: not official, to be validated.
  is_example boolean not null default false,
  pass_score numeric(5, 2) not null default 70 check (pass_score between 0 and 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, organization_id)
    references public.categories (id, organization_id) on delete cascade,
  unique (category_id, version),
  unique (id, organization_id)
);
create unique index grids_one_active_per_category on public.grids (category_id) where is_active;

create table public.grid_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  grid_id uuid not null,
  position integer not null check (position > 0),
  label text not null,
  description text,
  max_points numeric(6, 2) not null check (max_points >= 0),
  eliminatory boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (grid_id, organization_id)
    references public.grids (id, organization_id) on delete cascade,
  unique (grid_id, position),
  unique (id, organization_id)
);

-- Testers and equipment ------------------------------------------------------

create table public.testers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.tester_qualifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  tester_id uuid not null,
  category_id uuid not null,
  granted_on date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tester_id, organization_id) references public.testers (id, organization_id) on delete cascade,
  foreign key (category_id, organization_id) references public.categories (id, organization_id) on delete cascade,
  unique (tester_id, category_id)
);

-- The tester's own CACES®, which must be issued by another OTC.
create table public.tester_personal_caces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  tester_id uuid not null,
  category_id uuid not null,
  certificate_number text not null,
  issuer_name text not null,
  issuer_siret text not null check (issuer_siret ~ '^[0-9]{14}$'),
  expires_on date not null,
  document_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tester_id, organization_id) references public.testers (id, organization_id) on delete cascade,
  foreign key (category_id, organization_id) references public.categories (id, organization_id) on delete cascade
);
create index tester_personal_caces_tester_idx on public.tester_personal_caces (tester_id);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category_id uuid not null,
  name text not null,
  brand_model text,
  serial_number text not null,
  last_inspection_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, organization_id) references public.categories (id, organization_id),
  unique (organization_id, serial_number),
  unique (id, organization_id)
);

-- Clients and candidates -----------------------------------------------------

create table public.client_companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  siret text check (siret ~ '^[0-9]{14}$'),
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  last_name text not null,
  first_name text not null,
  birth_date date not null,
  email text,
  photo_path text,
  client_company_id uuid,
  -- Trainer, when known: a tester of the OTC and/or a free-text name.
  trainer_tester_id uuid,
  trainer_name text,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_company_id, organization_id) references public.client_companies (id, organization_id),
  foreign key (trainer_tester_id, organization_id) references public.testers (id, organization_id),
  unique (id, organization_id)
);
create index candidates_organization_idx on public.candidates (organization_id, last_name);

-- Sessions -------------------------------------------------------------------

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  location text not null,
  status public.session_status not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  unique (id, organization_id)
);
create index sessions_organization_idx on public.sessions (organization_id, starts_on);

create table public.session_testers (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  session_id uuid not null,
  tester_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (session_id, tester_id),
  foreign key (session_id, organization_id) references public.sessions (id, organization_id) on delete cascade,
  foreign key (tester_id, organization_id) references public.testers (id, organization_id)
);

create table public.session_equipment (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  session_id uuid not null,
  equipment_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (session_id, equipment_id),
  foreign key (session_id, organization_id) references public.sessions (id, organization_id) on delete cascade,
  foreign key (equipment_id, organization_id) references public.equipment (id, organization_id)
);

create table public.session_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  session_id uuid not null,
  candidate_id uuid not null,
  identity_document_type public.identity_document_type,
  identity_document_number text,
  identity_verified boolean not null default false,
  identity_verified_at timestamptz,
  identity_verified_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id, organization_id) references public.sessions (id, organization_id) on delete cascade,
  foreign key (candidate_id, organization_id) references public.candidates (id, organization_id),
  unique (session_id, candidate_id),
  unique (id, organization_id),
  check (
    not identity_verified
    or (identity_document_type is not null
        and length(trim(coalesce(identity_document_number, ''))) > 0
        and identity_verified_at is not null)
  )
);

-- Results --------------------------------------------------------------------

create table public.theory_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  session_candidate_id uuid not null,
  recommendation_id uuid not null,
  kind public.theory_kind not null,
  score numeric(6, 2) not null check (score >= 0),
  max_score numeric(6, 2) not null check (max_score > 0),
  passed boolean not null,
  taken_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (score <= max_score),
  foreign key (session_candidate_id, organization_id)
    references public.session_candidates (id, organization_id) on delete cascade,
  foreign key (recommendation_id, organization_id) references public.recommendations (id, organization_id),
  unique (session_candidate_id, recommendation_id, kind)
);

-- One practical test = one candidate of a session, one category.
create table public.practical_tests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  session_candidate_id uuid not null,
  category_id uuid not null,
  grid_id uuid not null,
  tester_id uuid,
  equipment_id uuid,
  test_date date not null,
  status public.practical_status not null default 'pending',
  score numeric(5, 2) check (score between 0 and 100),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds >= 0),
  tester_signature_path text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_candidate_id, organization_id)
    references public.session_candidates (id, organization_id) on delete cascade,
  foreign key (category_id, organization_id) references public.categories (id, organization_id),
  foreign key (grid_id, organization_id) references public.grids (id, organization_id),
  foreign key (tester_id, organization_id) references public.testers (id, organization_id),
  foreign key (equipment_id, organization_id) references public.equipment (id, organization_id),
  unique (session_candidate_id, category_id),
  unique (id, organization_id),
  check (status not in ('passed', 'failed') or (signed_at is not null and tester_signature_path is not null))
);
create index practical_tests_tester_idx on public.practical_tests (tester_id, test_date);

-- One row per grid criterion.
create table public.practical_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  practical_test_id uuid not null,
  grid_item_id uuid not null,
  points numeric(6, 2) not null check (points >= 0),
  eliminatory_fault boolean not null default false,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (practical_test_id, organization_id)
    references public.practical_tests (id, organization_id) on delete cascade,
  foreign key (grid_item_id, organization_id) references public.grid_items (id, organization_id),
  unique (practical_test_id, grid_item_id)
);

-- Certificates (immutable once issued, may only be revoked) ------------------

create table public.certificate_sequences (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  year integer not null,
  last_value integer not null default 0,
  primary key (organization_id, year)
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  number text not null unique,
  candidate_id uuid not null,
  recommendation_id uuid not null,
  session_id uuid not null,
  -- Snapshot of the holder at issue time: the certificate never changes.
  holder_last_name text not null,
  holder_first_name text not null,
  holder_birth_date date not null,
  holder_photo_path text,
  recommendation_code text not null,
  recommendation_label text not null,
  issued_on date not null,
  expires_on date not null,
  verification_token text not null unique default public.random_token(24),
  pdf_path text,
  issued_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  revocation_reason text,
  revoked_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (candidate_id, organization_id) references public.candidates (id, organization_id),
  foreign key (recommendation_id, organization_id) references public.recommendations (id, organization_id),
  foreign key (session_id, organization_id) references public.sessions (id, organization_id),
  unique (id, organization_id),
  check (expires_on > issued_on),
  check (revoked_at is null or length(trim(coalesce(revocation_reason, ''))) > 0)
);
create index certificates_organization_idx on public.certificates (organization_id, expires_on);

create table public.certificate_categories (
  organization_id uuid not null references public.organizations (id) on delete restrict,
  certificate_id uuid not null,
  category_id uuid not null,
  category_code text not null,
  category_label text not null,
  practical_test_id uuid not null,
  primary key (certificate_id, category_id),
  foreign key (certificate_id, organization_id) references public.certificates (id, organization_id),
  foreign key (category_id, organization_id) references public.categories (id, organization_id),
  foreign key (practical_test_id, organization_id) references public.practical_tests (id, organization_id)
);

-- Audit log -------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations (id) on delete cascade,
  actor_id uuid,
  action text not null,
  table_name text,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_organization_idx on public.audit_log (organization_id, created_at desc);
create index audit_log_record_idx on public.audit_log (table_name, record_id);
