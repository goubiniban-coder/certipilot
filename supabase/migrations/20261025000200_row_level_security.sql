-- Row Level Security: a user only sees and changes the data of their own
-- organization, with write rights depending on their role.

create or replace function public.auth_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.organization_id from public.profiles p where p.id = auth.uid() and p.active;
$$;

create or replace function public.auth_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.active;
$$;

create or replace function public.auth_tester_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select t.id
  from public.testers t
  join public.profiles p on p.id = t.profile_id
  where t.profile_id = auth.uid() and p.active and t.active;
$$;

create or replace function public.has_role(roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.auth_role() = any (roles), false);
$$;

-- True when the current tester is assigned to the session.
create or replace function public.is_session_tester(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.session_testers st
    where st.session_id = p_session_id and st.tester_id = public.auth_tester_id()
  );
$$;

revoke all on function public.auth_org_id(), public.auth_role(), public.auth_tester_id(),
  public.has_role(public.app_role[]), public.is_session_tester(uuid) from public, anon;
grant execute on function public.auth_org_id(), public.auth_role(), public.auth_tester_id(),
  public.has_role(public.app_role[]), public.is_session_tester(uuid) to authenticated, service_role;

-- Enable RLS on every table -------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations', 'profiles', 'invitations', 'recommendations', 'categories', 'grids',
    'grid_items', 'testers', 'tester_qualifications', 'tester_personal_caces', 'equipment',
    'client_companies', 'candidates', 'sessions', 'session_testers', 'session_equipment',
    'session_candidates', 'theory_results', 'practical_tests', 'practical_results',
    'certificate_sequences', 'certificates', 'certificate_categories', 'audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;

-- Organizations and users ---------------------------------------------------

create policy organizations_select on public.organizations
  for select to authenticated using (id = public.auth_org_id());
create policy organizations_update on public.organizations
  for update to authenticated
  using (id = public.auth_org_id() and public.has_role('{admin}'))
  with check (id = public.auth_org_id());

create policy profiles_select on public.profiles
  for select to authenticated using (organization_id = public.auth_org_id());
create policy profiles_update on public.profiles
  for update to authenticated
  using (organization_id = public.auth_org_id() and public.has_role('{admin}'))
  with check (organization_id = public.auth_org_id());

create policy invitations_all on public.invitations
  for all to authenticated
  using (organization_id = public.auth_org_id() and public.has_role('{admin}'))
  with check (organization_id = public.auth_org_id() and public.has_role('{admin}'));

-- Referential: everyone reads, admins write ----------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['recommendations', 'categories', 'grids', 'grid_items'] loop
    execute format(
      'create policy %1$s_select on public.%1$I for select to authenticated
         using (organization_id = public.auth_org_id())', t);
    execute format(
      'create policy %1$s_write on public.%1$I for all to authenticated
         using (organization_id = public.auth_org_id() and public.has_role(''{admin}''))
         with check (organization_id = public.auth_org_id() and public.has_role(''{admin}''))', t);
  end loop;
end;
$$;

-- Back-office data: everyone reads, admins and secretariat write -------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'testers', 'tester_qualifications', 'tester_personal_caces', 'equipment',
    'client_companies', 'candidates', 'sessions', 'session_testers', 'session_equipment',
    'theory_results'
  ] loop
    execute format(
      'create policy %1$s_select on public.%1$I for select to authenticated
         using (organization_id = public.auth_org_id())', t);
    execute format(
      'create policy %1$s_write on public.%1$I for all to authenticated
         using (organization_id = public.auth_org_id() and public.has_role(''{admin,secretariat}''))
         with check (organization_id = public.auth_org_id() and public.has_role(''{admin,secretariat}''))', t);
  end loop;
end;
$$;

-- Testers also record the identity check of candidates of their sessions ----

create policy session_candidates_select on public.session_candidates
  for select to authenticated using (organization_id = public.auth_org_id());
create policy session_candidates_write on public.session_candidates
  for all to authenticated
  using (organization_id = public.auth_org_id() and public.has_role('{admin,secretariat}'))
  with check (organization_id = public.auth_org_id() and public.has_role('{admin,secretariat}'));
create policy session_candidates_tester_update on public.session_candidates
  for update to authenticated
  using (organization_id = public.auth_org_id() and public.is_session_tester(session_id))
  with check (organization_id = public.auth_org_id() and public.is_session_tester(session_id));

-- Practical tests: back office assigns, the assigned tester fills them in ---

create policy practical_tests_select on public.practical_tests
  for select to authenticated using (organization_id = public.auth_org_id());
create policy practical_tests_write on public.practical_tests
  for all to authenticated
  using (organization_id = public.auth_org_id() and public.has_role('{admin,secretariat}'))
  with check (organization_id = public.auth_org_id() and public.has_role('{admin,secretariat}'));
create policy practical_tests_tester_update on public.practical_tests
  for update to authenticated
  using (organization_id = public.auth_org_id() and tester_id = public.auth_tester_id())
  with check (organization_id = public.auth_org_id() and tester_id = public.auth_tester_id());

create policy practical_results_select on public.practical_results
  for select to authenticated using (organization_id = public.auth_org_id());
create policy practical_results_tester_write on public.practical_results
  for all to authenticated
  using (
    organization_id = public.auth_org_id()
    and exists (
      select 1 from public.practical_tests pt
      where pt.id = practical_test_id and pt.tester_id = public.auth_tester_id()
    )
  )
  with check (
    organization_id = public.auth_org_id()
    and exists (
      select 1 from public.practical_tests pt
      where pt.id = practical_test_id and pt.tester_id = public.auth_tester_id()
    )
  );

-- Certificates: read only; issued and revoked through functions -------------

create policy certificates_select on public.certificates
  for select to authenticated using (organization_id = public.auth_org_id());
create policy certificate_categories_select on public.certificate_categories
  for select to authenticated using (organization_id = public.auth_org_id());

-- Audit log: admins read; rows are written by triggers and functions only ---

create policy audit_log_select on public.audit_log
  for select to authenticated
  using (organization_id = public.auth_org_id() and public.has_role('{admin}'));

-- certificate_sequences: no policy, only reachable from security definer functions.
