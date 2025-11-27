import { Injectable, inject } from '@angular/core';
import { HistoriqueEntry } from '../models/historique.model';
import { StatistiqueBinome, StatistiqueZone, StatistiqueAgent } from '../models/statistiques.model';
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

    historique.forEach(entry => {
      if (!entry.zone) return;

      if (!zonesMap.has(entry.zone)) {
        zonesMap.set(entry.zone, {
          zone: entry.zone,
          nombreOccurrences: 0,
          agents: {}
        });
      }

      const stat = zonesMap.get(entry.zone)!;
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
    const agentsMap = new Map<string, StatistiqueAgent>();

    historique.forEach(entry => {
      const agents = entry.binomes.split(',').map(a => a.trim());

      agents.forEach(agentNom => {
        if (!agentsMap.has(agentNom)) {
          agentsMap.set(agentNom, {
            nom: agentNom,
            nombreMatin: 0,
            nombreApresMidi: 0,
            nombreTotal: 0,
            zonesTravaillees: {},
            partenairesFrequents: {}
          });
        }

        const stat = agentsMap.get(agentNom)!;
        stat.nombreTotal++;

        if (entry.demiJournee === 'MATIN') {
          stat.nombreMatin++;
        } else {
          stat.nombreApresMidi++;
        }

        if (entry.zone) {
          stat.zonesTravaillees[entry.zone] = (stat.zonesTravaillees[entry.zone] || 0) + 1;
        }

        // Count partners
        agents.forEach(autreAgent => {
          if (autreAgent !== agentNom) {
            stat.partenairesFrequents[autreAgent] = (stat.partenairesFrequents[autreAgent] || 0) + 1;
          }
        });
      });
    });

    return Array.from(agentsMap.values()).sort((a, b) => b.nombreTotal - a.nombreTotal);
  }

  /**
   * Get most frequent pairs
   */
  getPairesPlusFrequentes(limit: number = 10): StatistiqueBinome[] {
    return this.getStatistiquesBinomes().slice(0, limit);
  }

  /**
   * Get least frequent pairs (to ensure fair distribution)
   */
  getPairesMoinsFrequentes(limit: number = 10): StatistiqueBinome[] {
    const stats = this.getStatistiquesBinomes();
    return stats.slice(-limit).reverse();
  }

  /**
   * Generate a key for a pair (sorted to avoid duplicates)
   */
  private getPairKey(agent1: string, agent2: string): string {
    return agent1 < agent2 ? `${agent1}|${agent2}` : `${agent2}|${agent1}`;
  }
}

