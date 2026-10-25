-- Default referential, copied into each new organization at sign-up, where
-- the OTC can then adjust it. Validity durations come from here and are
-- never hard-coded in the application.
-- Category labels summarise the 2020 recommendations: to be checked against
-- the official texts by the OTC. The example grids are NOT official.

create table public.reference_recommendations (
  code text primary key,
  label text not null,
  validity_years integer not null check (validity_years between 1 and 20),
  -- À VALIDER : the pass mark of the theory test is not specified in the brief.
  theory_pass_percent numeric(5, 2) not null default 70,
  requires_ipr boolean not null default false,
  position integer not null
);

create table public.reference_categories (
  recommendation_code text not null references public.reference_recommendations (code) on delete cascade,
  code text not null,
  label text not null,
  position integer not null,
  primary key (recommendation_code, code)
);

create table public.reference_grids (
  id text primary key,
  recommendation_code text not null,
  category_code text not null,
  name text not null,
  notes text,
  foreign key (recommendation_code, category_code)
    references public.reference_categories (recommendation_code, code) on delete cascade
);

create table public.reference_grid_items (
  grid_id text not null references public.reference_grids (id) on delete cascade,
  position integer not null,
  label text not null,
  description text,
  max_points numeric(6, 2) not null,
  eliminatory boolean not null default false,
  primary key (grid_id, position)
);

alter table public.reference_recommendations enable row level security;
alter table public.reference_categories enable row level security;
alter table public.reference_grids enable row level security;
alter table public.reference_grid_items enable row level security;
create policy reference_recommendations_read on public.reference_recommendations for select to authenticated using (true);
create policy reference_categories_read on public.reference_categories for select to authenticated using (true);
create policy reference_grids_read on public.reference_grids for select to authenticated using (true);
create policy reference_grid_items_read on public.reference_grid_items for select to authenticated using (true);
revoke all on public.reference_recommendations, public.reference_categories,
  public.reference_grids, public.reference_grid_items from anon;

insert into public.reference_recommendations (code, label, validity_years, requires_ipr, position) values
  ('R.482', 'Engins de chantier', 10, true, 1),
  ('R.483', 'Grues mobiles', 5, false, 2),
  ('R.484', 'Ponts roulants et portiques', 5, false, 3),
  ('R.485', 'Chariots de manutention automoteurs gerbeurs à conducteur accompagnant', 5, false, 4),
  ('R.486', 'Plates-formes élévatrices mobiles de personnes (PEMP)', 5, false, 5),
  ('R.487', 'Grues à tour', 5, false, 6),
  ('R.489', 'Chariots de manutention automoteurs à conducteur porté', 5, false, 7),
  ('R.490', 'Grues auxiliaires de chargement de véhicules', 5, false, 8);

insert into public.reference_categories (recommendation_code, code, label, position) values
  ('R.482', 'A', 'Engins compacts', 1),
  ('R.482', 'B1', 'Engins d''extraction à déplacement séquentiel', 2),
  ('R.482', 'B2', 'Engins de forage à déplacement séquentiel', 3),
  ('R.482', 'B3', 'Engins rail-route à déplacement séquentiel', 4),
  ('R.482', 'C1', 'Engins de chargement à déplacement alternatif', 5),
  ('R.482', 'C2', 'Engins de réglage à déplacement alternatif', 6),
  ('R.482', 'C3', 'Engins de nivellement à déplacement alternatif', 7),
  ('R.482', 'D', 'Engins de compactage', 8),
  ('R.482', 'E', 'Engins de transport ou d''extraction-transport', 9),
  ('R.482', 'F', 'Chariots de manutention tout-terrain', 10),
  ('R.482', 'G', 'Conduite d''engins hors production', 11),
  ('R.483', 'A', 'Grues mobiles à flèche treillis', 1),
  ('R.483', 'B', 'Grues mobiles à flèche télescopique', 2),
  ('R.484', '1', 'Ponts roulants et portiques à commande au sol', 1),
  ('R.484', '2', 'Ponts roulants et portiques à commande en cabine', 2),
  ('R.485', '1', 'Gerbeurs à conducteur accompagnant, hauteur de levée de 1,20 m à 2,50 m', 1),
  ('R.485', '2', 'Gerbeurs à conducteur accompagnant, hauteur de levée supérieure à 2,50 m', 2),
  ('R.486', 'A', 'PEMP à élévation verticale', 1),
  ('R.486', 'B', 'PEMP à élévation multidirectionnelle', 2),
  ('R.486', 'C', 'Conduite de PEMP hors production', 3),
  ('R.487', '1', 'Grues à tour à montage par éléments, à flèche distributrice', 1),
  ('R.487', '2', 'Grues à tour à montage par éléments, à flèche relevable', 2),
  ('R.487', '3', 'Grues à tour à montage automatisé', 3),
  ('R.489', '1A', 'Transpalettes à conducteur porté et préparateurs de commandes au sol (levée ≤ 1,20 m)', 1),
  ('R.489', '1B', 'Gerbeurs à conducteur porté (levée > 1,20 m)', 2),
  ('R.489', '2A', 'Chariots à plateau porteur (capacité ≤ 2 t)', 3),
  ('R.489', '2B', 'Chariots tracteurs industriels (capacité ≤ 25 t)', 4),
  ('R.489', '3', 'Chariots élévateurs en porte-à-faux (capacité ≤ 6 t)', 5),
  ('R.489', '4', 'Chariots élévateurs en porte-à-faux (capacité > 6 t)', 6),
  ('R.489', '5', 'Chariots élévateurs à mât rétractable', 7),
  ('R.489', '6', 'Chariots élévateurs à poste de conduite élevable (levée > 1,20 m)', 8),
  ('R.489', '7', 'Conduite de chariots hors production', 9),
  ('R.490', 'GA', 'Grues auxiliaires de chargement de véhicules', 1);

