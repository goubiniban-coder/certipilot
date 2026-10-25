-- Step 12 hardening.

-- 1. Testers write only what the field app needs. RLS lets them update the
--    candidates and tests of their own sessions; these triggers keep every
--    other column (candidate, session, category, grid, equipment, date...) as
--    the back office set it.

create or replace function public.guard_tester_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed text[];
begin
  if public.auth_role() is distinct from 'tester' then
    return new;
  end if;

  v_allowed := case tg_table_name
    when 'session_candidates' then array[
      'identity_document_type', 'identity_document_number', 'identity_verified',
      'identity_verified_at', 'identity_verified_by', 'updated_at']
    when 'practical_tests' then array[
      'started_at', 'ended_at', 'duration_seconds', 'status', 'score',
      'tester_signature_path', 'signed_at', 'updated_at']
  end;

  if (to_jsonb(new) - v_allowed) is distinct from (to_jsonb(old) - v_allowed) then
    raise exception 'Un testeur ne peut modifier que le contrôle d''identité et le déroulé de ses épreuves.'
      using hint = 'FORBIDDEN';
  end if;

  if tg_table_name = 'session_candidates' then
    -- Who checked the identity is the signed-in tester, whatever the app sent.
    new.identity_verified_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger guard_tester_changes
  before update on public.session_candidates
  for each row execute function public.guard_tester_changes();

create trigger guard_tester_changes
  before update on public.practical_tests
  for each row execute function public.guard_tester_changes();

-- 2. GDPR purge: also returns the photo files to delete from Storage (the
--    database cannot reach the bucket itself).

drop function public.anonymize_expired_candidates();

create function public.anonymize_expired_candidates()
returns table (anonymized_count integer, photo_paths text[])
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('{admin}') then
    raise exception 'Seul un responsable du centre peut lancer la purge RGPD.' using hint = 'FORBIDDEN';
  end if;

  return query
  with org as (
    select o.id, o.retention_months from public.organizations o where o.id = public.auth_org_id()
  ),
  expired as (
    select c.id, c.photo_path
    from public.candidates c, org
    where c.organization_id = org.id and c.anonymized_at is null
      and c.updated_at < now() - make_interval(months => org.retention_months)
      and not exists (
        select 1 from public.certificates cert
        where cert.candidate_id = c.id
          and cert.expires_on >= (now() - make_interval(months => org.retention_months))::date
      )
      and not exists (
        select 1 from public.session_candidates sc join public.sessions s on s.id = sc.session_id
        where sc.candidate_id = c.id
          and s.ends_on >= (now() - make_interval(months => org.retention_months))::date
      )
  ),
  wiped as (
    update public.candidates c
    set first_name = 'Anonymisé', last_name = 'Anonymisé', birth_date = date '1900-01-01',
        email = null, photo_path = null, trainer_name = null, anonymized_at = now()
    from expired where c.id = expired.id
    returning c.id
  ),
  identities as (
    update public.session_candidates sc
    set identity_document_number = 'ANONYMISÉ'
    from wiped where sc.candidate_id = wiped.id
    returning sc.id
  )
  select count(wiped.id)::integer,
         coalesce(array_agg(expired.photo_path) filter (where expired.photo_path is not null), '{}')
  from wiped join expired on expired.id = wiped.id;
end;
$$;

revoke all on function public.anonymize_expired_candidates() from public;
grant execute on function public.anonymize_expired_candidates() to authenticated, service_role;
