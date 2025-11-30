import { Injectable, inject } from '@angular/core';
import { HistoriqueEntry } from '../models/historique.model';
import { 
  StatistiqueBinome, 
  StatistiqueZone, 
  StatistiqueAgent,
  StatistiqueVehicule,
  StatistiqueExterieur,
  StatistiqueEcole
} from '../models/statistiques.model';
import { ZONES } from '../models/zone.model';
import { DataService } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class StatistiquesService {
  private dataService = inject(DataService);

  /**
   * Get statistics about agent pairs
   */
  getStatistiquesBinomes(): StatistiqueBinome[] {
    const historique = this.dataService.getHistorique();
    const binomesMap = new Map<string, StatistiqueBinome>();

    historique.forEach(entry => {
      const agentIds = entry.agentIds || [];
      const agents = entry.binomes.split(',').map(a => a.trim());
      
      // Generate all pairs from the group
      for (let i = 0; i < agents.length; i++) {
        for (let j = i + 1; j < agents.length; j++) {
          const agent1 = agents[i];
          const agent2 = agents[j];
          const key = this.getPairKey(agent1, agent2);

          if (!binomesMap.has(key)) {
            binomesMap.set(key, {
              agent1,
              agent2,
              nombreOccurrences: 0,
              dernierTravail: undefined
            });
          }

          const stat = binomesMap.get(key)!;
          stat.nombreOccurrences++;
          if (!stat.dernierTravail || new Date(entry.date) > stat.dernierTravail) {
            stat.dernierTravail = new Date(entry.date);
          }
        }
      }
    });

    return Array.from(binomesMap.values()).sort((a, b) => b.nombreOccurrences - a.nombreOccurrences);
  }

  /**
   * Get statistics about zones
   */
  getStatistiquesZones(): StatistiqueZone[] {
    const historique = this.dataService.getHistorique();
    const zonesMap = new Map<string, StatistiqueZone>();

    // Initialize all zones
    ZONES.forEach(zone => {
      zonesMap.set(zone.id, {
        zoneId: zone.id,
        zoneName: zone.nom,
        nombreOccurrences: 0,
        isExterieur: zone.isExterieur,
        agents: {}
      });
    });

    historique.forEach(entry => {
      if (!entry.zoneId) return;

      const stat = zonesMap.get(entry.zoneId);
      if (!stat) return;

      stat.nombreOccurrences++;

      const agents = entry.binomes.split(',').map(a => a.trim());
      agents.forEach(agent => {
        stat.agents[agent] = (stat.agents[agent] || 0) + 1;
      });
    });

    return Array.from(zonesMap.values()).sort((a, b) => b.nombreOccurrences - a.nombreOccurrences);
  }

  /**
   * Get statistics about individual agents
   */
  getStatistiquesAgents(): StatistiqueAgent[] {
    const historique = this.dataService.getHistorique();
    const agents = this.dataService.getAgents();
    const agentsMap = new Map<string, StatistiqueAgent>();

    // Initialize all agents
    agents.forEach(agent => {
      agentsMap.set(agent.id, {
        id: agent.id,
        nom: agent.nom,
        nombreMatin: 0,
        nombreApresMidi: 0,
        nombreTotal: 0,
        nombreVehicule: 0,
        nombrePied: 0,
        nombreZonesExterieures: 0,
        zonesTravaillees: {},
        ecolesTravaillees: {},
        partenairesFrequents: {}
      });
    });

    historique.forEach(entry => {
      const agentIds = entry.agentIds || [];
      const agentNoms = entry.binomes.split(',').map(a => a.trim());
      const zone = entry.zoneId ? ZONES.find(z => z.id === entry.zoneId) : null;

      agentIds.forEach((agentId, index) => {
        const stat = agentsMap.get(agentId);
        if (!stat) return;

        stat.nombreTotal++;

        if (entry.demiJournee === 'MATIN') {
          stat.nombreMatin++;
        } else {
          stat.nombreApresMidi++;
        }

        // Vehicle stats
        if (entry.vehicule) {
          stat.nombreVehicule++;
        } else {
          stat.nombrePied++;
        }

        // Exterior zones stats
        if (zone?.isExterieur) {
          stat.nombreZonesExterieures++;
        }

        // Zone stats
        if (entry.zoneId) {
          stat.zonesTravaillees[entry.zoneId] = (stat.zonesTravaillees[entry.zoneId] || 0) + 1;
        }

        // School stats
        if (entry.ecoleId) {
          stat.ecolesTravaillees[entry.ecoleId] = (stat.ecolesTravaillees[entry.ecoleId] || 0) + 1;
        }

        // Partners stats
        agentNoms.forEach((autreNom, otherIndex) => {
          if (index !== otherIndex) {
            stat.partenairesFrequents[autreNom] = (stat.partenairesFrequents[autreNom] || 0) + 1;
          }
        });
      });
    });

    return Array.from(agentsMap.values())
      .filter(a => a.nombreTotal > 0)
      .sort((a, b) => b.nombreTotal - a.nombreTotal);
  }

  /**
   * Get vehicle statistics per agent
   */
  getStatistiquesVehicules(): StatistiqueVehicule[] {
    const agentStats = this.getStatistiquesAgents();
    
    return agentStats.map(stat => ({
      agentId: stat.id,
      agentNom: stat.nom,
      nombreVehicule: stat.nombreVehicule,
      nombrePied: stat.nombrePied,
      pourcentageVehicule: stat.nombreTotal > 0 
        ? Math.round((stat.nombreVehicule / stat.nombreTotal) * 100) 
        : 0
    })).sort((a, b) => b.pourcentageVehicule - a.pourcentageVehicule);
  }

  /**
   * Get exterior zones statistics per agent (Zone 1 and Zone 4)
   */
  getStatistiquesExterieur(): StatistiqueExterieur[] {
    const agentStats = this.getStatistiquesAgents();
    
    return agentStats.map(stat => {
      const nombreInterieur = stat.nombreTotal - stat.nombreZonesExterieures;
      return {
        agentId: stat.id,
        agentNom: stat.nom,
        nombreExterieur: stat.nombreZonesExterieures,
        nombreInterieur,
        pourcentageExterieur: stat.nombreTotal > 0 
          ? Math.round((stat.nombreZonesExterieures / stat.nombreTotal) * 100) 
          : 0
      };
    }).sort((a, b) => b.pourcentageExterieur - a.pourcentageExterieur);
  }

  /**
   * Get statistics about schools
   */
  getStatistiquesEcoles(): StatistiqueEcole[] {
    const historique = this.dataService.getHistorique();
    const ecolesMap = new Map<string, StatistiqueEcole>();

    // Initialize all schools from zones
    ZONES.forEach(zone => {
      zone.ecoles.forEach(ecole => {
        ecolesMap.set(ecole.id, {
          ecoleId: ecole.id,
          ecoleName: ecole.nom,
          zoneId: zone.id,
          zoneName: zone.nom,
          nombreOccurrences: 0,
          agents: {}
        });
      });
    });

    historique.forEach(entry => {
      if (!entry.ecoleId) return;

      const stat = ecolesMap.get(entry.ecoleId);
      if (!stat) return;

      stat.nombreOccurrences++;

      const agents = entry.binomes.split(',').map(a => a.trim());
      agents.forEach(agent => {
        stat.agents[agent] = (stat.agents[agent] || 0) + 1;
      });
    });

    return Array.from(ecolesMap.values()).sort((a, b) => b.nombreOccurrences - a.nombreOccurrences);
  }

  /**
   * Get most frequent pairs
   */
  getPairesPlusFrequentes(limit: number = 10): StatistiqueBinome[] {
    return this.getStatistiquesBinomes().slice(0, limit);
  }

  /**
   * Get least frequent pairs (for balancing)
   */
  getPairesMoinsFrequentes(limit: number = 10): StatistiqueBinome[] {
    const stats = this.getStatistiquesBinomes();
    return stats.slice(-limit).reverse();
  }

  /**
   * Get agents who had the least vehicle time (for priority)
   */
  getAgentsMoinsVehicule(limit: number = 5): StatistiqueVehicule[] {
    const stats = this.getStatistiquesVehicules();
    return stats.slice(-limit).reverse();
  }

  /**
   * Get agents sorted by exterior percentage (lowest first) for rebalancing
   * Agents with lower exterior percentage should be prioritized for exterior zones
   */
  getAgentsForExterieurRebalancing(): StatistiqueExterieur[] {
    const stats = this.getStatistiquesExterieur();
    // Sort by pourcentageExterieur ascending (lowest first = should go to exterior)
    return stats.sort((a, b) => a.pourcentageExterieur - b.pourcentageExterieur);
  }

  /**
   * Get exterior percentage for a specific agent
   */
  getAgentExterieurPercentage(agentId: string): number {
    const stats = this.getStatistiquesExterieur();
    const agentStat = stats.find(s => s.agentId === agentId);
    return agentStat?.pourcentageExterieur ?? 0;
  }

  /**
   * Calculate priority score for an agent to be assigned to exterior zone
   * Lower score = higher priority for exterior (has been to exterior less often)
   */
  getAgentExterieurPriorityScore(agentId: string): number {
    return this.getAgentExterieurPercentage(agentId);
  }

  /**
   * Generate a key for a pair (sorted to avoid duplicates)
   */
  private getPairKey(agent1: string, agent2: string): string {
    return agent1 < agent2 ? `${agent1}|${agent2}` : `${agent2}|${agent1}`;
  }
}
