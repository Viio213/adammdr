-- ============================================
-- SmartPlanner - Supabase Database Schema
-- Execute this in Supabase SQL Editor
-- ============================================

-- ============================================
-- DROP EXISTING TABLES (if needed for reset)
-- ============================================
-- DROP TABLE IF EXISTS conges CASCADE;
-- DROP TABLE IF EXISTS historique CASCADE;
-- DROP TABLE IF EXISTS plannings CASCADE;
-- DROP TABLE IF EXISTS disponibilites CASCADE;
-- DROP TABLE IF EXISTS agents CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'UTILISATEUR',
  actif BOOLEAN DEFAULT TRUE,
  agent_id TEXT,
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  derniere_connexion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AGENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  nom VARCHAR(50) NOT NULL,
  nom_complet VARCHAR(200),
  type_contrat VARCHAR(50) NOT NULL DEFAULT 'TEMPS_PLEIN',
  indications_speciales TEXT,
  actif BOOLEAN DEFAULT TRUE,
  user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DISPONIBILITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS disponibilites (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id TEXT NOT NULL,
  jour VARCHAR(20) NOT NULL,
  demi_journee VARCHAR(20) NOT NULL,
  disponible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PLANNINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS plannings (
  id TEXT PRIMARY KEY,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  date_generation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_confirmed BOOLEAN DEFAULT FALSE,
  date_confirmation TIMESTAMP WITH TIME ZONE,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- HISTORIQUE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS historique (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  jour VARCHAR(20) NOT NULL,
  demi_journee VARCHAR(20) NOT NULL,
  agent_ids TEXT[] NOT NULL,
  binomes VARCHAR(200),
  zone_id VARCHAR(50),
  zone_name VARCHAR(100),
  ecole_id VARCHAR(50),
  ecole_name VARCHAR(100),
  vehicule BOOLEAN DEFAULT FALSE,
  mission TEXT,
  reunion BOOLEAN DEFAULT FALSE,
  commentaires TEXT,
  planning_id TEXT,
  mois VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conges (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_nom VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  demi_journee VARCHAR(20),
  commentaire TEXT,
  statut VARCHAR(50) DEFAULT 'EN_ATTENTE',
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cree_par TEXT,
  date_validation TIMESTAMP WITH TIME ZONE,
  valide_par TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_agents_actif ON agents(actif);
CREATE INDEX IF NOT EXISTS idx_disponibilites_agent ON disponibilites(agent_id);
CREATE INDEX IF NOT EXISTS idx_plannings_dates ON plannings(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_historique_date ON historique(date);
CREATE INDEX IF NOT EXISTS idx_historique_mois ON historique(mois);
CREATE INDEX IF NOT EXISTS idx_conges_agent ON conges(agent_id);
CREATE INDEX IF NOT EXISTS idx_conges_dates ON conges(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_conges_statut ON conges(statut);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE disponibilites ENABLE ROW LEVEL SECURITY;
ALTER TABLE plannings ENABLE ROW LEVEL SECURITY;
ALTER TABLE historique ENABLE ROW LEVEL SECURITY;
ALTER TABLE conges ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (for simplicity)
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

-- ============================================
-- INSERT DEFAULT ADMIN USER
-- ============================================
INSERT INTO users (id, username, password, nom, prenom, role, actif)
VALUES ('admin-1', 'admin', 'admin123', 'Administrateur', 'System', 'ADMIN', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INSERT DEFAULT AGENTS
-- ============================================
INSERT INTO agents (id, nom, type_contrat, actif) VALUES
  ('agent-1', 'AA', 'TEMPS_PLEIN', true),
  ('agent-2', 'AC', 'TEMPS_PLEIN', true),
  ('agent-3', 'AH', 'TEMPS_PLEIN', true),
  ('agent-4', 'BL', 'TEMPS_PLEIN', true),
  ('agent-5', 'BM', 'TEMPS_PLEIN', true),
  ('agent-6', 'DS', 'TEMPS_PLEIN', true),
  ('agent-7', 'JC', 'TEMPS_PLEIN', true),
  ('agent-8', 'NL', 'TEMPS_PLEIN', true),
  ('agent-9', 'TG', 'TEMPS_PLEIN', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INSERT DEFAULT DISPONIBILITES
-- ============================================
DO $$
DECLARE
  agent_record RECORD;
  jour_val VARCHAR(20);
  demi_val VARCHAR(20);
  jours VARCHAR(20)[] := ARRAY['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI'];
  demis VARCHAR(20)[] := ARRAY['MATIN', 'APRES_MIDI'];
BEGIN
  FOR agent_record IN SELECT id FROM agents LOOP
    FOREACH jour_val IN ARRAY jours LOOP
      FOREACH demi_val IN ARRAY demis LOOP
        INSERT INTO disponibilites (id, agent_id, jour, demi_journee, disponible)
        VALUES (
          agent_record.id || '-' || jour_val || '-' || demi_val,
          agent_record.id, 
          jour_val, 
          demi_val, 
          true
        )
        ON CONFLICT (id) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
