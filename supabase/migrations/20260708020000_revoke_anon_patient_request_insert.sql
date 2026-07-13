-- Phase 3 Branch B: public patient requests now go through
-- POST /api/v1/patient/requests, which inserts with the service role after
-- server-side validation. Remove the old browser insert path.

DROP POLICY IF EXISTS "patient_can_insert_request" ON public.patient_requests;

REVOKE INSERT ON TABLE public.patient_requests FROM anon;
REVOKE INSERT ON TABLE public.patient_requests FROM authenticated;
