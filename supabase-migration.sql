-- ============================================
-- SmartPlanner - Migration Script
-- Change UUID to TEXT for compatibility
-- Execute this in Supabase SQL Editor
-- ============================================

-- 1. Drop existing foreign key constraints if they exist
ALTER TABLE IF EXISTS conges DROP CONSTRAINT IF EXISTS conges_agent_id_fkey;
ALTER TABLE IF EXISTS disponibilites DROP CONSTRAINT IF EXISTS disponibilites_agent_id_fkey;
ALTER TABLE IF EXISTS historique DROP CONSTRAINT IF EXISTS historique_planning_id_fkey;

-- 2. Alter column types from UUID to TEXT
-- USERS
ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE users ALTER COLUMN agent_id TYPE TEXT USING agent_id::text;

-- AGENTS
ALTER TABLE agents ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE agents ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- DISPONIBILITES
ALTER TABLE disponibilites ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE disponibilites ALTER COLUMN agent_id TYPE TEXT USING agent_id::text;

-- PLANNINGS
ALTER TABLE plannings ALTER COLUMN id TYPE TEXT USING id::text;

-- HISTORIQUE
ALTER TABLE historique ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE historique ALTER COLUMN agent_ids TYPE TEXT[] USING agent_ids::text[];
ALTER TABLE historique ALTER COLUMN planning_id TYPE TEXT USING planning_id::text;

-- CONGES
ALTER TABLE conges ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE conges ALTER COLUMN agent_id TYPE TEXT USING agent_id::text;
ALTER TABLE conges ALTER COLUMN cree_par TYPE TEXT USING cree_par::text;
ALTER TABLE conges ALTER COLUMN valide_par TYPE TEXT USING valide_par::text;

-- 3. Ensure RLS policies are in place
DROP POLICY IF EXISTS "Allow all for users" ON users;
DROP POLICY IF EXISTS "Allow all for agents" ON agents;
DROP POLICY IF EXISTS "Allow all for disponibilites" ON disponibilites;
DROP POLICY IF EXISTS "Allow all for plannings" ON plannings;
DROP POLICY IF EXISTS "Allow all for historique" ON historique;
DROP POLICY IF EXISTS "Allow all for conges" ON conges;

CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for agents" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for disponibilites" ON disponibilites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for plannings" ON plannings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for historique" ON historique FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for conges" ON conges FOR ALL USING (true) WITH CHECK (true);

-- Done!
SELECT 'Migration completed successfully!' as status;

