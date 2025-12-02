import { Injectable, inject } from '@angular/core';
import { Agent, JourSemaine, DemiJournee, JOURS_TRAVAIL } from '../models/agent.model';
import { Groupe, PlanningEntry, PlanningJour, PlanningSemaine } from '../models/planning.model';
import { HistoriqueEntry } from '../models/historique.model';
import { ZONES, Zone, getZonesByPriority } from '../models/zone.model';
import { DataService } from './data.service';
import { StatistiquesService } from './statistiques.service';

/**
 * Planning Generator Service
 * 
 * RULES (in priority order):
 * 1. No same pair morning AND afternoon on the same day (if possible)
 * 2. No same agent in the same zone morning AND afternoon (if possible)
 * 3. Avoid same pairs on consecutive days (if possible)
 * 4. Balance pairs over time - everyone should work with everyone equally over 1 month
 */
@Injectable({
  providedIn: 'root'
})
export class PlanningGeneratorService {
  private dataService = inject(DataService);
  private statistiquesService = inject(StatistiquesService);
  
  // Track pairs used in the current week generation to avoid consecutive days
  private pairsUsedByDay: Map<number, Set<string>> = new Map();

  /**
   * Generate a full weekly planning
   */
  generatePlanningSemaine(dateDebut: Date): PlanningSemaine {
    const dateFin = new Date(dateDebut);
    dateFin.setDate(dateFin.getDate() + 4); // Monday to Friday

    const jours: PlanningJour[] = [];
    
    // Reset weekly tracking
    this.pairsUsedByDay.clear();

    for (let i = 0; i < 5; i++) {
      const jour = JOURS_TRAVAIL[i];
      const date = new Date(dateDebut);
      date.setDate(date.getDate() + i);

      // Pass day index for consecutive day tracking
      const planningJour = this.generatePlanningJour(jour, date, i);
      jours.push(planningJour);
      
      // Track pairs used this day for next day's generation
      this.trackPairsForDay(i, planningJour);
    }

    // Build entries from jours for compatibility
    const entries: PlanningEntry[] = jours.flatMap(j => [j.matin, j.apresMidi]);

    return {
      id: this.generateId(),
      dateDebut,
      dateFin,
      jours,
      entries,
      dateGeneration: new Date(),
      isConfirmed: false
    };
  }
  
  /**
   * Track all pairs used on a specific day
   */
  private trackPairsForDay(dayIndex: number, planningJour: PlanningJour): void {
    const pairs = new Set<string>();
    
    [planningJour.matin, planningJour.apresMidi].forEach(entry => {
      entry.groupes.forEach(groupe => {
        // Generate all pairs from this group
        for (let i = 0; i < groupe.agents.length; i++) {
          for (let j = i + 1; j < groupe.agents.length; j++) {
            const pairKey = this.getPairKeyById(groupe.agents[i].id, groupe.agents[j].id);
            pairs.add(pairKey);
          }
        }
      });
    });
    
    this.pairsUsedByDay.set(dayIndex, pairs);
  }
  
  /**
   * Get pairs used on the previous day (for avoiding consecutive days)
   */
  private getPairsFromPreviousDay(dayIndex: number): Set<string> {
    return this.pairsUsedByDay.get(dayIndex - 1) || new Set();
  }

  /**
   * Generate planning for a single day
   */
  generatePlanningJour(jour: JourSemaine, date: Date, dayIndex: number = 0): PlanningJour {
    const historique = this.dataService.getHistorique();
    const previousDayPairs = this.getPairsFromPreviousDay(dayIndex);

    // Generate morning
    const matin = this.generateDemiJournee(jour, date, DemiJournee.MATIN, historique, [], previousDayPairs);

    // Generate afternoon (must avoid same pairs as morning)
    const apresMidi = this.generateDemiJournee(jour, date, DemiJournee.APRES_MIDI, historique, [matin], previousDayPairs);

    return {
      jour,
      date,
      matin,
      apresMidi
    };
  }

