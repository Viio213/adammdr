// Types of leave/absence
export enum TypeConge {
  CONGE_ANNUEL = 'CONGE_ANNUEL',
  HEURE_DITE = 'HEURE_DITE', // Boni pointage
  RECUPERATION = 'RECUPERATION'
}

export const TYPE_CONGE_LABELS: { [key in TypeConge]: string } = {
  [TypeConge.CONGE_ANNUEL]: 'Congé annuel',
  [TypeConge.HEURE_DITE]: 'Heure-dite / Boni pointage',
  [TypeConge.RECUPERATION]: 'Heures de récupération'
};

// Leave entry
export interface Conge {
  id: string;
  agentId: string;
  agentNom: string;
  type: TypeConge;
  dateDebut: Date;
  dateFin: Date;
  demiJournee?: 'MATIN' | 'APRES_MIDI' | 'JOURNEE'; // For half-day leaves
  commentaire?: string;
  dateCreation: Date;
  creePar: string; // User ID who created it
}

