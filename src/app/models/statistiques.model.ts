// Statistics about agent pairs
export interface StatistiqueBinome {
  agent1: string;
  agent2: string;
  nombreOccurrences: number;
  dernierTravail?: Date;
}

// Statistics about zones
export interface StatistiqueZone {
  zone: string;
  nombreOccurrences: number;
  agents: { [agentName: string]: number };
}

// Statistics about agent work patterns
export interface StatistiqueAgent {
  nom: string;
  nombreMatin: number;
  nombreApresMidi: number;
  nombreTotal: number;
  zonesTravaillees: { [zone: string]: number };
  partenairesFrequents: { [nom: string]: number };
}

