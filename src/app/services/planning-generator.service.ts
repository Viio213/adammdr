import { Injectable, inject } from '@angular/core';
import { Agent, JourSemaine, DemiJournee, JOURS_SEMAINE } from '../models/agent.model';
import { Groupe, PlanningEntry, PlanningSemaine } from '../models/planning.model';
import { HistoriqueEntry } from '../models/historique.model';
import { DataService } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class PlanningGeneratorService {
  private dataService = inject(DataService);

  // Available zones for random assignment
  private readonly ZONES = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4'];

  /**
   * Generate a weekly planning respecting all constraints
   */
  generatePlanningSemaine(dateDebut: Date): PlanningSemaine {
    const agents = this.dataService.getAgents().filter(a => a.actif);
    const historique = this.dataService.getHistorique();
    
    const dateFin = new Date(dateDebut);
    dateFin.setDate(dateFin.getDate() + 6); // End of week (7 days)

    const entries: PlanningEntry[] = [];

    // Generate planning for each day of the week
    for (let i = 0; i < 7; i++) {
      const jour = JOURS_SEMAINE[i];

      // Generate morning planning
      const matin = this.generateDemiJournee(
        agents,
        jour,
        DemiJournee.MATIN,
        historique,
        [] // No entries yet for this day
      );
      entries.push(matin);

      // Generate afternoon planning (avoid same pairs as morning)
      const apresMidi = this.generateDemiJournee(
        agents,
        jour,
        DemiJournee.APRES_MIDI,
        historique,
        [matin] // Avoid same pairs as morning
      );
      entries.push(apresMidi);
    }

    return {
      id: this.generateId(),
      dateDebut,
      dateFin,
      entries,
      dateGeneration: new Date()
    };
  }

  /**
   * Generate planning for a half-day respecting all constraints
   */
  private generateDemiJournee(
    agents: Agent[],
    jour: JourSemaine,
    demiJournee: DemiJournee,
    historique: HistoriqueEntry[],
    entriesMemeJour: PlanningEntry[]
  ): PlanningEntry {
    // Get available agents for this half-day
    const agentsDisponibles = agents.filter(agent => 
      this.isAgentDisponible(agent, jour, demiJournee)
    );

    if (agentsDisponibles.length < 2) {
      // Not enough agents, return empty groups
      return {
        jour,
        demiJournee,
        groupes: []
      };
    }

    const groupes: Groupe[] = [];
    const agentsUtilises = new Set<string>();
    let trinomeCree = false;

    // Create groups
    while (agentsUtilises.size < agentsDisponibles.length) {
      const agentsRestants = agentsDisponibles.filter(a => !agentsUtilises.has(a.id));

      if (agentsRestants.length === 0) break;

      // Determine group size
      let tailleGroupe: number;
      if (!trinomeCree && agentsRestants.length >= 3 && agentsUtilises.size === 0) {
        // Create one trinôme if possible and not already created
        tailleGroupe = 3;
        trinomeCree = true;
      } else {
        // Create binômes
        tailleGroupe = 2;
      }

      // If not enough agents for a binôme, stop
      if (agentsRestants.length < 2) break;

      // Select agents for the group
      const agentsGroupe = this.selectAgentsPourGroupe(
        agentsRestants,
        tailleGroupe,
        jour,
        demiJournee,
        historique,
        entriesMemeJour,
        groupes
      );

      if (agentsGroupe.length >= 2) {
        agentsGroupe.forEach(a => agentsUtilises.add(a.id));
        groupes.push({
          id: this.generateId(),
          agents: agentsGroupe,
          zone: this.getRandomZone(groupes)
        });
      } else {
        break;
      }
    }

    return {
      jour,
      demiJournee,
      groupes
    };
  }

  /**
   * Select agents for a group avoiding repetitions
   */
  private selectAgentsPourGroupe(
    agentsDisponibles: Agent[],
    taille: number,
    jour: JourSemaine,
    demiJournee: DemiJournee,
    historique: HistoriqueEntry[],
    entriesMemeJour: PlanningEntry[],
    groupesDejaCrees: Groupe[]
  ): Agent[] {
    // Shuffle available agents
    const agentsShuffled = [...agentsDisponibles].sort(() => Math.random() - 0.5);

    // Try to find a combination that avoids repetitions
    for (let i = 0; i < agentsShuffled.length; i++) {
      const candidats: Agent[] = [agentsShuffled[i]];

      for (let j = i + 1; j < agentsShuffled.length && candidats.length < taille; j++) {
        const candidat = agentsShuffled[j];
        
        // Check if this pair already exists today (morning/afternoon)
        const existeAujourdhui = this.pairExisteAujourdhui(
          candidats[0],
          candidat,
          entriesMemeJour
        );

        // Check if this pair is too frequent in history
        const tropFrequent = this.pairTropFrequent(
          candidats[0],
          candidat,
          historique
        );

        if (!existeAujourdhui && !tropFrequent) {
          candidats.push(candidat);
        }
      }

      if (candidats.length >= 2) {
        // If we need 3 but only have 2, try to add a third
        if (taille === 3 && candidats.length === 2) {
          for (let k = 0; k < agentsShuffled.length; k++) {
            const agent3 = agentsShuffled[k];
            if (!candidats.includes(agent3)) {
              const pair1Existe = this.pairExisteAujourdhui(candidats[0], agent3, entriesMemeJour);
              const pair2Existe = this.pairExisteAujourdhui(candidats[1], agent3, entriesMemeJour);
              
              if (!pair1Existe && !pair2Existe) {
                candidats.push(agent3);
                break;
              }
            }
          }
        }

        return candidats;
      }
    }

    // If no good combination found, return first available agents
    return agentsShuffled.slice(0, Math.min(taille, agentsShuffled.length));
  }

  /**
   * Check if agent is available for a specific day and half-day
   */
  private isAgentDisponible(agent: Agent, jour: JourSemaine, demiJournee: DemiJournee): boolean {
    const disponibilite = agent.disponibilites.find(
      d => d.jour === jour && d.demiJournee === demiJournee
    );
    return disponibilite?.disponible ?? false;
  }

  /**
   * Check if a pair already exists in today's entries
   */
  private pairExisteAujourdhui(
    agent1: Agent,
    agent2: Agent,
    entries: PlanningEntry[]
  ): boolean {
    return entries.some(entry =>
      entry.groupes.some(groupe =>
        groupe.agents.includes(agent1) && groupe.agents.includes(agent2)
      )
    );
  }

  /**
   * Check if a pair is too frequent in history (more than 3 times in last 4 weeks)
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
        const binomes = h.binomes.split(',').map(b => b.trim());
        return binomes.includes(agent1.nom) && binomes.includes(agent2.nom);
      }).length;

    return occurrences >= 3;
  }

  /**
   * Convert date to day of week
   */
  private getJourSemaine(date: Date): JourSemaine {
    const jours = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
    return jours[date.getDay()] as JourSemaine;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get a random zone, trying to avoid already assigned zones in the same half-day
   */
  private getRandomZone(existingGroupes: Groupe[]): string {
    const usedZones = existingGroupes.map(g => g.zone).filter(Boolean);
    const availableZones = this.ZONES.filter(z => !usedZones.includes(z));
    
    // If all zones are used, pick any random zone
    const zonesToPick = availableZones.length > 0 ? availableZones : this.ZONES;
    
    return zonesToPick[Math.floor(Math.random() * zonesToPick.length)];
  }

  /**
   * Convert planning to historique entries
   */
  planningToHistorique(planning: PlanningSemaine): HistoriqueEntry[] {
    const entries: HistoriqueEntry[] = [];

    planning.entries.forEach(entry => {
      entry.groupes.forEach(groupe => {
        const binomes = groupe.agents.map(a => a.nom).join(', ');
        entries.push({
          id: this.generateId(),
          date: this.getDateForJour(planning.dateDebut, entry.jour),
          jour: entry.jour,
          demiJournee: entry.demiJournee,
          binomes,
          zone: groupe.zone,
          mission: groupe.mission,
          reunion: groupe.reunion,
          commentaires: groupe.commentaires,
          planningId: planning.id
        });
      });
    });

    return entries;
  }

  /**
   * Get date for a specific day of week in the planning week
   * Assumes dateDebut is a Monday (start of week)
   */
  private getDateForJour(dateDebut: Date, jour: JourSemaine): Date {
    // Get index of target day in JOURS_SEMAINE (LUNDI = 0, MARDI = 1, etc.)
    const indexJour = JOURS_SEMAINE.indexOf(jour);
    
    // Calculate date by adding days from Monday
    const date = new Date(dateDebut);
    date.setDate(date.getDate() + indexJour);
    return date;
  }
}

