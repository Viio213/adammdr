-- ============================================
-- SmartPlanner - Supabase Database Schema
-- Execute this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'UTILISATEUR',
  actif BOOLEAN DEFAULT TRUE,
  agent_id UUID,
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  derniere_connexion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AGENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(50) NOT NULL,
  nom_complet VARCHAR(200),
  type_contrat VARCHAR(50) NOT NULL DEFAULT 'TEMPS_PLEIN',
  indications_speciales TEXT,
  actif BOOLEAN DEFAULT TRUE,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DISPONIBILITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS disponibilites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  jour VARCHAR(20) NOT NULL,
  demi_journee VARCHAR(20) NOT NULL,
  disponible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PLANNINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS plannings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  date_generation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_confirmed BOOLEAN DEFAULT FALSE,
  date_confirmation TIMESTAMP WITH TIME ZONE,
  data JSONB NOT NULL, -- Stores the full planning structure (jours, entries, groupes)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- HISTORIQUE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS historique (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  jour VARCHAR(20) NOT NULL,
  demi_journee VARCHAR(20) NOT NULL,
  agent_ids UUID[] NOT NULL,
  binomes VARCHAR(200),
  zone_id VARCHAR(50),
  zone_name VARCHAR(100),
  ecole_id VARCHAR(50),
  ecole_name VARCHAR(100),
  vehicule BOOLEAN DEFAULT FALSE,
  mission TEXT,
  reunion BOOLEAN DEFAULT FALSE,
  commentaires TEXT,
  planning_id UUID REFERENCES plannings(id) ON DELETE SET NULL,
  mois VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_nom VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  demi_journee VARCHAR(20),
  commentaire TEXT,
  statut VARCHAR(50) DEFAULT 'EN_ATTENTE',
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cree_par UUID,
  date_validation TIMESTAMP WITH TIME ZONE,
  valide_par UUID,
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
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE disponibilites ENABLE ROW LEVEL SECURITY;
ALTER TABLE plannings ENABLE ROW LEVEL SECURITY;
ALTER TABLE historique ENABLE ROW LEVEL SECURITY;
ALTER TABLE conges ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (for simplicity - in production, use Supabase Auth)
-- Allow all operations for now
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for agents" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for disponibilites" ON disponibilites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for plannings" ON plannings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for historique" ON historique FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for conges" ON conges FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- INSERT DEFAULT ADMIN USER
-- ============================================
INSERT INTO users (username, password, nom, prenom, role, actif)
VALUES ('admin', 'admin123', 'Administrateur', 'System', 'ADMIN', true)
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- INSERT DEFAULT AGENTS
-- ============================================
INSERT INTO agents (id, nom, type_contrat, actif) VALUES
  (uuid_generate_v4(), 'AA', 'TEMPS_PLEIN', true),
  (uuid_generate_v4(), 'AC', 'TEMPS_PLEIN', true),
  (uuid_generate_v4(), 'AH', 'TEMPS_PLEIN', true),
  (uuid_generate_v4(), 'BL', 'TEMPS_PLEIN', true),
  (uuid_generate_v4(), 'BM', 'TEMPS_PLEIN', true),
  (uuid_generate_v4(), 'DS', 'TEMPS_PLEIN', true),
  (uuid_generate_v4(), 'JC', 'TEMPS_PLEIN', true),
  (uuid_generate_v4(), 'NL', 'TEMPS_PLEIN', true),
  (uuid_generate_v4(), 'TG', 'TEMPS_PLEIN', true)
ON CONFLICT DO NOTHING;

-- Insert default disponibilites for each agent
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
        INSERT INTO disponibilites (agent_id, jour, demi_journee, disponible)
        VALUES (agent_record.id, jour_val, demi_val, true)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

