-- Local demo data (supabase db reset). Never run on production.
-- The default referential (8 recommendations, categories, example grids)
-- ships with the migrations; this seed adds a demo OTC that uses it.
--
-- Demo accounts, password « certipilot-demo » for all:
--   admin@demo.certipilot.test        responsable du centre
--   secretariat@demo.certipilot.test  secrétariat
--   testeur1@demo.certipilot.test     testeur (R.489 cat. 3, R.486 cat. B)
--   testeur2@demo.certipilot.test     testeur (R.489 cat. 3)

do $$
declare
  v_org uuid := '00000000-0000-4000-8000-000000000001';
  v_admin uuid := '00000000-0000-4000-8000-000000000101';
  v_secretariat uuid := '00000000-0000-4000-8000-000000000102';
  v_tester1_user uuid := '00000000-0000-4000-8000-000000000103';
  v_tester2_user uuid := '00000000-0000-4000-8000-000000000104';
  v_tester1 uuid := '00000000-0000-4000-8000-000000000201';
  v_tester2 uuid := '00000000-0000-4000-8000-000000000202';
  v_client1 uuid := '00000000-0000-4000-8000-000000000301';
  v_client2 uuid := '00000000-0000-4000-8000-000000000302';
  v_session uuid := '00000000-0000-4000-8000-000000000401';
  v_session_today uuid := '00000000-0000-4000-8000-000000000402';
  v_session_past uuid := '00000000-0000-4000-8000-000000000403';
  v_history record;
  v_sc uuid;
  v_candidate uuid;
  v_test uuid;
  v_certificate uuid;
  v_r489_3 uuid;
  v_r486_b uuid;
  v_user record;
