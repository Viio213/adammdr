// Statistics about agent pairs
export interface StatistiqueBinome {
  agent1: string;
  agent2: string;
  nombreOccurrences: number;
  dernierTravail?: Date;
}

// Statistics about zones
export interface StatistiqueZone {
  zoneId: string;
  zoneName: string;
  nombreOccurrences: number;
  isExterieur: boolean;
  agents: { [agentName: string]: number };
}

// Statistics about agent work patterns
export interface StatistiqueAgent {
  id: string;
  nom: string;
  nombreMatin: number;
  nombreApresMidi: number;
  nombreTotal: number;
  nombreVehicule: number;         // Times in vehicle
  nombrePied: number;             // Times on foot
  nombreZonesExterieures: number; // Times in Zone 1 or Zone 4
  zonesTravaillees: { [zoneId: string]: number };
  ecolesTravaillees: { [ecoleId: string]: number };
  partenairesFrequents: { [nom: string]: number };
}

// Vehicle statistics
export interface StatistiqueVehicule {
  agentId: string;
  agentNom: string;
  nombreVehicule: number;
  nombrePied: number;
  pourcentageVehicule: number;
}

// Exterior zones statistics (Zone 1 and 4)
export interface StatistiqueExterieur {
  agentId: string;
  agentNom: string;
  nombreExterieur: number;
  nombreInterieur: number;
  pourcentageExterieur: number;
}

// School statistics
export interface StatistiqueEcole {
  ecoleId: string;
  ecoleName: string;
  zoneId: string;
  zoneName: string;
  nombreOccurrences: number;
  agents: { [agentName: string]: number };
}


