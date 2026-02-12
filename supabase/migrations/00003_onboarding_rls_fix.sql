-- ============================================================
-- Fix: Allow onboarding operations for new users
--
-- Problem: auth.tenant_id() returns NULL for users who haven't
-- completed onboarding yet (no row in users table), so all
-- FOR ALL policies block INSERT operations.
--
-- Solution: Add explicit INSERT policies for the bootstrap case.
-- ============================================================

-- TENANTS: any authenticated user can create a tenant (onboarding)
CREATE POLICY "tenants_insert_onboarding" ON tenants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- USERS: authenticated user can create their own profile
CREATE POLICY "users_insert_onboarding" ON users
  FOR INSERT WITH CHECK (id = auth.uid());
