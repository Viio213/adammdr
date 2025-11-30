import { Injectable, inject } from '@angular/core';
import { Agent, JourSemaine, DemiJournee, JOURS_TRAVAIL } from '../models/agent.model';
import { Groupe, PlanningEntry, PlanningJour, PlanningSemaine } from '../models/planning.model';
import { HistoriqueEntry } from '../models/historique.model';
import { ZONES, Zone, getZonesByPriority } from '../models/zone.model';
import { DataService } from './data.service';
import { StatistiquesService } from './statistiques.service';

@Injectable({
  providedIn: 'root'
})
export class PlanningGeneratorService {
  private dataService = inject(DataService);
  private statistiquesService = inject(StatistiquesService);

  /**
   * Generate a full weekly planning
   */
  generatePlanningSemaine(dateDebut: Date): PlanningSemaine {
    const dateFin = new Date(dateDebut);
    dateFin.setDate(dateFin.getDate() + 4); // Monday to Friday

    const jours: PlanningJour[] = [];

    for (let i = 0; i < 5; i++) {
      const jour = JOURS_TRAVAIL[i];
      const date = new Date(dateDebut);
      date.setDate(date.getDate() + i);

      const planningJour = this.generatePlanningJour(jour, date);
      jours.push(planningJour);
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
   * Generate planning for a single day
   */
  generatePlanningJour(jour: JourSemaine, date: Date): PlanningJour {
    const historique = this.dataService.getHistorique();

    // Generate morning
    const matin = this.generateDemiJournee(jour, date, DemiJournee.MATIN, historique, []);

    // Generate afternoon (must avoid same pairs as morning)
    const apresMidi = this.generateDemiJournee(jour, date, DemiJournee.APRES_MIDI, historique, [matin]);

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

    const newPlanningJour = this.generatePlanningJour(jour, date);

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
   */
  private generateDemiJournee(
    jour: JourSemaine,
    date: Date,
    demiJournee: DemiJournee,
    historique: HistoriqueEntry[],
    entriesMemeJour: PlanningEntry[]
  ): PlanningEntry {
    // Get available agents for this half-day (considering leaves)
    const allAgents = this.dataService.getAgents().filter(a => a.actif);
    const agentsDisponibles = allAgents.filter(agent =>
      this.dataService.isAgentAvailable(agent.id, date, demiJournee)
    );

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
    const zonesDisponibles = getZonesByPriority();

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
        exterieurStats
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
   * Select agents for a group with rebalancing based on exterior zone statistics
   * For exterior zones (Z1, Z4): prioritize agents with LOWER exterior percentage
   * This ensures fair rotation of exterior assignments
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
    exterieurStats: { agentId: string; pourcentageExterieur: number }[]
  ): Agent[] {
    // Filter agents who weren't in the same zone in the morning
    let candidats = agentsDisponibles.filter(a => {
      const zoneMatin = zonesMatin.get(a.id);
      return !zoneMatin || zoneMatin !== zone.id;
    });

    // If not enough candidates, use all available
    if (candidats.length < taille) {
      candidats = [...agentsDisponibles];
    }

    // For exterior zones (Z1, Z4), sort by exterior percentage (lowest first for rebalancing)
    if (zone.isExterieur) {
      candidats = this.sortAgentsByExterieurPriority(candidats, exterieurStats);
    } else {
      // For interior zones, slightly randomize but still consider balance
      this.shuffleArray(candidats);
    }

    const selected: Agent[] = [];

    for (const agent of candidats) {
      if (selected.length >= taille) break;

      // Check if this agent would form a forbidden pair with any selected agent
      const formesPaireMatin = selected.some(a => 
        this.pairExisteDansPeriode(a, agent, entriesMemeJour, DemiJournee.MATIN)
      );

      if (!formesPaireMatin) {
        // Check frequency in history
        const tropFrequent = selected.some(a => 
          this.pairTropFrequent(a, agent, historique)
        );

        if (!tropFrequent || selected.length === 0) {
          selected.push(agent);
        }
      }
    }

    // If we couldn't find enough without violations, just take the first available
    if (selected.length < 2) {
      return candidats.slice(0, Math.min(taille, candidats.length));
    }

    return selected;
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