-- Example grids. // À VALIDER avec un testeur : criteria and points are
-- plausible placeholders, not the official CACES® grids.
insert into public.reference_grids (id, recommendation_code, category_code, name, notes) values
  ('R.489-3-exemple', 'R.489', '3', 'Grille d''exemple R.489 catégorie 3',
   'Exemple non officiel. À VALIDER avec un testeur avant toute utilisation réelle.'),
  ('R.486-B-exemple', 'R.486', 'B', 'Grille d''exemple R.486 catégorie B',
   'Exemple non officiel. À VALIDER avec un testeur avant toute utilisation réelle.');

insert into public.reference_grid_items (grid_id, position, label, description, max_points, eliminatory) values
  -- // À VALIDER avec un testeur
  ('R.489-3-exemple', 1, 'Prise de poste : vérifications avant utilisation', 'Contrôles visuels et fonctionnels, signalement des anomalies', 10, false),
  ('R.489-3-exemple', 2, 'Adéquation chariot, charge et plaque de charge', 'Lecture de la plaque de charge, choix de la charge admissible', 10, false),
  ('R.489-3-exemple', 3, 'Circulation à vide en marche avant et arrière', 'Parcours balisé, vitesse et trajectoire adaptées', 15, false),
  ('R.489-3-exemple', 4, 'Circulation en charge', 'Charge basse et inclinée vers l''arrière, visibilité', 15, false),
  ('R.489-3-exemple', 5, 'Prise et dépose d''une charge au sol', null, 10, false),
  ('R.489-3-exemple', 6, 'Gerbage et dégerbage en palettier', 'À différents niveaux, sans heurt', 20, false),
  ('R.489-3-exemple', 7, 'Manœuvres en espace restreint', null, 10, false),
  ('R.489-3-exemple', 8, 'Fin de poste : stationnement et mise en sécurité', null, 10, false),
  ('R.489-3-exemple', 9, 'Port du système de retenue (ceinture)', 'Critère éliminatoire', 0, true),
  ('R.489-3-exemple', 10, 'Absence de mise en danger des personnes', 'Critère éliminatoire', 0, true),
  ('R.489-3-exemple', 11, 'Pas de circulation charge haute ou fourches levées', 'Critère éliminatoire', 0, true),
  -- // À VALIDER avec un testeur
  ('R.486-B-exemple', 1, 'Prise de poste : documents et vérifications avant utilisation', 'Notice, rapport de vérification, état de la PEMP', 15, false),
  ('R.486-B-exemple', 2, 'Analyse de l''environnement et balisage de la zone', 'Sol, pente, vent, lignes électriques, coactivité', 15, false),
  ('R.486-B-exemple', 3, 'Mise en place et calage (stabilisateurs)', null, 15, false),
  ('R.486-B-exemple', 4, 'Manœuvres d''élévation, d''orientation et de translation', 'Mouvements combinés, souplesse', 25, false),
  ('R.486-B-exemple', 5, 'Approche précise d''un point défini', null, 15, false),
  ('R.486-B-exemple', 6, 'Manœuvre de secours et de dépannage', 'Descente de secours depuis le sol', 10, false),
  ('R.486-B-exemple', 7, 'Fin de poste et mise en sécurité', null, 5, false),
  ('R.486-B-exemple', 8, 'Port du harnais attaché au point d''ancrage', 'Critère éliminatoire', 0, true),
  ('R.486-B-exemple', 9, 'Respect de la charge et du nombre de personnes admissibles', 'Critère éliminatoire', 0, true),
  ('R.486-B-exemple', 10, 'Respect des distances de sécurité avec les lignes électriques', 'Critère éliminatoire', 0, true);

-- Copies the default referential into an organization.
create or replace function public.initialize_referential(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grid record;
  v_grid_id uuid;
begin
  insert into public.recommendations (organization_id, code, label, validity_years, theory_pass_percent, requires_ipr)
  select p_organization_id, r.code, r.label, r.validity_years, r.theory_pass_percent, r.requires_ipr
  from public.reference_recommendations r
  order by r.position
  on conflict (organization_id, code) do nothing;

  insert into public.categories (organization_id, recommendation_id, code, label)
  select p_organization_id, rec.id, c.code, c.label
  from public.reference_categories c
  join public.recommendations rec
    on rec.organization_id = p_organization_id and rec.code = c.recommendation_code
  order by c.recommendation_code, c.position
  on conflict (recommendation_id, code) do nothing;

  for v_grid in
    select g.*, cat.id as category_id
    from public.reference_grids g
    join public.recommendations rec
      on rec.organization_id = p_organization_id and rec.code = g.recommendation_code
    join public.categories cat
      on cat.recommendation_id = rec.id and cat.code = g.category_code
    where not exists (select 1 from public.grids x where x.category_id = cat.id)
  loop
    insert into public.grids (organization_id, category_id, name, is_example, notes)
    values (p_organization_id, v_grid.category_id, v_grid.name, true, v_grid.notes)
    returning id into v_grid_id;

    insert into public.grid_items (organization_id, grid_id, position, label, description, max_points, eliminatory)
    select p_organization_id, v_grid_id, i.position, i.label, i.description, i.max_points, i.eliminatory
    from public.reference_grid_items i
    where i.grid_id = v_grid.id;
  end loop;
end;
$$;

revoke all on function public.initialize_referential(uuid) from public, anon, authenticated;