begin
  for v_user in
    select * from (values
      (v_admin, 'admin@demo.certipilot.test'),
      (v_secretariat, 'secretariat@demo.certipilot.test'),
      (v_tester1_user, 'testeur1@demo.certipilot.test'),
      (v_tester2_user, 'testeur2@demo.certipilot.test')
    ) as u(id, email)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, confirmation_token, email_change,
      email_change_token_new, recovery_token, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user.id, 'authenticated', 'authenticated',
      v_user.email, extensions.crypt('certipilot-demo', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', now(), now()
    );
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_user.id::text, v_user.id,
      jsonb_build_object('sub', v_user.id::text, 'email', v_user.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;

  insert into public.organizations (id, name, siret, certificate_prefix)
  values (v_org, 'Centre de test Démo', '12345678900012', 'DEMO');
  perform public.initialize_referential(v_org);

  insert into public.profiles (id, organization_id, role, full_name, email) values
    (v_admin, v_org, 'admin', 'Claire Responsable', 'admin@demo.certipilot.test'),
    (v_secretariat, v_org, 'secretariat', 'Sophie Secrétariat', 'secretariat@demo.certipilot.test'),
    (v_tester1_user, v_org, 'tester', 'Marc Testeur', 'testeur1@demo.certipilot.test'),
    (v_tester2_user, v_org, 'tester', 'Julie Testeuse', 'testeur2@demo.certipilot.test');

  select c.id into v_r489_3 from public.categories c join public.recommendations r on r.id = c.recommendation_id
  where r.organization_id = v_org and r.code = 'R.489' and c.code = '3';
  select c.id into v_r486_b from public.categories c join public.recommendations r on r.id = c.recommendation_id
  where r.organization_id = v_org and r.code = 'R.486' and c.code = 'B';

  insert into public.testers (id, organization_id, profile_id, full_name, email) values
    (v_tester1, v_org, v_tester1_user, 'Marc Testeur', 'testeur1@demo.certipilot.test'),
    (v_tester2, v_org, v_tester2_user, 'Julie Testeuse', 'testeur2@demo.certipilot.test');

  insert into public.tester_qualifications (organization_id, tester_id, category_id, granted_on) values
    (v_org, v_tester1, v_r489_3, current_date - 400),
    (v_org, v_tester1, v_r486_b, current_date - 400),
    (v_org, v_tester2, v_r489_3, current_date - 200);

  -- Personal CACES® issued by another OTC; Julie's expires within 60 days (alert).
  insert into public.tester_personal_caces (organization_id, tester_id, category_id, certificate_number, issuer_name, issuer_siret, expires_on) values
    (v_org, v_tester1, v_r489_3, 'EXT-2023-001245', 'Autre Organisme Testeur', '98765432100019', current_date + 900),
    (v_org, v_tester1, v_r486_b, 'EXT-2023-001246', 'Autre Organisme Testeur', '98765432100019', current_date + 900),
    (v_org, v_tester2, v_r489_3, 'EXT-2021-000877', 'Organisme Partenaire', '55544433300021', current_date + 45);

  -- The third forklift's inspection is older than one year: it is blocked.
  insert into public.equipment (organization_id, category_id, name, brand_model, serial_number, last_inspection_on) values
    (v_org, v_r489_3, 'Chariot frontal 2,5 t', 'Exemple F25', 'CF-0001', current_date - 100),
    (v_org, v_r489_3, 'Chariot frontal 3 t', 'Exemple F30', 'CF-0002', current_date - 330),
    (v_org, v_r489_3, 'Chariot frontal 1,8 t', 'Exemple F18', 'CF-0003', current_date - 400),
    (v_org, v_r486_b, 'Nacelle articulée 16 m', 'Exemple N16', 'NA-0001', current_date - 30);

  insert into public.client_companies (id, organization_id, name, siret, contact_name, contact_email) values
    (v_client1, v_org, 'Logistique du Nord', '11122233300014', 'Paul Lefèvre', 'rh@logistique-nord.example'),
    (v_client2, v_org, 'BTP Services', '44455566600027', 'Nadia Benali', 'formation@btp-services.example');

  -- Paul Bernard was trained by Marc Testeur: Marc cannot evaluate him.
  insert into public.candidates (organization_id, last_name, first_name, birth_date, client_company_id, trainer_tester_id, trainer_name) values
    (v_org, 'Martin', 'Lucas', '1995-04-12', v_client1, null, null),
    (v_org, 'Bernard', 'Paul', '1988-11-03', v_client1, v_tester1, 'Marc Testeur'),
    (v_org, 'Petit', 'Emma', '2000-07-21', v_client2, null, 'Jean Formateur');

  insert into public.sessions (id, organization_id, name, starts_on, ends_on, location, status)
  values (v_session, v_org, 'Session chariots R.489', current_date + 7, current_date + 7, 'Plateforme logistique, Lille', 'planned');

  -- Today's session, so that the tester app (testeur1) has candidates to evaluate.
  insert into public.sessions (id, organization_id, name, starts_on, ends_on, location, status)
  values (v_session_today, v_org, 'Session du jour (démo)', current_date, current_date, 'Plateforme logistique, Lille', 'planned');
  insert into public.session_testers (organization_id, session_id, tester_id) values (v_org, v_session_today, v_tester1);
  insert into public.session_equipment (organization_id, session_id, equipment_id)
  select v_org, v_session_today, e.id from public.equipment e where e.organization_id = v_org and e.serial_number = 'CF-0001';
  insert into public.session_candidates (organization_id, session_id, candidate_id)
  select v_org, v_session_today, c.id from public.candidates c
  where c.organization_id = v_org and c.last_name in ('Martin', 'Petit');
  insert into public.practical_tests (organization_id, session_candidate_id, category_id, grid_id, tester_id, equipment_id, test_date)
  select v_org, sc.id, v_r489_3, g.id, v_tester1, e.id, current_date
  from public.session_candidates sc
  join public.grids g on g.organization_id = v_org and g.category_id = v_r489_3 and g.is_active
  join public.equipment e on e.organization_id = v_org and e.serial_number = 'CF-0001'
  where sc.session_id = v_session_today;

  -- History taken over from a previous tool: certificates issued about five years
  -- ago, so that the dashboard shows renewals. Inserted as they were issued then,
  -- with the compliance and audit triggers off (local demo data only).
  set local session_replication_role = replica;
  insert into public.sessions (id, organization_id, name, starts_on, ends_on, location, status)
  values (v_session_past, v_org, 'Session chariots (historique)', (current_date - interval '5 years')::date + 40,
          (current_date - interval '5 years')::date + 40, 'Plateforme logistique, Lille', 'closed');
  for v_history in
    select * from (values ('Martin', 40, 1), ('Petit', 120, 2), ('Bernard', 300, 3)) as h(last_name, days, seq)
  loop
    insert into public.session_candidates (organization_id, session_id, candidate_id, identity_document_type,
      identity_document_number, identity_verified, identity_verified_at)
    select v_org, v_session_past, c.id, 'cni', 'HIST' || v_history.seq, true, (current_date - interval '5 years') + interval '40 days'
    from public.candidates c where c.organization_id = v_org and c.last_name = v_history.last_name
    returning id, candidate_id into v_sc, v_candidate;

    insert into public.practical_tests (organization_id, session_candidate_id, category_id, grid_id, tester_id,
      equipment_id, test_date, status, score, started_at, ended_at, duration_seconds, tester_signature_path, signed_at)
    select v_org, v_sc, v_r489_3, g.id, v_tester2, e.id, (current_date - interval '5 years')::date + 40, 'passed', 85,
      now() - interval '5 years', now() - interval '5 years', 2400, v_org || '/historique/signature.png', now() - interval '5 years'
    from public.grids g, public.equipment e
    where g.organization_id = v_org and g.category_id = v_r489_3 and g.is_active
      and e.organization_id = v_org and e.serial_number = 'CF-0001'
    returning id into v_test;

    insert into public.certificates (organization_id, number, candidate_id, recommendation_id, session_id,
      holder_last_name, holder_first_name, holder_birth_date, recommendation_code, recommendation_label,
      issued_on, expires_on)
    select v_org, 'DEMO-' || extract(year from current_date - interval '5 years') || '-90000' || v_history.seq,
      c.id, r.id, v_session_past, c.last_name, c.first_name, c.birth_date, r.code, r.label,
      (current_date + v_history.days - interval '5 years')::date, current_date + v_history.days
    from public.candidates c, public.recommendations r
    where c.id = v_candidate and r.organization_id = v_org and r.code = 'R.489'
    returning id into v_certificate;

    insert into public.certificate_categories (organization_id, certificate_id, category_id, category_code, category_label, practical_test_id)
    select v_org, v_certificate, cat.id, cat.code, cat.label, v_test from public.categories cat where cat.id = v_r489_3;
  end loop;
  set local session_replication_role = origin;
end;
$$;
