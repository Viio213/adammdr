// Zone and school models

export interface Ecole {
  id: string;
  nom: string;
  zoneId: string;
}

export interface Zone {
  id: string;
  nom: string;
  ecoles: Ecole[];
  isExterieur: boolean; // Zone 1 and 4 are "extérieur"
  marcheJour?: JourMarche; // Optional market day
}

export interface JourMarche {
  jour: string; // e.g., 'JEUDI'
  periode: 'MATIN' | 'APRES_MIDI';
  description: string;
}

// Predefined zones with schools
export const ZONES: Zone[] = [
  {
    id: 'zone1',
    nom: 'Zone 1 - Saint-Servais',
    ecoles: [{ id: 'e1', nom: 'E1', zoneId: 'zone1' }],
    isExterieur: true
  },
  {
    id: 'zone2',
    nom: 'Zone 2 - Centre Namur Ouest',
    ecoles: [
      { id: 'e4', nom: 'E4', zoneId: 'zone2' },
      { id: 'e8', nom: 'E8', zoneId: 'zone2' }
    ],
    isExterieur: false
  },
  {
    id: 'zone3',
    nom: 'Zone 3 - Centre Namur Est',
    ecoles: [
      { id: 'e71', nom: 'E71', zoneId: 'zone3' },
      { id: 'e6', nom: 'E6', zoneId: 'zone3' }
    ],
    isExterieur: false
  },
  {
    id: 'zone4',
    nom: 'Zone 4 - Jambes',
    ecoles: [{ id: 'e9', nom: 'E9', zoneId: 'zone4' }],
    isExterieur: true,
    marcheJour: {
      jour: 'JEUDI',
      periode: 'MATIN',
      description: 'Marché de Jambes'
    }
  }
];

// Helper to get zone by id
export function getZoneById(id: string): Zone | undefined {
  return ZONES.find(z => z.id === id);
}

// Helper to get all schools
export function getAllEcoles(): Ecole[] {
  return ZONES.flatMap(z => z.ecoles);
}

