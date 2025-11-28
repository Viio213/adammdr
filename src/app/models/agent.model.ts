// Agent model
export interface Agent {
  id: string;
  nom: string;          // Initials like AA, AC, BL, etc.
  nomComplet?: string;  // Full name if needed
  disponibilites: Disponibilite[];
  typeContrat: TypeContrat;
  indicationsSpeciales?: string;
  actif: boolean;
  userId?: string;      // Link to user account for leave management
}

export enum TypeContrat {
  TEMPS_PLEIN = 'TEMPS_PLEIN',
  MI_TEMPS = 'MI_TEMPS',
  TEMPS_PARTIEL = 'TEMPS_PARTIEL'
}

export const TYPE_CONTRAT_LABELS: { [key in TypeContrat]: string } = {
  [TypeContrat.TEMPS_PLEIN]: 'Temps plein',
  [TypeContrat.MI_TEMPS]: 'Mi-temps',
  [TypeContrat.TEMPS_PARTIEL]: 'Temps partiel'
};

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

export const JOURS_TRAVAIL = [
  JourSemaine.LUNDI,
  JourSemaine.MARDI,
  JourSemaine.MERCREDI,
  JourSemaine.JEUDI,
  JourSemaine.VENDREDI
];

// Default agents with their availabilities
export const AGENTS_DEFAUT: Omit<Agent, 'id'>[] = [
  {
    nom: 'AA',
    typeContrat: TypeContrat.TEMPS_PLEIN,
    actif: true,
    disponibilites: generateFullTimeDisponibilites()
  },
  {
    nom: 'AC',
    typeContrat: TypeContrat.TEMPS_PARTIEL,
    indicationsSpeciales: 'Pas dispo mercredi après-midi et vendredi après-midi',
    actif: true,
    disponibilites: generateDisponibilitesAC()
  },
  {
    nom: 'BL',
    typeContrat: TypeContrat.TEMPS_PLEIN,
    actif: true,
    disponibilites: generateFullTimeDisponibilites()
  },
  {
    nom: 'SJ',
    typeContrat: TypeContrat.TEMPS_PLEIN,
    actif: true,
    disponibilites: generateFullTimeDisponibilites()
  },
  {
    nom: 'JG',
    typeContrat: TypeContrat.TEMPS_PLEIN,
    actif: true,
    disponibilites: generateFullTimeDisponibilites()
  },
  {
    nom: 'DS',
    typeContrat: TypeContrat.TEMPS_PARTIEL,
    indicationsSpeciales: 'Pas dispo mardi (toute la journée) et mercredi matin',
    actif: true,
    disponibilites: generateDisponibilitesDS()
  },
  {
    nom: 'QG',
    typeContrat: TypeContrat.MI_TEMPS,
    indicationsSpeciales: 'Mi-temps, dispo lundi, mardi et mercredi matin',
    actif: true,
    disponibilites: generateDisponibilitesQG()
  },
  {
    nom: 'SC',
    typeContrat: TypeContrat.TEMPS_PLEIN,
    actif: true,
    disponibilites: generateFullTimeDisponibilites()
  },
  {
    nom: 'QB',
    typeContrat: TypeContrat.TEMPS_PLEIN,
    actif: true,
    disponibilites: generateFullTimeDisponibilites()
  }
];

// Helper functions for disponibilites
function generateFullTimeDisponibilites(): Disponibilite[] {
  const disponibilites: Disponibilite[] = [];
  for (const jour of JOURS_TRAVAIL) {
    disponibilites.push(
      { jour, demiJournee: DemiJournee.MATIN, disponible: true },
      { jour, demiJournee: DemiJournee.APRES_MIDI, disponible: true }
    );
  }
  return disponibilites;
}

// AC: Pas dispo mercredi après-midi et vendredi après-midi
function generateDisponibilitesAC(): Disponibilite[] {
  const disponibilites: Disponibilite[] = [];
  for (const jour of JOURS_TRAVAIL) {
    disponibilites.push({ jour, demiJournee: DemiJournee.MATIN, disponible: true });
    
    const isIndisponible = 
      (jour === JourSemaine.MERCREDI) || 
      (jour === JourSemaine.VENDREDI);
    
    disponibilites.push({ 
      jour, 
      demiJournee: DemiJournee.APRES_MIDI, 
      disponible: !isIndisponible 
    });
  }
  return disponibilites;
}

// DS: Pas dispo mardi (toute la journée) et mercredi matin
function generateDisponibilitesDS(): Disponibilite[] {
  const disponibilites: Disponibilite[] = [];
  for (const jour of JOURS_TRAVAIL) {
    const isMardi = jour === JourSemaine.MARDI;
    const isMercrediMatin = jour === JourSemaine.MERCREDI;
    
    disponibilites.push({ 
      jour, 
      demiJournee: DemiJournee.MATIN, 
      disponible: !isMardi && !isMercrediMatin 
    });
    disponibilites.push({ 
      jour, 
      demiJournee: DemiJournee.APRES_MIDI, 
      disponible: !isMardi 
    });
  }
  return disponibilites;
}

// QG: Mi-temps, dispo lundi, mardi et mercredi matin
function generateDisponibilitesQG(): Disponibilite[] {
  const disponibilites: Disponibilite[] = [];
  for (const jour of JOURS_TRAVAIL) {
    const isDispoMatin = [JourSemaine.LUNDI, JourSemaine.MARDI, JourSemaine.MERCREDI].includes(jour);
    
    disponibilites.push({ 
      jour, 
      demiJournee: DemiJournee.MATIN, 
      disponible: isDispoMatin 
    });
    disponibilites.push({ 
      jour, 
      demiJournee: DemiJournee.APRES_MIDI, 
      disponible: false 
    });
  }
  return disponibilites;
}


