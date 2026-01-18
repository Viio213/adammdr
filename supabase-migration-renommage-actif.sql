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
