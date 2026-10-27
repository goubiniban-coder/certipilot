-- Trigger functions are never meant to be called over the API: PostgREST exposes
-- every public function as /rest/v1/rpc/<name>. EXECUTE is only checked when a trigger
-- is created, so removing it from API roles does not stop the triggers from firing.
-- (Revoking from anon alone was not enough: the grant to PUBLIC is inherited.)
revoke execute on function
  public.audit_row(),
  public.check_practical_conclusion(),
  public.check_practical_result(),
  public.check_practical_test(),
  public.compute_theory_passed(),
  public.guard_tester_changes()
from public, anon, authenticated;

alter function public.protect_issued_invoice() set search_path = '';
