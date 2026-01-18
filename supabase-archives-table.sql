-- ============================================
-- Migration: Renommer 'actif' en 'en_service' pour les agents
-- ============================================
-- Ce script renomme la colonne 'actif' en 'en_service' dans la table agents
-- pour éviter la confusion avec le statut 'actif' des utilisateurs

-- Renommer la colonne
ALTER TABLE agents RENAME COLUMN actif TO en_service;

-- Mettre à jour l'index si nécessaire
DROP INDEX IF EXISTS idx_agents_actif;
CREATE INDEX IF NOT EXISTS idx_agents_en_service ON agents(en_service);

-- Vérification
SELECT 'Migration completed: actif -> en_service' as status;


-- ============================================
-- SmartPlanner - Archives Table
-- Execute this in Supabase SQL Editor
-- ============================================

-- Create archives table for historique
CREATE TABLE IF NOT EXISTS historique_archives (
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
  date_archivage DATE NOT NULL,  -- Date when archived
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- Timestamp of archiving
  created_at TIMESTAMP WITH TIME ZONE  -- Original creation date
);

-- Create index on date_archivage for faster queries
CREATE INDEX IF NOT EXISTS idx_historique_archives_date_archivage ON historique_archives(date_archivage);
CREATE INDEX IF NOT EXISTS idx_historique_archives_date ON historique_archives(date);
CREATE INDEX IF NOT EXISTS idx_historique_archives_mois ON historique_archives(mois);

-- Enable RLS
ALTER TABLE historique_archives ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Allow all for historique_archives" ON historique_archives;

-- Create permissive policy
CREATE POLICY "Allow all for historique_archives" ON historique_archives FOR ALL USING (true) WITH CHECK (true);
