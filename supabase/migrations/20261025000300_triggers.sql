-- Business triggers: timestamps, compliance checks (mirroring lib/rules),
-- locking of signed tests and issued certificates, and the audit log.
-- Errors raised here use SQLSTATE P0001 with a French message and a stable
-- code in the HINT, so the application can display them as they are.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations', 'profiles', 'invitations', 'recommendations', 'categories', 'grids',
    'grid_items', 'testers', 'tester_qualifications', 'tester_personal_caces', 'equipment',
    'client_companies', 'candidates', 'sessions', 'session_candidates', 'theory_results',
    'practical_tests', 'practical_results'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- Practical test compliance ---------------------------------------------------

create or replace function public.check_practical_test()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_candidate_name text;
  v_trainer_tester_id uuid;
  v_tester record;
  v_equipment record;
  v_category_label text;
  v_org_siret text;
  v_identity_ok boolean;
begin
  -- A signed test is final.
  if tg_op = 'UPDATE' and old.signed_at is not null then
    raise exception 'Cette épreuve est signée : elle ne peut plus être modifiée.'
      using hint = 'PRACTICAL_TEST_LOCKED';
  end if;

  select sc.session_id, c.first_name || ' ' || c.last_name as full_name, c.trainer_tester_id,
         sc.identity_verified
    into v_session_id, v_candidate_name, v_trainer_tester_id, v_identity_ok
  from public.session_candidates sc
  join public.candidates c on c.id = sc.candidate_id
  where sc.id = new.session_candidate_id;

  select r.code || ' cat. ' || cat.code into v_category_label
  from public.categories cat join public.recommendations r on r.id = cat.recommendation_id
  where cat.id = new.category_id;

  if not exists (select 1 from public.grids g where g.id = new.grid_id and g.category_id = new.category_id) then
    raise exception 'La grille choisie ne correspond pas à la catégorie %.', v_category_label
      using hint = 'GRID_WRONG_CATEGORY';
  end if;

  if new.tester_id is not null then
    select t.id, t.full_name into v_tester from public.testers t where t.id = new.tester_id;
    select o.siret into v_org_siret from public.organizations o where o.id = new.organization_id;

    if v_trainer_tester_id = new.tester_id then
      raise exception '% a formé % : un testeur ne peut pas évaluer un candidat qu''il a formé. Affectez un autre testeur.',
        v_tester.full_name, v_candidate_name
        using hint = 'TRAINER_CONFLICT';
    end if;

    if not exists (
      select 1 from public.session_testers st
      where st.session_id = v_session_id and st.tester_id = new.tester_id
    ) then
      raise exception '% n''est pas affecté à cette session.', v_tester.full_name
        using hint = 'TESTER_NOT_IN_SESSION';
    end if;

    if not exists (
      select 1 from public.tester_qualifications q
      where q.tester_id = new.tester_id and q.category_id = new.category_id and q.active
    ) then
      raise exception '% n''est pas habilité par l''organisme pour la catégorie %.',
        v_tester.full_name, v_category_label
        using hint = 'TESTER_NOT_QUALIFIED';
    end if;

    if not exists (
      select 1 from public.tester_personal_caces pc
      where pc.tester_id = new.tester_id
        and pc.category_id = new.category_id
        and pc.issuer_siret <> v_org_siret
        and pc.expires_on >= new.test_date
    ) then
      raise exception '% ne détient pas de CACES® valide en catégorie %, délivré par un autre OTC, à la date du test.',
        v_tester.full_name, v_category_label
        using hint = 'TESTER_CACES_INVALID';
    end if;
  end if;

  if new.equipment_id is not null then
    select e.name, e.serial_number, e.category_id, e.last_inspection_on into v_equipment
    from public.equipment e where e.id = new.equipment_id;

    if v_equipment.category_id <> new.category_id then
      raise exception 'L''engin % (n° %) ne correspond pas à la catégorie %.',
        v_equipment.name, v_equipment.serial_number, v_category_label
        using hint = 'EQUIPMENT_WRONG_CATEGORY';
    end if;

    if not exists (
      select 1 from public.session_equipment se
      where se.session_id = v_session_id and se.equipment_id = new.equipment_id
    ) then
      raise exception 'L''engin % (n° %) n''est pas affecté à cette session.',
        v_equipment.name, v_equipment.serial_number
        using hint = 'EQUIPMENT_NOT_IN_SESSION';
    end if;

    if v_equipment.last_inspection_on is null
       or v_equipment.last_inspection_on > new.test_date
       or new.test_date >= (v_equipment.last_inspection_on + interval '1 year')::date then
      raise exception 'La vérification périodique de l''engin % (n° %) date de plus d''un an à la date du test, ou n''est pas renseignée. Il ne peut pas servir à ce test.',
        v_equipment.name, v_equipment.serial_number
        using hint = 'EQUIPMENT_INSPECTION_INVALID';
    end if;
  end if;

  -- Starting or concluding a test requires the identity check.
  if (new.started_at is not null or new.status in ('passed', 'failed', 'incomplete'))
     and not coalesce(v_identity_ok, false) then
    raise exception 'L''identité de % n''a pas été contrôlée. Le test ne peut pas commencer.',
      v_candidate_name
      using hint = 'IDENTITY_NOT_VERIFIED';
  end if;

  if new.status in ('passed', 'failed') and (new.tester_id is null or new.equipment_id is null) then
    raise exception 'Une épreuve terminée doit avoir un testeur et un engin.'
      using hint = 'PRACTICAL_TEST_INCOMPLETE';
  end if;

  return new;
