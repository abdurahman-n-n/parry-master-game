
CREATE TABLE public.auth_codes (
  email TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('register','login')),
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (email, purpose)
);

GRANT ALL ON public.auth_codes TO service_role;

ALTER TABLE public.auth_codes ENABLE ROW LEVEL SECURITY;

-- No policies = no access for anon/authenticated. Only service_role (via GRANT) can touch it.