  /**
   * Regenerate only one day in an existing planning
   */
  regenerateJour(planning: PlanningSemaine, jour: JourSemaine): PlanningSemaine {
    const jourIndex = JOURS_TRAVAIL.indexOf(jour);
    if (jourIndex === -1) return planning;

    const date = new Date(planning.dateDebut);
    date.setDate(date.getDate() + jourIndex);
    
    // Rebuild tracking from existing days
    this.pairsUsedByDay.clear();
    for (let i = 0; i < jourIndex; i++) {
      if (planning.jours[i]) {
        this.trackPairsForDay(i, planning.jours[i]);
      }
    }

    const newPlanningJour = this.generatePlanningJour(jour, date, jourIndex);

    const updatedJours = [...planning.jours];
    updatedJours[jourIndex] = newPlanningJour;

    // Rebuild entries
    const entries: PlanningEntry[] = updatedJours.flatMap(j => [j.matin, j.apresMidi]);

    return {
      ...planning,
      jours: updatedJours,
      entries,
      dateGeneration: new Date()
    };
  }

  /**
   * Generate planning for a half-day
   * IMPORTANT: All available agents MUST be included in the planning
   * 
   * RULES applied:
   * 1. No same pair morning AND afternoon (same day)
   * 2. No same agent in same zone morning AND afternoon
   * 3. Avoid same pairs on consecutive days
   * 4. Balance pairs over time (favor less frequent pairs)
   */
  private generateDemiJournee(
    jour: JourSemaine,
    date: Date,
    demiJournee: DemiJournee,
    historique: HistoriqueEntry[],
    entriesMemeJour: PlanningEntry[],
    previousDayPairs: Set<string> = new Set()
  ): PlanningEntry {
    // Get available agents for this half-day (considering leaves)
    const allAgents = this.dataService.getAgents().filter(a => a.actif);
    let agentsDisponibles = allAgents.filter(agent =>
      this.dataService.isAgentAvailable(agent.id, date, demiJournee)
    );
    
    // Shuffle agents to add randomness to planning generation
    this.shuffleArray(agentsDisponibles);

    // If only 1 agent available, create a solo group
    if (agentsDisponibles.length === 1) {
      return {
        jour,
        demiJournee,
        groupes: [{
          id: this.generateId(),
          agents: [agentsDisponibles[0]],
          zoneId: 'zone1',
          vehicule: false
        }],
        isGenerated: true
      };
    }

    if (agentsDisponibles.length === 0) {
      return {
        jour,
        demiJournee,
        groupes: [],
        isGenerated: true
      };
    }

    const groupes: Groupe[] = [];
    const agentsUtilises = new Set<string>();
    
    // Get zones already used by agents in the morning (for afternoon)
    const zonesMatin = this.getZonesMatinParAgent(entriesMemeJour);

    // Available zones sorted by priority (Z2, Z3 first, then Z4, then Z1)
    let zonesDisponibles = getZonesByPriority();
    
    // Shuffle zones slightly to add variety (but keep priority order for first few groups)
    // Shuffle only after first 2 zones to maintain some priority
    if (zonesDisponibles.length > 2) {
      const priorityZones = zonesDisponibles.slice(0, 2);
      const otherZones = zonesDisponibles.slice(2);
      this.shuffleArray(otherZones);
      zonesDisponibles = [...priorityZones, ...otherZones];
    }

    // Get exterior statistics for rebalancing
    const exterieurStats = this.statistiquesService.getAgentsForExterieurRebalancing();

    let zoneIndex = 0;

    // First pass: create groups of 2 or 3
    while (agentsUtilises.size < agentsDisponibles.length) {
      const agentsRestants = agentsDisponibles.filter(a => !agentsUtilises.has(a.id));

      // If only 1 agent left, we'll handle it after this loop
      if (agentsRestants.length < 2) break;

      // Determine group size (prefer binômes, max 1 trinôme per period if odd number)
      let tailleGroupe = 2;
      if (agentsRestants.length === 3) {
        tailleGroupe = 3; // If exactly 3 left, make a trinôme
      } else if (agentsRestants.length % 2 === 1 && groupes.length === 0) {
        tailleGroupe = 3; // Make first group a trinôme if odd total
      }

      // Select zone for this group
      const zone = zonesDisponibles[zoneIndex % zonesDisponibles.length];
      zoneIndex++;

      // Select agents with rebalancing for exterior zones
      const agentsGroupe = this.selectAgentsPourGroupe(
        agentsRestants,
        tailleGroupe,
        jour,
        demiJournee,
        historique,
        entriesMemeJour,
        zone,
        zonesMatin,
        exterieurStats,
        previousDayPairs
      );

      if (agentsGroupe.length >= 2) {
        agentsGroupe.forEach(a => agentsUtilises.add(a.id));
        
        // Pick a random school from the zone
        const ecole = zone.ecoles.length > 0 
          ? zone.ecoles[Math.floor(Math.random() * zone.ecoles.length)]
          : null;

        groupes.push({
          id: this.generateId(),
          agents: agentsGroupe,
          zoneId: zone.id,
          ecoleId: ecole?.id,
          vehicule: false // Default to walking, can be changed manually
        });
      } else {
        break;
      }
    }

    // Second pass: ensure ALL remaining agents are assigned
    // If there's 1 agent left, add them to the last group (making it a trinôme)
    const agentsNonAssignes = agentsDisponibles.filter(a => !agentsUtilises.has(a.id));
    
    if (agentsNonAssignes.length > 0 && groupes.length > 0) {
      // Add remaining agents to existing groups
      for (const agent of agentsNonAssignes) {
        // Find the smallest group to add this agent to
        const plusPetitGroupe = groupes.reduce((min, g) => 
          g.agents.length < min.agents.length ? g : min
        , groupes[0]);
        
        plusPetitGroupe.agents.push(agent);
        agentsUtilises.add(agent.id);
      }
    } else if (agentsNonAssignes.length > 0 && groupes.length === 0) {
      // No groups created yet but we have agents - create a group with all of them
      const zone = zonesDisponibles[0];
      const ecole = zone.ecoles.length > 0 
        ? zone.ecoles[Math.floor(Math.random() * zone.ecoles.length)]
        : null;
        
      groupes.push({
        id: this.generateId(),
        agents: agentsNonAssignes,
        zoneId: zone.id,
        ecoleId: ecole?.id,
        vehicule: false
      });
    }

    return {
      jour,
      demiJournee,
      groupes,
      isGenerated: true
    };
  }

