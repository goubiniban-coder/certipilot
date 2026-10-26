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
-- Client company portal: employers sign in and see the certificates of their own employees.
-- Company users are NOT staff: they have no profile, so none of the organization-wide policies apply to them.
-- Everything they read goes through the security-definer functions below, scoped to their company.

create table public.company_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_company_id uuid not null,
  full_name text not null,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (client_company_id, organization_id)
    references public.client_companies (id, organization_id) on delete cascade
);
create index company_users_company_idx on public.company_users (client_company_id);

create table public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_company_id uuid not null,
  email text not null,
  full_name text not null,
  token text not null unique default public.random_token(),
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (client_company_id, organization_id)
    references public.client_companies (id, organization_id) on delete cascade
);
create index company_invitations_company_idx on public.company_invitations (client_company_id);

alter table public.company_users enable row level security;
alter table public.company_invitations enable row level security;
revoke all on public.company_users, public.company_invitations from anon;

create policy company_users_select on public.company_users
  for select to authenticated
  using (user_id = auth.uid() or (organization_id = public.auth_org_id() and public.has_role('{admin,secretariat}')));
create policy company_users_update on public.company_users
  for update to authenticated
  using (organization_id = public.auth_org_id() and public.has_role('{admin,secretariat}'))
  with check (organization_id = public.auth_org_id());

create policy company_invitations_all on public.company_invitations
  for all to authenticated
  using (organization_id = public.auth_org_id() and public.has_role('{admin,secretariat}'))
  with check (organization_id = public.auth_org_id() and public.has_role('{admin,secretariat}'));

-- Invitation lookup (public, like get_invitation) --------------------------------

create or replace function public.get_company_invitation(p_token text)
returns table (email text, full_name text, company_name text, organization_name text, valid boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select i.email, i.full_name, c.name, o.name,
         i.accepted_at is null and i.expires_at > now()
  from public.company_invitations i
  join public.client_companies c on c.id = i.client_company_id and c.organization_id = i.organization_id
  join public.organizations o on o.id = i.organization_id
  where i.token = p_token;
$$;

create or replace function public.accept_company_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_invitation public.company_invitations;
begin
  if v_user_id is null then
    raise exception 'Vous devez être connecté pour accepter une invitation.' using hint = 'NOT_AUTHENTICATED';
  end if;

  select * into v_invitation from public.company_invitations where token = p_token for update;
  if not found or v_invitation.accepted_at is not null or v_invitation.expires_at < now() then
    raise exception 'Cette invitation n''est plus valide. Demandez-en une nouvelle à votre organisme testeur.'
      using hint = 'INVITATION_INVALID';
  end if;

  select email into v_email from auth.users where id = v_user_id;
  if lower(v_email) <> lower(v_invitation.email) then
    raise exception 'Cette invitation a été envoyée à une autre adresse e-mail.' using hint = 'INVITATION_EMAIL_MISMATCH';
  end if;
  if exists (select 1 from public.profiles where id = v_user_id)
     or exists (select 1 from public.company_users where user_id = v_user_id) then
    raise exception 'Ce compte est déjà rattaché à un organisme ou à une entreprise.' using hint = 'ALREADY_MEMBER';
  end if;

  insert into public.company_users (user_id, organization_id, client_company_id, full_name, email)
  values (v_user_id, v_invitation.organization_id, v_invitation.client_company_id, v_invitation.full_name, v_email);

  update public.company_invitations set accepted_at = now() where id = v_invitation.id;
  return v_invitation.client_company_id;
end;
$$;

-- Portal data: only the caller's own company ---------------------------------------

create or replace function public.company_portal_info()
returns table (full_name text, company_name text, organization_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select cu.full_name, c.name, o.name
  from public.company_users cu
  join public.client_companies c on c.id = cu.client_company_id and c.organization_id = cu.organization_id
  join public.organizations o on o.id = cu.organization_id
  where cu.user_id = auth.uid() and cu.active;
$$;

create or replace function public.company_portal_certificates()
returns table (
  number text, holder_name text, recommendation_code text, recommendation_label text,
  issued_on date, expires_on date, status text, verification_token text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.number,
         c.holder_first_name || ' ' || c.holder_last_name,
         c.recommendation_code, c.recommendation_label, c.issued_on, c.expires_on,
         case when c.revoked_at is not null then 'revoked'
              when c.expires_on < current_date then 'expired'
              else 'valid' end,
         c.verification_token
  from public.certificates c
  join public.candidates ca on ca.id = c.candidate_id and ca.organization_id = c.organization_id
  join public.company_users cu
    on cu.client_company_id = ca.client_company_id and cu.organization_id = c.organization_id
  where cu.user_id = auth.uid() and cu.active
  order by c.expires_on;
$$;

revoke execute on function
  public.get_company_invitation(text), public.accept_company_invitation(text),
  public.company_portal_info(), public.company_portal_certificates()
from public, anon;
grant execute on function public.get_company_invitation(text) to anon, authenticated, service_role;
grant execute on function
  public.accept_company_invitation(text), public.company_portal_info(), public.company_portal_certificates()
to authenticated, service_role;
-- Quotes and invoices. Numbers are chronological and gap-free per organization, kind and year.

alter table public.organizations
  add column address text,
  add column vat_number text;

create table public.billing_sequences (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('quote', 'invoice')),
  year integer not null,
  last_value integer not null default 0,
  primary key (organization_id, kind, year)
);

create table public.billing_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('quote', 'invoice')),
  number text not null,
  client_company_id uuid,
  title text not null check (length(trim(title)) > 0),
  issued_on date not null default current_date,
  due_on date,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'paid', 'cancelled')),
  vat_rate numeric(4, 2) not null default 20 check (vat_rate between 0 and 100),
  -- [{ "label": text, "quantity": number, "unit_price_cents": integer }]
  lines jsonb not null check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) > 0),
  notes text,
  source_quote_id uuid references public.billing_documents (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_company_id, organization_id)
    references public.client_companies (id, organization_id),
  unique (organization_id, kind, number)
);
create index billing_documents_org_idx on public.billing_documents (organization_id, issued_on desc);

