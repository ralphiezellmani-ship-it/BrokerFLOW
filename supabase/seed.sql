-- ============================================================
-- BrokerFlow Seed Data (for local development)
-- ============================================================

-- Note: In local development, you need to first create auth users
-- via Supabase Auth, then insert corresponding rows here.
-- This seed file provides a template for test data.

-- Example tenant
INSERT INTO tenants (id, name, slug, subscription_plan)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Mäklarbyrå AB',
  'demo-maklarbyra',
  'pro'
) ON CONFLICT DO NOTHING;

-- Example tenant preferences
INSERT INTO tenant_preferences (tenant_id, default_tone, default_llm_provider)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'professional',
  'anthropic'
) ON CONFLICT DO NOTHING;

-- Example inbound alias
INSERT INTO inbound_aliases (tenant_id, email_alias, secret_token)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'kontoret+demo123',
  'demo-secret-token-change-me'
) ON CONFLICT DO NOTHING;
