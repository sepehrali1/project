/*
# Stats functions run as the caller

1. Changed functions
- `site_stats()` and `my_stats()` now run with the caller's rights (SECURITY INVOKER) instead of the owner's rights.

2. Why
- Both only read data the caller can already see through the normal row rules: approved scripts and public profile columns for site totals, and the caller's own scripts for personal stats.

3. Security
- No table permissions are widened and no access rules change.
- Nothing is removed from the public API; the functions return the same values.
*/

ALTER FUNCTION public.site_stats() SECURITY INVOKER;
ALTER FUNCTION public.my_stats() SECURITY INVOKER;
