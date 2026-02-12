-- ============================================================
-- BrokerFlow RLS Policies & Triggers
-- Version: 1.0
-- ============================================================

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: get tenant_id for authenticated user
-- ============================================================

CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- TENANT ISOLATION POLICIES
-- ============================================================

-- TENANTS: own tenant row only
CREATE POLICY "tenants_own_only" ON tenants
  FOR ALL USING (id = auth.tenant_id());

-- USERS: see only own tenant colleagues
CREATE POLICY "users_tenant_isolation" ON users
  FOR ALL USING (tenant_id = auth.tenant_id());

-- ASSIGNMENTS: see only own tenant assignments
CREATE POLICY "assignments_tenant_isolation" ON assignments
  FOR ALL USING (tenant_id = auth.tenant_id());

-- DOCUMENTS: see only own tenant documents
CREATE POLICY "documents_tenant_isolation" ON documents
  FOR ALL USING (tenant_id = auth.tenant_id());

-- EXTRACTIONS: see only own tenant extractions
CREATE POLICY "extractions_tenant_isolation" ON extractions
  FOR ALL USING (tenant_id = auth.tenant_id());

-- GENERATIONS: see only own tenant generations
CREATE POLICY "generations_tenant_isolation" ON generations
  FOR ALL USING (tenant_id = auth.tenant_id());

-- TRANSACTIONS: see only own tenant transactions
CREATE POLICY "transactions_tenant_isolation" ON transactions
  FOR ALL USING (tenant_id = auth.tenant_id());

-- TASKS: see only own tenant tasks
CREATE POLICY "tasks_tenant_isolation" ON tasks
  FOR ALL USING (tenant_id = auth.tenant_id());

-- EMAIL_LOGS: see only own tenant email logs
CREATE POLICY "email_logs_tenant_isolation" ON email_logs
  FOR ALL USING (tenant_id = auth.tenant_id());

-- INBOUND_ALIASES: see only own tenant aliases
CREATE POLICY "inbound_aliases_tenant_isolation" ON inbound_aliases
  FOR ALL USING (tenant_id = auth.tenant_id());

-- AUDIT_LOGS: see only own tenant audit logs
CREATE POLICY "audit_logs_tenant_isolation" ON audit_logs
  FOR ALL USING (tenant_id = auth.tenant_id());

-- TENANT_PREFERENCES: see only own tenant preferences
CREATE POLICY "tenant_preferences_tenant_isolation" ON tenant_preferences
  FOR ALL USING (tenant_id = auth.tenant_id());

-- ============================================================
-- SOFT DELETE POLICIES (hide deleted rows on SELECT)
-- ============================================================

CREATE POLICY "assignments_not_deleted" ON assignments
  FOR SELECT USING (deleted_at IS NULL AND tenant_id = auth.tenant_id());

CREATE POLICY "documents_not_deleted" ON documents
  FOR SELECT USING (deleted_at IS NULL AND tenant_id = auth.tenant_id());

CREATE POLICY "transactions_not_deleted" ON transactions
  FOR SELECT USING (deleted_at IS NULL AND tenant_id = auth.tenant_id());

-- ============================================================
-- AUTOMATIC TRIGGERS: update updated_at on row changes
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenant_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
