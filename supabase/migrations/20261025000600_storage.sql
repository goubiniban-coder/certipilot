-- Private buckets (GDPR): files are stored under "<organization_id>/..."
-- and are only reachable through short-lived signed URLs.

insert into storage.buckets (id, name, public)
values
  ('candidate-photos', 'candidate-photos', false),
  ('identity-documents', 'identity-documents', false),
  ('tester-documents', 'tester-documents', false),
  ('signatures', 'signatures', false),
  ('certificates', 'certificates', false)
on conflict (id) do update set public = false;

create policy "org members read their files"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('candidate-photos', 'identity-documents', 'tester-documents', 'signatures', 'certificates')
    and (storage.foldername(name))[1] = public.auth_org_id()::text
  );

create policy "back office uploads files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('candidate-photos', 'identity-documents', 'tester-documents')
    and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.has_role('{admin,secretariat}')
  );

create policy "back office replaces files"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('candidate-photos', 'identity-documents', 'tester-documents')
    and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.has_role('{admin,secretariat}')
  );

create policy "back office deletes files"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('candidate-photos', 'identity-documents', 'tester-documents')
    and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.has_role('{admin,secretariat}')
  );

-- Testers upload their signature and the candidate photo taken at check-in.
create policy "testers upload signatures and photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('signatures', 'candidate-photos')
    and (storage.foldername(name))[1] = public.auth_org_id()::text
    and public.auth_tester_id() is not null
  );

-- Certificate PDFs are written by the server (service role) only.