  /**
   * Get zones used by each agent in the morning
   */
  private getZonesMatinParAgent(entriesMemeJour: PlanningEntry[]): Map<string, string> {
    const zonesMatin = new Map<string, string>();
    
    entriesMemeJour
      .filter(e => e.demiJournee === DemiJournee.MATIN)
      .forEach(entry => {
        entry.groupes.forEach(groupe => {
          if (groupe.zoneId) {
            groupe.agents.forEach(agent => {
              zonesMatin.set(agent.id, groupe.zoneId!);
            });
          }
        });
      });
    
    return zonesMatin;
  }

  /**
   * Select agents for a group with rebalancing based on statistics
   * 
   * RULES (in priority order):
   * 1. No same pair morning AND afternoon on the same day (HARD rule - score 999999)
   * 2. No same agent in the same zone morning AND afternoon (SOFT rule - filtered first)
   * 3. Avoid same pairs on consecutive days (SOFT rule - penalty score 100)
   * 4. Balance pairs over time - favor less frequent pairs (score based on frequency)
   * 5. For exterior zones: prioritize agents with LOWER exterior percentage
   * 6. Add randomness to ensure different planning each time
   */
  private selectAgentsPourGroupe(
    agentsDisponibles: Agent[],
    taille: number,
    jour: JourSemaine,
    demiJournee: DemiJournee,
    historique: HistoriqueEntry[],
    entriesMemeJour: PlanningEntry[],
    zone: Zone,
    zonesMatin: Map<string, string>,
    exterieurStats: { agentId: string; pourcentageExterieur: number }[],
    previousDayPairs: Set<string> = new Set()
  ): Agent[] {
    // RULE 2: Filter agents who weren't in the same zone in the morning
    let candidats = agentsDisponibles.filter(a => {
      const zoneMatin = zonesMatin.get(a.id);
      return !zoneMatin || zoneMatin !== zone.id;
    });

    // If not enough candidates after zone filtering, use all available
    if (candidats.length < taille) {
      candidats = [...agentsDisponibles];
    }

    // For exterior zones (Z1, Z4), sort by exterior percentage (lowest first for rebalancing)
    if (zone.isExterieur) {
      candidats = this.sortAgentsByExterieurPriority(candidats, exterieurStats);
    } else {
      // For interior zones, shuffle to add randomness
      this.shuffleArray(candidats);
    }

    // Get pair statistics for rebalancing (RULE 4)
    const pairStats = this.statistiquesService.getStatistiquesBinomes();
    
    // Calculate ideal pair frequency for perfect balance
    const agents = this.dataService.getAgents().filter(a => a.actif);
    const totalPairs = (agents.length * (agents.length - 1)) / 2;
    const avgFrequency = pairStats.length > 0 
      ? pairStats.reduce((sum, p) => sum + p.nombreOccurrences, 0) / Math.max(totalPairs, 1)
      : 0;

    const selected: Agent[] = [];

    // Select first agent (for exterior zones, use the one with lowest exterior %)
    if (candidats.length > 0) {
      selected.push(candidats[0]);
    }

    // Select remaining agents based on comprehensive scoring
    const remainingCandidats = candidats.slice(1);
    
    // Score each candidate based on all rules
    const scoredCandidats = remainingCandidats.map(agent => {
      let score = 0;
      
      // RULE 1: Check if this agent forms a pair with ANY selected agent in the morning
      // This is a HARD rule - absolutely avoid
      const formesPaireMatin = selected.some(a => 
        this.pairExisteDansPeriode(a, agent, entriesMemeJour, DemiJournee.MATIN)
      );
      
      if (formesPaireMatin) {
        return { agent, score: 999999 }; // HARD rule violation
      }

      // Also check if this agent would form a pair with any agent already in a morning group
      const formePaireAvecAutreGroupeMatin = this.agentFormePaireAvecGroupeMatin(
        agent, 
        selected, 
        entriesMemeJour
      );
      
      if (formePaireAvecAutreGroupeMatin) {
        return { agent, score: 999999 }; // HARD rule violation
      }

      // RULE 3: Check if this pair was used yesterday (consecutive days)
      // This is a SOFT rule - penalize but don't forbid
      for (const selectedAgent of selected) {
        const pairKey = this.getPairKeyById(agent.id, selectedAgent.id);
        if (previousDayPairs.has(pairKey)) {
          score += 100; // Significant penalty for consecutive days
        }
      }

      // RULE 4: Calculate score based on pair frequency with selected agents
      // Lower frequency = better (we want to balance pairs over time)
      for (const selectedAgent of selected) {
        const pairCount = this.getPairFrequency(agent, selectedAgent, pairStats);
        // Score increases with frequency - penalize pairs that worked together often
        // The further from average, the higher the penalty
        const frequencyPenalty = Math.max(0, pairCount - avgFrequency);
        score += frequencyPenalty * 2; // Weight for frequency balancing
      }

      // RULE 6: Add small random factor to break ties and add variety
      const randomFactor = Math.random() * 0.5;
      score += randomFactor;
      
      return { agent, score };
    });

    // Sort by score (ascending - lowest score = best candidate)
    scoredCandidats.sort((a, b) => a.score - b.score);

    // Add agents with lowest scores (skip HARD rule violations)
    for (const { agent, score } of scoredCandidats) {
      if (selected.length >= taille) break;
      if (score < 999999) { // Skip HARD rule violations
        selected.push(agent);
      }
    }

    // If we couldn't find enough without HARD violations, try SOFT violations
    if (selected.length < taille) {
      // First try candidates with consecutive day penalty (score < 999999)
      for (const { agent, score } of scoredCandidats) {
        if (selected.length >= taille) break;
        if (!selected.includes(agent) && score < 999999) {
          selected.push(agent);
        }
      }
    }

    // Final fallback: if still not enough, we MUST include agents even with HARD violations
    // (this happens when there are very few agents available)
    if (selected.length < 2) {
      for (const agent of candidats) {
        if (selected.length >= taille) break;
        if (!selected.includes(agent)) {
          selected.push(agent);
        }
      }
    }

    return selected;
  }
  
