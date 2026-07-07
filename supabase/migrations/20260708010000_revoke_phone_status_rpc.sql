-- Revoke public access to the legacy phone-only patient status lookup RPC.
--
-- Phase 3 Branch A replaces browser phone-only status lookup with the OTP
-- protected /api/v1/patient/status flow. Keep the function in place for
-- compatibility/history, but remove executable access from browser-facing
-- roles so it can no longer be used as an unauthenticated status oracle.

REVOKE EXECUTE ON FUNCTION public.get_request_status_by_phone(text)
  FROM anon, authenticated, public;
