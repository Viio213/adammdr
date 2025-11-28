import { JourSemaine, DemiJournee } from './agent.model';

// Historical entry
export interface HistoriqueEntry {
  id: string;
  date: Date;
  jour: JourSemaine;
  demiJournee: DemiJournee;
  agentIds: string[];     // Agent IDs in the group
  binomes: string;        // Names of agents separated by comma (for display)
  zoneId?: string;        // Zone ID
  zoneName?: string;      // Zone name for display
  ecoleId?: string;       // School ID
  ecoleName?: string;     // School name for display
  vehicule: boolean;      // true = en véhicule
  mission?: string;
  reunion?: string;
  commentaires?: string;
  planningId: string;     // Reference to the planning that generated this entry
  mois: string;           // YYYY-MM for monthly storage
}

// Monthly historique summary
export interface HistoriqueMois {
  mois: string;           // YYYY-MM
  entries: HistoriqueEntry[];
  dateCreation: Date;
}