  /**
   * Generate a pair key from agent IDs (sorted for consistency)
   */
  private getPairKeyById(agentId1: string, agentId2: string): string {
    return agentId1 < agentId2 ? `${agentId1}|${agentId2}` : `${agentId2}|${agentId1}`;
  }

  /**
   * Get the frequency of a specific pair from statistics
   */
  private getPairFrequency(agent1: Agent, agent2: Agent, pairStats: { agent1: string; agent2: string; nombreOccurrences: number }[]): number {
    const stat = pairStats.find(p => 
      (p.agent1 === agent1.nom && p.agent2 === agent2.nom) ||
      (p.agent1 === agent2.nom && p.agent2 === agent1.nom)
    );
    return stat?.nombreOccurrences ?? 0;
  }

  /**
   * Sort agents by exterior zone priority for rebalancing
   * Agents with LOWER exterior percentage are prioritized (should go to exterior more)
   */
  private sortAgentsByExterieurPriority(
    agents: Agent[],
    exterieurStats: { agentId: string; pourcentageExterieur: number }[]
  ): Agent[] {
    // Create a map for quick lookup
    const statsMap = new Map<string, number>();
    exterieurStats.forEach(stat => {
      statsMap.set(stat.agentId, stat.pourcentageExterieur);
    });

    // Sort agents by exterior percentage (ascending - lowest first)
    return [...agents].sort((a, b) => {
      const percentA = statsMap.get(a.id) ?? 50; // Default to 50% if no stats
      const percentB = statsMap.get(b.id) ?? 50;
      return percentA - percentB;
    });
  }

