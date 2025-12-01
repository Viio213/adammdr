// Types of leave/absence
export enum TypeConge {
  CONGE_ANNUEL = 'CONGE_ANNUEL',
  CONGE_MALADIE = 'CONGE_MALADIE',
  HEURE_DITE = 'HEURE_DITE', // Boni pointage
  RECUPERATION = 'RECUPERATION'
}

export const TYPE_CONGE_LABELS: { [key in TypeConge]: string } = {
  [TypeConge.CONGE_ANNUEL]: 'Congé annuel',
  [TypeConge.CONGE_MALADIE]: 'Congé maladie',
  [TypeConge.HEURE_DITE]: 'Heure-dite / Boni pointage',
  [TypeConge.RECUPERATION]: 'Heures de récupération'
};

// Leave status
export enum StatutConge {
  EN_ATTENTE = 'EN_ATTENTE',     // Request submitted, waiting for validation
  VALIDE = 'VALIDE',             // Approved by team leader
  REFUSE = 'REFUSE'              // Rejected
}

export const STATUT_CONGE_LABELS: { [key in StatutConge]: string } = {
  [StatutConge.EN_ATTENTE]: 'En traitement',
  [StatutConge.VALIDE]: 'Validé',
  [StatutConge.REFUSE]: 'Refusé'
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
  statut: StatutConge; // Leave request status
  dateValidation?: Date; // When the leave was validated/rejected
  validePar?: string; // User ID who validated/rejected
}

