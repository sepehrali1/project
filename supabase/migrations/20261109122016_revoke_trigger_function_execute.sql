/*
# Lock down trigger-only functions

1. Changed objects
- `likes_count_sync`, `scripts_before_write`, `scripts_cleanup_image` are trigger functions. They run automatically when rows change and are never meant to be called through the API.

2. Security changes
- Revoked EXECUTE from PUBLIC, anon, authenticated and service_role on all three.
- Triggers keep firing normally; Postgres does not check EXECUTE when a trigger runs.

3. Not changed
- Helper functions such as is_staff, is_active, is_owner and my_role are used inside row-level policies that anonymous visitors evaluate, so their anon access must remain.
*/

REVOKE EXECUTE ON FUNCTION public.likes_count_sync() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.scripts_before_write() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.scripts_cleanup_image() FROM PUBLIC, anon, authenticated, service_role;
