-- QuickBooks Online connection tokens (one row per company)
CREATE TABLE IF NOT EXISTS quickbooks_settings (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  realm_id     TEXT NOT NULL UNIQUE,
  access_token  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT now()
);

NOTIFY pgrst, 'reload schema';
