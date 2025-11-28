import { Agent, JourSemaine, DemiJournee } from './agent.model';

// Historical entry
export interface HistoriqueEntry {
  id: string;
  date: Date;
  jour: JourSemaine;
  demiJournee: DemiJournee;
  binomes: string; // Names of agents separated by comma
  zone?: string;
  mission?: string;
  reunion?: string;
  commentaires?: string;
  planningId: string; // Reference to the planning that generated this entry
}


