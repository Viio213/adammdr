// Agent model
export interface Agent {
  id: string;
  nom: string;
  disponibilites: Disponibilite[];
  zonesHabituelles?: string[];
  indicationsSpeciales?: string; // mi-temps, congés, absences, etc.
  actif: boolean;
}

export interface Disponibilite {
  jour: JourSemaine;
  demiJournee: DemiJournee;
  disponible: boolean;
}

export enum JourSemaine {
  LUNDI = 'LUNDI',
  MARDI = 'MARDI',
  MERCREDI = 'MERCREDI',
  JEUDI = 'JEUDI',
  VENDREDI = 'VENDREDI',
  SAMEDI = 'SAMEDI',
  DIMANCHE = 'DIMANCHE'
}

export enum DemiJournee {
  MATIN = 'MATIN',
  APRES_MIDI = 'APRES_MIDI'
}

export const JOURS_SEMAINE = [
  JourSemaine.LUNDI,
  JourSemaine.MARDI,
  JourSemaine.MERCREDI,
  JourSemaine.JEUDI,
  JourSemaine.VENDREDI,
  JourSemaine.SAMEDI,
  JourSemaine.DIMANCHE
];


