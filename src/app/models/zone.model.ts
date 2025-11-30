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
  priorite: number; // Priority for coverage: lower = higher priority (Z2,Z3 = 1, Z4 = 2, Z1 = 3)
}

export interface JourMarche {
  jour: string; // e.g., 'JEUDI'
  periode: 'MATIN' | 'APRES_MIDI';
  description: string;
}

// Predefined zones with schools
// Priority: Zone 2 & 3 first (priority 1), then Zone 4 (priority 2), then Zone 1 (priority 3)
export const ZONES: Zone[] = [
  {
    id: 'zone1',
    nom: 'Zone 1 - Saint-Servais',
    ecoles: [{ id: 'e1', nom: 'E1', zoneId: 'zone1' }],
    isExterieur: true,
    priorite: 3 // Lowest priority - covered last
  },
  {
    id: 'zone2',
    nom: 'Zone 2 - Centre Namur Ouest',
    ecoles: [
      { id: 'e4', nom: 'E4', zoneId: 'zone2' },
      { id: 'e8', nom: 'E8', zoneId: 'zone2' }
    ],
    isExterieur: false,
    priorite: 1 // Highest priority - covered first
  },
  {
    id: 'zone3',
    nom: 'Zone 3 - Centre Namur Est',
    ecoles: [
      { id: 'e71', nom: 'E71', zoneId: 'zone3' },
      { id: 'e6', nom: 'E6', zoneId: 'zone3' }
    ],
    isExterieur: false,
    priorite: 1 // Highest priority - covered first
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
    },
    priorite: 2 // Medium priority
  }
];

// Get zones sorted by priority (for coverage allocation)
export function getZonesByPriority(): Zone[] {
  return [...ZONES].sort((a, b) => a.priorite - b.priorite);
}

// Helper to get zone by id
export function getZoneById(id: string): Zone | undefined {
  return ZONES.find(z => z.id === id);
}

// Helper to get all schools
export function getAllEcoles(): Ecole[] {
  return ZONES.flatMap(z => z.ecoles);
}