  /**
   * Check if a pair exists in a specific period
   */
  private pairExisteDansPeriode(
    agent1: Agent,
    agent2: Agent,
    entries: PlanningEntry[],
    demiJournee: DemiJournee
  ): boolean {
    return entries
      .filter(e => e.demiJournee === demiJournee)
      .some(entry =>
        entry.groupes.some(groupe =>
          groupe.agents.some(a => a.id === agent1.id) &&
          groupe.agents.some(a => a.id === agent2.id)
        )
      );
  }

  /**
   * Check if an agent would form a pair with any agent in the selected group
   * that already exists in a morning group
   * This ensures we don't have the same pair morning and afternoon
   */
  private agentFormePaireAvecGroupeMatin(
    agent: Agent,
    selectedAgents: Agent[],
    entriesMemeJour: PlanningEntry[]
  ): boolean {
    // Get all morning groups
    const matinEntries = entriesMemeJour.filter(e => e.demiJournee === DemiJournee.MATIN);
    
    // Check if this agent forms a pair (2+ agents together) with any selected agent
    // in any morning group
    for (const matinEntry of matinEntries) {
      for (const groupeMatin of matinEntry.groupes) {
        // Check if at least 1 agent from selectedAgents is in this morning group
        const agentsEnCommun = groupeMatin.agents.filter(a => 
          selectedAgents.some(sa => sa.id === a.id)
        );
        
        // If 1+ agents from selectedAgents are in this morning group,
        // check if 'agent' is also in this same morning group
        if (agentsEnCommun.length >= 1) {
          const agentDansGroupeMatin = groupeMatin.agents.some(a => a.id === agent.id);
          
          // If agent is in the same morning group as a selected agent,
          // we're forming a forbidden pair (same pair morning and afternoon)
          if (agentDansGroupeMatin) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Check if a pair is too frequent in history
   */
  private pairTropFrequent(
    agent1: Agent,
    agent2: Agent,
    historique: HistoriqueEntry[]
  ): boolean {
    const quatreSemainesAgo = new Date();
    quatreSemainesAgo.setDate(quatreSemainesAgo.getDate() - 28);

    const occurrences = historique
      .filter(h => new Date(h.date) >= quatreSemainesAgo)
      .filter(h => {
        const agentIds = h.agentIds || [];
        return agentIds.includes(agent1.id) && agentIds.includes(agent2.id);
      }).length;

    return occurrences >= 3;
  }

  /**
   * Convert planning to historique entries
   */
  planningToHistorique(planning: PlanningSemaine): HistoriqueEntry[] {
    const entries: HistoriqueEntry[] = [];

    planning.jours.forEach(planningJour => {
      [planningJour.matin, planningJour.apresMidi].forEach(entry => {
        entry.groupes.forEach(groupe => {
          const binomes = groupe.agents.map(a => a.nom).join(', ');
          const zone = groupe.zoneId ? ZONES.find(z => z.id === groupe.zoneId) : null;
          const ecole = zone?.ecoles.find(e => e.id === groupe.ecoleId);
          const mois = this.formatMois(planningJour.date);

          entries.push({
            id: this.generateId(),
            date: planningJour.date,
            jour: entry.jour,
            demiJournee: entry.demiJournee,
            agentIds: groupe.agents.map(a => a.id),
            binomes,
            zoneId: groupe.zoneId,
            zoneName: zone?.nom,
            ecoleId: groupe.ecoleId,
            ecoleName: ecole?.nom,
            vehicule: groupe.vehicule,
            mission: groupe.mission,
            reunion: groupe.reunion,
            commentaires: groupe.commentaires,
            planningId: planning.id,
            mois
          });
        });
      });
    });

    return entries;
  }

  /**
   * Format date to YYYY-MM for monthly storage
   */
  private formatMois(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Shuffle array in place
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
