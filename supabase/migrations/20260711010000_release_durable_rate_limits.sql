-- Shared, privacy-preserving fixed-window rate limits for public routes.

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  scope text NOT NULL,
  key_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (scope, key_hash, window_start),
  CONSTRAINT rate_limit_scope_length_chk CHECK (length(scope) BETWEEN 1 AND 120),
  CONSTRAINT rate_limit_hash_length_chk CHECK (length(key_hash) = 64),
  CONSTRAINT rate_limit_count_chk CHECK (request_count > 0)
);

CREATE INDEX IF NOT EXISTS rate_limit_buckets_expiry_idx
  ON public.rate_limit_buckets (expires_at);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rate_limit_buckets FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_window_seconds integer,
  p_limit integer
)
RETURNS TABLE(allowed boolean, remaining integer, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_expires_at timestamptz;
  v_count integer;
BEGIN
  IF p_scope IS NULL OR length(p_scope) NOT BETWEEN 1 AND 120
    OR p_key_hash !~ '^[0-9a-f]{64}$'
    OR p_window_seconds NOT BETWEEN 1 AND 86400
    OR p_limit NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'invalid_rate_limit' USING ERRCODE = '22023';
  END IF;

  v_window_start := to_timestamp(
    floor(extract(epoch FROM v_now) / p_window_seconds) * p_window_seconds
  );
  v_expires_at := v_window_start + make_interval(secs => p_window_seconds);

  INSERT INTO public.rate_limit_buckets (
    scope, key_hash, window_start, request_count, expires_at
  ) VALUES (
    p_scope, p_key_hash, v_window_start, 1, v_expires_at
  )
  ON CONFLICT (scope, key_hash, window_start)
  DO UPDATE SET request_count = public.rate_limit_buckets.request_count + 1
  RETURNING request_count INTO v_count;

  DELETE FROM public.rate_limit_buckets
  WHERE expires_at < v_now - interval '1 hour'
    AND scope = p_scope;

  RETURN QUERY SELECT
    v_count <= p_limit,
    GREATEST(p_limit - v_count, 0),
    GREATEST(ceil(extract(epoch FROM (v_expires_at - v_now)))::integer, 1);
END;
$$;
