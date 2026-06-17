-- Permanent fix for GoTrue login error "Database error querying schema",
-- caused by NULL token columns in auth.users (rows inserted via raw SQL, e.g.
-- the seed_auth_users_and_profiles migration). GoTrue (Go) scans these columns
-- as non-nullable strings; a NULL value makes the /token login return HTTP 500
-- with: error finding user: sql: Scan error on column "email_change":
-- converting NULL to string is unsupported.

-- 1) Backfill any existing NULL token columns to empty string.
UPDATE auth.users SET
  confirmation_token         = COALESCE(confirmation_token, ''),
  email_change               = COALESCE(email_change, ''),
  email_change_token_new     = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  recovery_token             = COALESCE(recovery_token, ''),
  phone_change               = COALESCE(phone_change, ''),
  phone_change_token         = COALESCE(phone_change_token, ''),
  reauthentication_token     = COALESCE(reauthentication_token, '')
WHERE confirmation_token IS NULL
   OR email_change IS NULL
   OR email_change_token_new IS NULL
   OR email_change_token_current IS NULL
   OR recovery_token IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL
   OR reauthentication_token IS NULL;

-- 2) Guard future writes: coerce NULL token columns to '' on every INSERT/UPDATE.
--    SECURITY INVOKER (default) + empty search_path per Supabase advisor guidance.
CREATE OR REPLACE FUNCTION public.normalize_auth_user_tokens()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.confirmation_token         := COALESCE(NEW.confirmation_token, '');
  NEW.email_change               := COALESCE(NEW.email_change, '');
  NEW.email_change_token_new     := COALESCE(NEW.email_change_token_new, '');
  NEW.email_change_token_current := COALESCE(NEW.email_change_token_current, '');
  NEW.recovery_token             := COALESCE(NEW.recovery_token, '');
  NEW.phone_change               := COALESCE(NEW.phone_change, '');
  NEW.phone_change_token         := COALESCE(NEW.phone_change_token, '');
  NEW.reauthentication_token     := COALESCE(NEW.reauthentication_token, '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_auth_user_tokens ON auth.users;
CREATE TRIGGER normalize_auth_user_tokens
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.normalize_auth_user_tokens();
