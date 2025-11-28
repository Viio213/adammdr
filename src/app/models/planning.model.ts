import { Agent, JourSemaine, DemiJournee } from './agent.model';

// Group model (binôme or trinôme) - 2 or 3 agents only
export interface Groupe {
  id: string;
  agents: Agent[];
  zoneId?: string;      // Zone ID (zone1, zone2, zone3, zone4)
  ecoleId?: string;     // School ID
  vehicule: boolean;    // true = en véhicule, false = à pied
  mission?: string;
  reunion?: string;
  commentaires?: string;
}

// Planning entry for a specific day and half-day
export interface PlanningEntry {
  jour: JourSemaine;
  demiJournee: DemiJournee;
  groupes: Groupe[];
  isGenerated: boolean;  // Has this slot been generated?
}

// Daily planning (for the new structure)
export interface PlanningJour {
  jour: JourSemaine;
  date: Date;
  matin: PlanningEntry;
  apresMidi: PlanningEntry;
}

// Weekly planning
export interface PlanningSemaine {
  id: string;
  dateDebut: Date;
  dateFin: Date;
  jours: PlanningJour[];      // New structure by day
  entries: PlanningEntry[];   // Keep for compatibility
  dateGeneration: Date;
  isConfirmed: boolean;       // Planning confirmed and saved to history
  dateConfirmation?: Date;
}

// Planning status
export enum PlanningStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED'
}


