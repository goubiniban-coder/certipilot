-- Grid editing. A grid already used by a practical test is frozen (the
-- signed results refer to it); changes then go into a new version.

create or replace function public.save_grid(
  p_grid_id uuid,
  p_name text,
  p_pass_score numeric,
  p_items jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_grid public.grids;
begin
  if not public.has_role('{admin}') then
    raise exception 'Seul un responsable du centre peut modifier une grille.' using hint = 'FORBIDDEN';
  end if;

  select * into v_grid from public.grids where id = p_grid_id;
  if not found then
    raise exception 'Grille introuvable.' using hint = 'NOT_FOUND';
  end if;
  if exists (select 1 from public.practical_tests where grid_id = p_grid_id) then
    raise exception 'Cette grille a déjà servi à des épreuves : créez une nouvelle version pour la modifier.'
      using hint = 'GRID_IN_USE';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'La grille doit contenir au moins un critère.' using hint = 'GRID_EMPTY';
  end if;
  if (select sum((i ->> 'maxPoints')::numeric) from jsonb_array_elements(p_items) i) <= 0 then
    raise exception 'La grille doit totaliser plus de 0 point.' using hint = 'GRID_EMPTY';
  end if;

  update public.grids set name = trim(p_name), pass_score = p_pass_score where id = p_grid_id;
  delete from public.grid_items where grid_id = p_grid_id;
  insert into public.grid_items (organization_id, grid_id, position, label, description, max_points, eliminatory)
  select v_grid.organization_id, p_grid_id, ord::integer, trim(i ->> 'label'), nullif(trim(i ->> 'description'), ''),
         (i ->> 'maxPoints')::numeric, coalesce((i ->> 'eliminatory')::boolean, false)
  from jsonb_array_elements(p_items) with ordinality as t(i, ord);
end;
$$;

create or replace function public.new_grid_version(p_grid_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_grid public.grids;
  v_new_id uuid;
begin
  if not public.has_role('{admin}') then
    raise exception 'Seul un responsable du centre peut modifier une grille.' using hint = 'FORBIDDEN';
  end if;
  select * into v_grid from public.grids where id = p_grid_id;
  if not found then
    raise exception 'Grille introuvable.' using hint = 'NOT_FOUND';
  end if;

  update public.grids set is_active = false where category_id = v_grid.category_id and is_active;

  insert into public.grids (organization_id, category_id, name, version, is_active, is_example, pass_score, notes)
  select v_grid.organization_id, v_grid.category_id, v_grid.name,
         (select max(version) + 1 from public.grids where category_id = v_grid.category_id),
         true, v_grid.is_example, v_grid.pass_score, v_grid.notes
  returning id into v_new_id;

  insert into public.grid_items (organization_id, grid_id, position, label, description, max_points, eliminatory)
  select organization_id, v_new_id, position, label, description, max_points, eliminatory
  from public.grid_items where grid_id = p_grid_id;

  return v_new_id;
end;
$$;

-- Creates an empty grid for a category that has none.
create or replace function public.create_grid(p_category_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_category public.categories;
  v_id uuid;
begin
  if not public.has_role('{admin}') then
    raise exception 'Seul un responsable du centre peut créer une grille.' using hint = 'FORBIDDEN';
  end if;
  select * into v_category from public.categories where id = p_category_id;
  if not found then
    raise exception 'Catégorie introuvable.' using hint = 'NOT_FOUND';
  end if;
  update public.grids set is_active = false where category_id = p_category_id and is_active;
  insert into public.grids (organization_id, category_id, name, version)
  values (
    v_category.organization_id, p_category_id, 'Grille ' || v_category.code,
    coalesce((select max(version) + 1 from public.grids where category_id = p_category_id), 1)
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.save_grid(uuid, text, numeric, jsonb), public.new_grid_version(uuid),
  public.create_grid(uuid) from public, anon;
grant execute on function public.save_grid(uuid, text, numeric, jsonb), public.new_grid_version(uuid),
  public.create_grid(uuid) to authenticated, service_role;