create or replace function public.assign_billing_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer := extract(year from new.issued_on);
  v_value integer;
begin
  insert into public.billing_sequences as s (organization_id, kind, year, last_value)
  values (new.organization_id, new.kind, v_year, 1)
  on conflict (organization_id, kind, year) do update set last_value = s.last_value + 1
  returning last_value into v_value;
  new.number := case new.kind when 'quote' then 'DEV' else 'FAC' end
    || '-' || v_year || '-' || lpad(v_value::text, 4, '0');
  return new;
end;
$$;

create trigger billing_documents_number
  before insert on public.billing_documents
  for each row execute function public.assign_billing_number();

-- An issued invoice can only change status: its content is what the client was billed.
create or replace function public.protect_issued_invoice()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if old.kind = 'invoice' and old.status <> 'draft' and (
    new.number is distinct from old.number or new.lines is distinct from old.lines
    or new.client_company_id is distinct from old.client_company_id
    or new.vat_rate is distinct from old.vat_rate or new.issued_on is distinct from old.issued_on
    or new.kind is distinct from old.kind
  ) then
    raise exception 'Une facture émise ne peut plus être modifiée.' using hint = 'INVOICE_LOCKED';
  end if;
  if new.number is distinct from old.number then
    raise exception 'Le numéro ne peut pas être modifié.';
  end if;
  return new;
end;
$$;

create trigger billing_documents_protect
  before update on public.billing_documents
  for each row execute function public.protect_issued_invoice();

alter table public.billing_documents enable row level security;
alter table public.billing_sequences enable row level security;
revoke all on public.billing_documents, public.billing_sequences from anon;

create policy billing_documents_select on public.billing_documents
  for select to authenticated using (organization_id = public.auth_org_id() and public.has_role('{admin,secretariat}'));
create policy billing_documents_insert on public.billing_documents
  for insert to authenticated with check (organization_id = public.auth_org_id() and public.has_role('{admin,secretariat}'));
create policy billing_documents_update on public.billing_documents
  for update to authenticated
  using (organization_id = public.auth_org_id() and public.has_role('{admin,secretariat}'))
  with check (organization_id = public.auth_org_id());
-- Only draft quotes can be deleted; invoices are cancelled, never removed (numbering continuity).
create policy billing_documents_delete on public.billing_documents
  for delete to authenticated
  using (organization_id = public.auth_org_id() and public.has_role('{admin,secretariat}')
         and kind = 'quote' and status = 'draft');

revoke execute on function public.assign_billing_number(), public.protect_issued_invoice() from public, anon, authenticated;
