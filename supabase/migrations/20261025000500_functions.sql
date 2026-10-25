-- Server-side functions: sign-up of an OTC, invitations, theory and
-- practical result consistency, certificate issue / revocation, public
-- verification and application audit events.

-- Sign-up: the signed-in user creates their OTC and becomes its admin. ------

create or replace function public.create_organization(
  p_name text,
  p_siret text,
  p_certificate_prefix text,
  p_full_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_org_id uuid;
begin
  if v_user_id is null then
    raise exception 'Vous devez être connecté pour inscrire un organisme.' using hint = 'NOT_AUTHENTICATED';
  end if;
  if exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'Ce compte appartient déjà à un organisme.' using hint = 'ALREADY_MEMBER';
  end if;
  if exists (select 1 from public.organizations where siret = regexp_replace(p_siret, '\s', '', 'g')) then
    raise exception 'Un organisme avec ce SIRET est déjà inscrit.' using hint = 'SIRET_TAKEN';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  insert into public.organizations (name, siret, certificate_prefix)
  values (trim(p_name), regexp_replace(p_siret, '\s', '', 'g'), upper(trim(p_certificate_prefix)))
  returning id into v_org_id;

  insert into public.profiles (id, organization_id, role, full_name, email)
  values (v_user_id, v_org_id, 'admin', trim(p_full_name), v_email);

  perform public.initialize_referential(v_org_id);
  return v_org_id;
end;
$$;

-- Invitations ---------------------------------------------------------------

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_invitation public.invitations;
  v_tester_id uuid;
begin
  if v_user_id is null then
    raise exception 'Vous devez être connecté pour accepter une invitation.' using hint = 'NOT_AUTHENTICATED';
  end if;

  select * into v_invitation from public.invitations where token = p_token for update;
  if not found or v_invitation.accepted_at is not null or v_invitation.expires_at < now() then
    raise exception 'Cette invitation n''est plus valide. Demandez-en une nouvelle à votre responsable.'
      using hint = 'INVITATION_INVALID';
  end if;

  select email into v_email from auth.users where id = v_user_id;
  if lower(v_email) <> lower(v_invitation.email) then
    raise exception 'Cette invitation a été envoyée à une autre adresse e-mail.' using hint = 'INVITATION_EMAIL_MISMATCH';
  end if;
  if exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'Ce compte appartient déjà à un organisme.' using hint = 'ALREADY_MEMBER';
  end if;

  insert into public.profiles (id, organization_id, role, full_name, email)
  values (v_user_id, v_invitation.organization_id, v_invitation.role, v_invitation.full_name, v_email);

  if v_invitation.role = 'tester' then
    -- Link an existing tester record with the same e-mail, or create one.
    update public.testers set profile_id = v_user_id
    where organization_id = v_invitation.organization_id
      and profile_id is null and lower(email) = lower(v_email)
    returning id into v_tester_id;

    if v_tester_id is null then
      insert into public.testers (organization_id, profile_id, full_name, email)
      values (v_invitation.organization_id, v_user_id, v_invitation.full_name, v_email);
    end if;
  end if;

  update public.invitations set accepted_at = now() where id = v_invitation.id;
  return v_invitation.organization_id;
end;
$$;

-- Theory: "passed" is always derived from the referential pass mark. ------

create or replace function public.compute_theory_passed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pass numeric;
begin
  select r.theory_pass_percent into v_pass from public.recommendations r where r.id = new.recommendation_id;
  new.passed := (new.score / new.max_score) * 100 >= v_pass;
  return new;
end;
$$;

create trigger compute_theory_passed
  before insert or update on public.theory_results
  for each row execute function public.compute_theory_passed();

-- Practical: the concluded status and score are checked against the grid. --

create or replace function public.compute_practical_outcome(p_practical_test_id uuid)
returns table (status public.practical_status, score numeric)
language sql
stable
security definer
set search_path = ''
as $$
  with test as (
    select pt.id, pt.grid_id, g.pass_score
    from public.practical_tests pt join public.grids g on g.id = pt.grid_id
    where pt.id = p_practical_test_id
  ),
  items as (
    select gi.id, gi.max_points, pr.points, coalesce(pr.eliminatory_fault, false) as fault,
           pr.id is not null as marked
    from test
    join public.grid_items gi on gi.grid_id = test.grid_id
    left join public.practical_results pr
      on pr.practical_test_id = test.id and pr.grid_item_id = gi.id
  ),
  totals as (
    select coalesce(sum(points), 0) as points, sum(max_points) as max_points,
           bool_or(fault) as any_fault, bool_and(marked) as complete
    from items
  )
  select
    case
      when totals.any_fault then 'failed'::public.practical_status
      when not totals.complete then 'incomplete'::public.practical_status
      when round(totals.points / nullif(totals.max_points, 0) * 100, 1) < test.pass_score then 'failed'::public.practical_status
      else 'passed'::public.practical_status
    end,
    round(totals.points / nullif(totals.max_points, 0) * 100, 1)
  from totals, test;
$$;

create or replace function public.check_practical_conclusion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_outcome record;
begin
  if new.status in ('passed', 'failed') then
    select * into v_outcome from public.compute_practical_outcome(new.id);
    if v_outcome.status is distinct from new.status then
      raise exception 'Le résultat déclaré (%) ne correspond pas à la grille saisie (%).', new.status, v_outcome.status
        using hint = 'PRACTICAL_OUTCOME_MISMATCH';
    end if;
    new.score := v_outcome.score;
  end if;
  return new;
end;
$$;

create trigger check_practical_conclusion
  before update on public.practical_tests
  for each row execute function public.check_practical_conclusion();

-- Certificates --------------------------------------------------------------

alter table public.certificates
  add constraint certificates_one_per_session unique (session_id, candidate_id, recommendation_id);

create or replace function public.issue_certificate(
  p_session_candidate_id uuid,
  p_recommendation_id uuid,
  p_issued_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sc record;
  v_rec public.recommendations;
  v_org public.organizations;
  v_existing uuid;
  v_years integer;
  v_seq integer;
  v_certificate_id uuid;
  v_kind public.theory_kind;
begin
  select sc.*, c.first_name, c.last_name, c.birth_date, c.photo_path
    into v_sc
  from public.session_candidates sc
  join public.candidates c on c.id = sc.candidate_id
  where sc.id = p_session_candidate_id;

  if not found then
    raise exception 'Candidat de session introuvable.' using hint = 'NOT_FOUND';
  end if;
  -- Signed-in users may only issue for their own organization.
  if auth.uid() is not null and v_sc.organization_id is distinct from public.auth_org_id() then
    raise exception 'Candidat de session introuvable.' using hint = 'NOT_FOUND';
  end if;

  select * into v_rec from public.recommendations
  where id = p_recommendation_id and organization_id = v_sc.organization_id;
  if not found then
    raise exception 'Recommandation introuvable.' using hint = 'NOT_FOUND';
  end if;

  select id into v_existing from public.certificates
  where session_id = v_sc.session_id and candidate_id = v_sc.candidate_id and recommendation_id = v_rec.id;
  if v_existing is not null then
    return v_existing;
  end if;

  foreach v_kind in array case when v_rec.requires_ipr then array['qcm', 'qcm_ipr']::public.theory_kind[]
                               else array['qcm']::public.theory_kind[] end loop
    if not exists (
      select 1 from public.theory_results tr
      where tr.session_candidate_id = v_sc.id and tr.recommendation_id = v_rec.id
        and tr.kind = v_kind and tr.passed
    ) then
      raise exception 'Certificat impossible : la partie théorique (%) de la % n''est pas réussie.',
        case when v_kind = 'qcm' then 'QCM' else 'QCM-IPR' end, v_rec.code
        using hint = 'THEORY_NOT_PASSED';
    end if;
  end loop;

  if not exists (
    select 1 from public.practical_tests pt
    join public.categories cat on cat.id = pt.category_id
    where pt.session_candidate_id = v_sc.id and cat.recommendation_id = v_rec.id
      and pt.status = 'passed' and pt.signed_at is not null
  ) then
    raise exception 'Certificat impossible : aucune catégorie de la % n''est réussie en pratique.', v_rec.code
      using hint = 'NO_CATEGORY_PASSED';
  end if;

  select min(coalesce(cat.validity_years, v_rec.validity_years)) into v_years
  from public.practical_tests pt
  join public.categories cat on cat.id = pt.category_id
  where pt.session_candidate_id = v_sc.id and cat.recommendation_id = v_rec.id and pt.status = 'passed';

  select * into v_org from public.organizations where id = v_sc.organization_id;

  insert into public.certificate_sequences as s (organization_id, year, last_value)
  values (v_org.id, extract(year from p_issued_on)::integer, 1)
  on conflict (organization_id, year) do update set last_value = s.last_value + 1
  returning last_value into v_seq;

  insert into public.certificates (
    organization_id, number, candidate_id, recommendation_id, session_id,
    holder_last_name, holder_first_name, holder_birth_date, holder_photo_path,
    recommendation_code, recommendation_label, issued_on, expires_on, issued_by
  ) values (
    v_org.id,
    v_org.certificate_prefix || '-' || extract(year from p_issued_on)::integer || '-' || lpad(v_seq::text, 6, '0'),
    v_sc.candidate_id, v_rec.id, v_sc.session_id,
    v_sc.last_name, v_sc.first_name, v_sc.birth_date, v_sc.photo_path,
    v_rec.code, v_rec.label, p_issued_on, (p_issued_on + make_interval(years => v_years))::date,
    auth.uid()
  )
  returning id into v_certificate_id;

  insert into public.certificate_categories (organization_id, certificate_id, category_id, category_code, category_label, practical_test_id)
  select v_org.id, v_certificate_id, cat.id, cat.code, cat.label, pt.id
  from public.practical_tests pt
  join public.categories cat on cat.id = pt.category_id
  where pt.session_candidate_id = v_sc.id and cat.recommendation_id = v_rec.id
    and pt.status = 'passed' and pt.signed_at is not null;

  return v_certificate_id;
end;
$$;

create or replace function public.attach_certificate_pdf(p_certificate_id uuid, p_pdf_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.certificates set pdf_path = p_pdf_path
  where id = p_certificate_id and pdf_path is null
    and (auth.uid() is null or organization_id = public.auth_org_id());
end;
$$;

create or replace function public.revoke_certificate(p_certificate_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('{admin}') then
    raise exception 'Seul un responsable du centre peut révoquer un certificat.' using hint = 'FORBIDDEN';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Indiquez le motif de la révocation.' using hint = 'REASON_REQUIRED';
  end if;

  update public.certificates
  set revoked_at = now(), revocation_reason = trim(p_reason), revoked_by = auth.uid()
  where id = p_certificate_id and organization_id = public.auth_org_id() and revoked_at is null;

  if not found then
    raise exception 'Certificat introuvable ou déjà révoqué.' using hint = 'NOT_FOUND';
  end if;
end;
$$;

-- Public verification: only what the public page needs, nothing else. -----

create or replace function public.verify_certificate(p_token text)
returns table (
  number text,
  holder_name text,
  recommendation_code text,
  recommendation_label text,
  categories jsonb,
  issued_on date,
  expires_on date,
  status text,
  organization_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.number,
    c.holder_first_name || ' ' || upper(c.holder_last_name),
    c.recommendation_code,
    c.recommendation_label,
    coalesce(
      (select jsonb_agg(jsonb_build_object('code', cc.category_code, 'label', cc.category_label) order by cc.category_code)
       from public.certificate_categories cc where cc.certificate_id = c.id),
      '[]'::jsonb),
    c.issued_on,
    c.expires_on,
    case
      when c.revoked_at is not null then 'revoked'
      when c.expires_on < (now() at time zone 'Europe/Paris')::date then 'expired'
      else 'valid'
    end,
    o.name
  from public.certificates c
  join public.organizations o on o.id = c.organization_id
  where c.verification_token = p_token and length(p_token) >= 20;
$$;

-- Application events (sign-in, exports, PDF downloads...) -------------------

create or replace function public.log_event(
  p_action text,
  p_table_name text default null,
  p_record_id text default null,
  p_data jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.auth_org_id() is null then
    return;
  end if;
  insert into public.audit_log (organization_id, actor_id, action, table_name, record_id, new_data)
  values (public.auth_org_id(), auth.uid(), p_action, p_table_name, p_record_id, p_data);
end;
$$;

-- GDPR: anonymize candidates whose data is past the retention period. -----

create or replace function public.anonymize_expired_candidates()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.has_role('{admin}') then
    raise exception 'Seul un responsable du centre peut lancer la purge RGPD.' using hint = 'FORBIDDEN';
  end if;

  with org as (
    select o.id, o.retention_months from public.organizations o where o.id = public.auth_org_id()
  ),
  expired as (
    select c.id
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
  select count(*) into v_count from wiped;

  return v_count;
end;
$$;

-- Grants ----------------------------------------------------------------------

revoke all on function
  public.create_organization(text, text, text, text),
  public.accept_invitation(text),
  public.compute_practical_outcome(uuid),
  public.issue_certificate(uuid, uuid, date),
  public.attach_certificate_pdf(uuid, text),
  public.revoke_certificate(uuid, text),
  public.verify_certificate(text),
  public.log_event(text, text, text, jsonb),
  public.anonymize_expired_candidates()
from public;

grant execute on function
  public.create_organization(text, text, text, text),
  public.accept_invitation(text),
  public.compute_practical_outcome(uuid),
  public.issue_certificate(uuid, uuid, date),
  public.attach_certificate_pdf(uuid, text),
  public.revoke_certificate(uuid, text),
  public.log_event(text, text, text, jsonb),
  public.anonymize_expired_candidates()
to authenticated, service_role;

grant execute on function public.verify_certificate(text) to anon, authenticated, service_role;
