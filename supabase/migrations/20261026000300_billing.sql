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
