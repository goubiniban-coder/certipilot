-- Renewal reminders: one row per e-mail sent, so a certificate is reminded at most once per milestone.

create table public.renewal_reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  certificate_id uuid not null references public.certificates (id) on delete cascade,
  milestone text not null check (milestone in ('6_months', '2_months')),
  recipients text[] not null,
  sent_at timestamptz not null default now(),
  unique (certificate_id, milestone)
);

alter table public.renewal_reminders enable row level security;
revoke all on public.renewal_reminders from anon;

-- Members read their organization's reminders; rows are written by the daily job (service role) only.
create policy renewal_reminders_select on public.renewal_reminders
  for select to authenticated using (organization_id = public.auth_org_id());
