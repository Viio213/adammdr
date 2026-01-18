import { Injectable, inject } from '@angular/core';
import { HistoriqueEntry } from '../models/historique.model';
import { 
  StatistiqueBinome, 
  StatistiqueZone, 
  StatistiqueAgent,
  StatistiqueVehicule,
  StatistiqueExterieur,
  StatistiqueEcole,
  StatistiqueChargeTravail
} from '../models/statistiques.model';
import { TypeConge, StatutConge } from '../models/conge.model';
import { ZONES } from '../models/zone.model';
import { DataService } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class StatistiquesService {
  private dataService = inject(DataService);

  /**
   * Filter historique by date range
   */
  private filterHistoriqueByDateRange(historique: HistoriqueEntry[], dateDebut?: Date, dateFin?: Date): HistoriqueEntry[] {
    if (!dateDebut && !dateFin) {
      return historique;
    }
    
    return historique.filter(entry => {
      const entryDate = new Date(entry.date);
      if (dateDebut && entryDate < dateDebut) return false;
      if (dateFin) {
        const finDate = new Date(dateFin);
        finDate.setHours(23, 59, 59, 999); // Include the entire end date
        if (entryDate > finDate) return false;
      }
      return true;
    });
  }

  /**
   * Get statistics about agent pairs
   */
  getStatistiquesBinomes(dateDebut?: Date, dateFin?: Date): StatistiqueBinome[] {
    const historique = this.dataService.getHistorique();
    const filteredHistorique = this.filterHistoriqueByDateRange(historique, dateDebut, dateFin);
    const binomesMap = new Map<string, StatistiqueBinome>();

    filteredHistorique.forEach(entry => {
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
  getStatistiquesZones(dateDebut?: Date, dateFin?: Date): StatistiqueZone[] {
    const historique = this.dataService.getHistorique();
    const filteredHistorique = this.filterHistoriqueByDateRange(historique, dateDebut, dateFin);
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

    filteredHistorique.forEach((entry: HistoriqueEntry) => {
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
  getStatistiquesAgents(dateDebut?: Date, dateFin?: Date): StatistiqueAgent[] {
    const historique = this.dataService.getHistorique();
    const filteredHistorique = this.filterHistoriqueByDateRange(historique, dateDebut, dateFin);
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

    filteredHistorique.forEach(entry => {
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
  getStatistiquesVehicules(dateDebut?: Date, dateFin?: Date): StatistiqueVehicule[] {
    const agentStats = this.getStatistiquesAgents(dateDebut, dateFin);
    
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
  getStatistiquesExterieur(dateDebut?: Date, dateFin?: Date): StatistiqueExterieur[] {
    const agentStats = this.getStatistiquesAgents(dateDebut, dateFin);
    
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
  getStatistiquesEcoles(dateDebut?: Date, dateFin?: Date): StatistiqueEcole[] {
    const historique = this.dataService.getHistorique();
    const filteredHistorique = this.filterHistoriqueByDateRange(historique, dateDebut, dateFin);
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

    filteredHistorique.forEach(entry => {
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
  getPairesPlusFrequentes(limit: number = 10, dateDebut?: Date, dateFin?: Date): StatistiqueBinome[] {
    return this.getStatistiquesBinomes(dateDebut, dateFin).slice(0, limit);
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
   * Get workload statistics per agent (visible only to managers)
   * Takes into account contract, leaves, sickness, and recovery
   */
  async getStatistiquesChargeTravail(dateDebut?: Date, dateFin?: Date): Promise<StatistiqueChargeTravail[]> {
    const agents = await this.dataService.refreshAgents();
    const conges = await this.dataService.refreshConges();
    const historique = this.dataService.getHistorique();
    const filteredHistorique = this.filterHistoriqueByDateRange(historique, dateDebut, dateFin);
    
    // Use provided dates or calculate from historique
    let dateMin: Date;
    let dateMax: Date;
    
    if (dateDebut && dateFin) {
      // Use provided dates
      dateMin = new Date(dateDebut);
      dateMax = new Date(dateFin);
    } else {
      // Calculate from filtered historique
      const dates = filteredHistorique.map(e => new Date(e.date));
      if (dates.length > 0) {
        dateMin = new Date(Math.min(...dates.map(d => d.getTime())));
        dateMax = new Date(Math.max(...dates.map(d => d.getTime())));
      } else {
        // Fallback: use current month if no historique
        const now = new Date();
        dateMin = new Date(now.getFullYear(), now.getMonth(), 1);
        dateMax = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
    }
    
    // Set time to start/end of day
    dateMin.setHours(0, 0, 0, 0);
    dateMax.setHours(23, 59, 59, 999);
    
    // Calculate total working days (Monday to Friday) in the period
    const totalWorkingDays = this.calculateWorkingDays(dateMin, dateMax);
    
    const stats: StatistiqueChargeTravail[] = [];
    
    for (const agent of agents) {
      if (!agent.enService) continue;
      
      // Calculate available days based on contract and disponibilites
      const joursDisponiblesTotal = this.calculateAvailableDays(agent, dateMin, dateMax, totalWorkingDays);
      
      // Calculate worked days from filtered historique
      const joursTravailTotal = this.calculateWorkedDays(agent.id, filteredHistorique);
      
      // Calculate leaves by type
      const { joursConges, joursMaladie, joursRecup } = this.calculateLeaves(agent.id, conges, dateMin, dateMax);
      
      // Calculate percentages
      const pourcentagePresence = joursDisponiblesTotal > 0 
        ? Math.round((joursTravailTotal / joursDisponiblesTotal) * 100) 
        : 0;
      
      const totalAbsence = joursConges + joursMaladie + joursRecup;
      const pourcentageAbsence = joursDisponiblesTotal > 0 
        ? Math.round((totalAbsence / joursDisponiblesTotal) * 100) 
        : 0;
      
      stats.push({
        agentId: agent.id,
        agentNom: agent.nom,
        typeContrat: agent.typeContrat || 'Non spécifié',
        joursDisponiblesTotal,
        joursTravailTotal,
        joursConges,
        joursMaladie,
        joursRecup,
        pourcentagePresence,
        pourcentageAbsence
      });
    }
    
    return stats.sort((a, b) => b.pourcentagePresence - a.pourcentagePresence);
  }
  
  /**
   * Calculate total working days (Monday to Friday) in a date range
   */
  private calculateWorkingDays(dateMin: Date, dateMax: Date): number {
    let count = 0;
    const current = new Date(dateMin);
    
    while (current <= dateMax) {
      const day = current.getDay();
      // Monday = 1, Friday = 5
      if (day >= 1 && day <= 5) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }
  
  /**
   * Calculate available days for an agent based on their contract type and disponibilites
   */
  private calculateAvailableDays(agent: any, dateMin: Date, dateMax: Date, totalWorkingDays: number): number {
    if (!agent.disponibilites || agent.disponibilites.length === 0) {
      return 0;
    }
    
    // Count how many half-days the agent is available per week
    const disponibilitesParSemaine = agent.disponibilites.filter((d: any) => d.disponible).length;
    
    // Calculate weeks in the period
    const weeks = Math.ceil(totalWorkingDays / 5);
    
    // Convert half-days to days (2 half-days = 1 day)
    // This gives the actual availability based on disponibilites
    const joursParSemaineDisponibilites = disponibilitesParSemaine / 2;
    
    // Also consider contract type for theoretical maximum
    let joursParSemaineTheorique = 5; // Default: temps plein
    if (agent.typeContrat === 'MI_TEMPS') {
      joursParSemaineTheorique = 2.5; // Mi-temps = 50%
    } else if (agent.typeContrat === 'TEMPS_PARTIEL') {
      // Temps partiel: use disponibilites as the base
      joursParSemaineTheorique = joursParSemaineDisponibilites;
    }
    
    // Use the minimum between theoretical (contract) and actual (disponibilites)
    // This ensures we don't count more days than the agent is actually available
    const joursParSemaine = Math.min(joursParSemaineTheorique, joursParSemaineDisponibilites);
    
    return Math.round(joursParSemaine * weeks);
  }
  
  /**
   * Calculate worked days for an agent from historique
   * Takes into account half-days: 2 half-days on the same day = 1 full day
   */
  private calculateWorkedDays(agentId: string, historique: any[]): number {
    // Map of date -> set of half-days worked (MATIN, APRES_MIDI)
    const workedHalfDaysByDate = new Map<string, Set<string>>();
    
    historique.forEach(entry => {
      if (entry.agentIds && entry.agentIds.includes(agentId)) {
        const dateStr = new Date(entry.date).toISOString().split('T')[0];
        if (!workedHalfDaysByDate.has(dateStr)) {
          workedHalfDaysByDate.set(dateStr, new Set());
        }
        // Add the half-day to the set for this date
        workedHalfDaysByDate.get(dateStr)!.add(entry.demiJournee || 'MATIN');
      }
    });
    
    // Calculate total days: count each date, but if both half-days are worked, count as 1 day
    let totalDays = 0;
    workedHalfDaysByDate.forEach((halfDays, dateStr) => {
      // If both MATIN and APRES_MIDI are worked, it's 1 full day
      // Otherwise, count as 0.5 day per half-day
      if (halfDays.size === 2) {
        totalDays += 1; // Full day
      } else {
        totalDays += 0.5; // Half day
      }
    });
    
    return Math.round(totalDays * 10) / 10; // Round to 1 decimal place
  }
  
  /**
   * Calculate leaves by type for an agent
   */
  private calculateLeaves(agentId: string, conges: any[], dateMin: Date, dateMax: Date): {
    joursConges: number;
    joursMaladie: number;
    joursRecup: number;
  } {
    let joursConges = 0;
    let joursMaladie = 0;
    let joursRecup = 0;
    
    conges.forEach(conge => {
      if (conge.agentId !== agentId) return;
      // Only count validated leaves
      if (conge.statut !== StatutConge.VALIDE) return;
      
      const debut = new Date(conge.dateDebut);
      const fin = new Date(conge.dateFin);
      
      // Check if leave overlaps with the period
      if (fin < dateMin || debut > dateMax) return;
      
      // Calculate days in the leave period
      const debutEffective = debut > dateMin ? debut : dateMin;
      const finEffective = fin < dateMax ? fin : dateMax;
      
      let jours = 0;
      const current = new Date(debutEffective);
      
      while (current <= finEffective) {
        const day = current.getDay();
        // Only count weekdays
        if (day >= 1 && day <= 5) {
          // If it's a half-day, count as 0.5, otherwise 1
          if (conge.demiJournee && conge.demiJournee !== 'JOURNEE') {
            jours += 0.5;
          } else {
            jours += 1;
          }
        }
        current.setDate(current.getDate() + 1);
      }
      
      // Categorize by type
      if (conge.type === TypeConge.CONGE_ANNUEL) {
        joursConges += jours;
      } else if (conge.type === TypeConge.CONGE_MALADIE) {
        joursMaladie += jours;
      } else if (conge.type === TypeConge.RECUPERATION) {
        joursRecup += jours;
      }
    });
    
    return {
      joursConges: Math.round(joursConges),
      joursMaladie: Math.round(joursMaladie),
      joursRecup: Math.round(joursRecup)
    };
  }

  /**
   * Generate a key for a pair (sorted to avoid duplicates)
   */
  private getPairKey(agent1: string, agent2: string): string {
    return agent1 < agent2 ? `${agent1}|${agent2}` : `${agent2}|${agent1}`;
  }
}
