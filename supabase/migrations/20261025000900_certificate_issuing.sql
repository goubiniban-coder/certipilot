-- Step 9: certificate issuing is reserved to the back office (admin and
-- secretariat). Same function as in 20261025000500_functions.sql, with the
-- role check added at the top.

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
  -- Certificates are issued by the back office, never by testers.
  if auth.uid() is not null and not public.has_role('{admin,secretariat}') then
    raise exception 'Seuls le responsable du centre et le secrétariat délivrent les certificats.'
      using hint = 'FORBIDDEN';
  end if;

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