end;
$$;

create trigger check_practical_test
  before insert or update on public.practical_tests
  for each row execute function public.check_practical_test();

-- Grid results can only change while the test is not signed.
create or replace function public.check_practical_result()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_test_id uuid := coalesce(new.practical_test_id, old.practical_test_id);
  v_item record;
begin
  if exists (select 1 from public.practical_tests pt where pt.id = v_test_id and pt.signed_at is not null) then
    raise exception 'Cette épreuve est signée : ses notes ne peuvent plus être modifiées.'
      using hint = 'PRACTICAL_TEST_LOCKED';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  select gi.max_points, gi.eliminatory, gi.label into v_item
  from public.grid_items gi
  join public.practical_tests pt on pt.grid_id = gi.grid_id
  where gi.id = new.grid_item_id and pt.id = new.practical_test_id;

  if not found then
    raise exception 'Ce critère n''appartient pas à la grille de l''épreuve.'
      using hint = 'GRID_ITEM_MISMATCH';
  end if;
  if new.points > v_item.max_points then
    raise exception 'Note invalide pour « % » : % (maximum %).', v_item.label, new.points, v_item.max_points
      using hint = 'POINTS_OUT_OF_RANGE';
  end if;
  if new.eliminatory_fault and not v_item.eliminatory then
    raise exception '« % » n''est pas un critère éliminatoire.', v_item.label
      using hint = 'NOT_ELIMINATORY';
  end if;

  return new;
end;
$$;

create trigger check_practical_result
  before insert or update or delete on public.practical_results
  for each row execute function public.check_practical_result();

-- Certificates are immutable ---------------------------------------------------

create or replace function public.protect_certificate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Un certificat émis ne peut pas être supprimé. Il peut seulement être révoqué, avec un motif.'
      using hint = 'CERTIFICATE_IMMUTABLE';
  end if;

  -- Allowed changes: attach the PDF once, or revoke once with a reason.
  if (to_jsonb(new) - array['pdf_path', 'revoked_at', 'revocation_reason', 'revoked_by'])
     <> (to_jsonb(old) - array['pdf_path', 'revoked_at', 'revocation_reason', 'revoked_by'])
     or (old.pdf_path is not null and new.pdf_path is distinct from old.pdf_path)
     or (old.revoked_at is not null and (
           new.revoked_at is distinct from old.revoked_at
           or new.revocation_reason is distinct from old.revocation_reason
           or new.revoked_by is distinct from old.revoked_by))
     or (old.revoked_at is null and new.revoked_at is null and (
           new.revocation_reason is not null or new.revoked_by is not null)) then
    raise exception 'Un certificat émis ne peut pas être modifié. Il peut seulement être révoqué, avec un motif.'
      using hint = 'CERTIFICATE_IMMUTABLE';
  end if;

  return new;
end;
$$;

create trigger protect_certificate
  before update or delete on public.certificates
  for each row execute function public.protect_certificate();

create or replace function public.protect_certificate_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Les catégories d''un certificat émis ne peuvent pas être modifiées.'
    using hint = 'CERTIFICATE_IMMUTABLE';
end;
$$;

create trigger protect_certificate_category
  before update or delete on public.certificate_categories
  for each row execute function public.protect_certificate_category();

-- Audit log ----------------------------------------------------------------------

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_org uuid;
begin
  v_org := case
    when tg_table_name = 'organizations' then (v_row ->> 'id')::uuid
    else (v_row ->> 'organization_id')::uuid
  end;

  insert into public.audit_log (organization_id, actor_id, action, table_name, record_id, old_data, new_data)
  values (
    v_org,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'session_id' || ':' || coalesce(v_row ->> 'tester_id', v_row ->> 'equipment_id')),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );

  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations', 'profiles', 'invitations', 'recommendations', 'categories', 'grids',
    'grid_items', 'testers', 'tester_qualifications', 'tester_personal_caces', 'equipment',
    'client_companies', 'candidates', 'sessions', 'session_testers', 'session_equipment',
    'session_candidates', 'theory_results', 'practical_tests', 'practical_results',
    'certificates', 'certificate_categories'
  ] loop
    execute format(
      'create trigger audit_row after insert or update or delete on public.%I
         for each row execute function public.audit_row()', t);
  end loop;
end;
$$;

-- The audit log itself is append-only.
create or replace function public.protect_audit_log()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Le journal d''audit ne peut pas être modifié.' using hint = 'AUDIT_LOG_IMMUTABLE';
end;
$$;

create trigger protect_audit_log
  before update or delete on public.audit_log
  for each row execute function public.protect_audit_log();
