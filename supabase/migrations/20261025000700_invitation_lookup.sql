-- Lets the invitation page show who invited whom before the person has an account.

create or replace function public.get_invitation(p_token text)
returns table (email text, full_name text, role public.app_role, organization_name text, valid boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select i.email, i.full_name, i.role, o.name,
         i.accepted_at is null and i.expires_at > now()
  from public.invitations i
  join public.organizations o on o.id = i.organization_id
  where i.token = p_token and length(p_token) >= 20;
$$;

revoke all on function public.get_invitation(text) from public;
grant execute on function public.get_invitation(text) to anon, authenticated, service_role;
