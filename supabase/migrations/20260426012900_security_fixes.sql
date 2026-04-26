-- Security hardening migration
-- 1) Restrict public.has_role to authenticated callers only (prevent anon role enumeration)
-- 2) Remove unrestricted anon INSERT on public.comments — comment submission now goes through a server function with rate limiting

-- 1) has_role: revoke from anon/public, grant to authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 2) Drop the unrestricted insert policy on comments. The Comments component now
-- submits via a server function that uses supabaseAdmin (which bypasses RLS)
-- after enforcing rate limiting and validation.
DROP POLICY IF EXISTS comments_insert_any ON public.comments;
