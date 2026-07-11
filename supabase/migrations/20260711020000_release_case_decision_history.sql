CREATE TABLE IF NOT EXISTS public.case_decision_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.patient_requests(id) ON DELETE RESTRICT,
  stage_id uuid NULL REFERENCES public.case_routing_stages(id) ON DELETE SET NULL,
  request_id uuid NULL REFERENCES public.student_case_requests(id) ON DELETE SET NULL,
  actor_user_id uuid NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  from_state text NULL,
  to_state text NULL,
  reason_category text NOT NULL,
  reason_summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT case_decision_actor_role_chk CHECK (actor_role IN ('admin','faculty')),
  CONSTRAINT case_decision_reason_chk CHECK (
    length(reason_category) BETWEEN 1 AND 80
    AND length(reason_summary) BETWEEN 3 AND 500
  )
);

CREATE INDEX IF NOT EXISTS case_decision_history_case_created_idx
  ON public.case_decision_history (case_id, created_at DESC);

ALTER TABLE public.case_decision_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.case_decision_history FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.case_decision_history TO service_role;
