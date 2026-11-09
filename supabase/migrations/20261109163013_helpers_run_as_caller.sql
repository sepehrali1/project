/*
# Run permission helpers as the caller instead of the owner

1. Changed functions
- `is_active()`, `is_staff()`, `is_owner()`, `my_role()`, `can_moderate(uuid)`, and `is_username_available(text)` now run with the caller's rights (SECURITY INVOKER) instead of the owner's rights.

2. Why
- These helpers only read the profiles table. Every role that calls them already has read access to the profile columns they use, so they do not need owner rights.
- Running as the caller removes them from the list of functions that bypass row rules for anonymous and signed-in users.

3. Security
- No table permissions are widened.
- Access rules for scripts, comments, messages, and notifications are unchanged; the helpers return the same answers.
- Admin and moderation actions still check the caller's role inside each function.

4. Notes
- Anonymous users keep EXECUTE on these helpers because the scripts read rule calls them.
*/

ALTER FUNCTION public.is_active() SECURITY INVOKER;
ALTER FUNCTION public.is_staff() SECURITY INVOKER;
ALTER FUNCTION public.is_owner() SECURITY INVOKER;
ALTER FUNCTION public.my_role() SECURITY INVOKER;
ALTER FUNCTION public.can_moderate(uuid) SECURITY INVOKER;
ALTER FUNCTION public.is_username_available(text) SECURITY INVOKER;
