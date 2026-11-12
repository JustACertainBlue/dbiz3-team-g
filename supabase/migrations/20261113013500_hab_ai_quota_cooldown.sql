-- Migration: 20261113013500_hab_ai_quota_cooldown.sql
-- Purpose: Add persistent AI Quota Cooldown tracking for Cloudflare Workers AI
-- Ensures 24-hour persistent cooldown across Render Free redeployments and service restarts

CREATE TABLE IF NOT EXISTS hab_runtime.ai_quota_cooldowns (
  cooldown_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name varchar(64) NOT NULL,
  model_name varchar(128) NOT NULL,
  exhausted_at bigint NOT NULL,
  cooldown_until bigint NOT NULL,
  reason text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_quota_cooldowns_active_idx
  ON hab_runtime.ai_quota_cooldowns (provider_name, cooldown_until)
  WHERE is_active = true;

ALTER TABLE hab_runtime.ai_quota_cooldowns ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON hab_runtime.ai_quota_cooldowns TO hab_app;

DROP POLICY IF EXISTS trusted_server_quota ON hab_runtime.ai_quota_cooldowns;
CREATE POLICY trusted_server_quota ON hab_runtime.ai_quota_cooldowns TO hab_app USING (true) WITH CHECK (true);
