import { Agent, JourSemaine, DemiJournee } from './agent.model';

// Group model (binôme or trinôme)
export interface Groupe {
  id: string;
  agents: Agent[];
  zone?: string;
  mission?: string;
  reunion?: string;
  commentaires?: string;
}

// Planning entry for a specific day and half-day
export interface PlanningEntry {
  jour: JourSemaine;
  demiJournee: DemiJournee;
  groupes: Groupe[];
}

// Weekly planning
export interface PlanningSemaine {
  id: string;
  dateDebut: Date;
  dateFin: Date;
  entries: PlanningEntry[];
  dateGeneration: Date;
}

