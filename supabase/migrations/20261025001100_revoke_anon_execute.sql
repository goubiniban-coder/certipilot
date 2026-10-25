-- Supabase grants EXECUTE on new public functions to anon by default.
-- Visitors without an account may only check a certificate and open an invitation.

revoke execute on all functions in schema public from anon;
grant execute on function public.verify_certificate(text), public.get_invitation(text) to anon;
