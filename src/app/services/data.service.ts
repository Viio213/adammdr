import { Injectable, signal } from '@angular/core';
import { Agent, JourSemaine, DemiJournee } from '../models/agent.model';
import { PlanningSemaine } from '../models/planning.model';
import { HistoriqueEntry } from '../models/historique.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly STORAGE_KEY_AGENTS = 'adammdr_agents';
  private readonly STORAGE_KEY_HISTORIQUE = 'adammdr_historique';
  private readonly STORAGE_KEY_PLANNINGS = 'adammdr_plannings';

  // Signals for reactive updates
  agents = signal<Agent[]>(this.loadAgents());
  historique = signal<HistoriqueEntry[]>(this.loadHistorique());
  plannings = signal<PlanningSemaine[]>(this.loadPlannings());

  constructor() {
    // Initialize with sample data if empty
    if (this.agents().length === 0) {
      this.initializeSampleData();
    }
  }

  // Agents management
  getAgents(): Agent[] {
    return this.agents();
  }

  addAgent(agent: Agent): void {
    const agents = [...this.agents(), agent];
    this.agents.set(agents);
    this.saveAgents(agents);
  }

  updateAgent(agent: Agent): void {
    const agents = this.agents().map(a => a.id === agent.id ? agent : a);
    this.agents.set(agents);
    this.saveAgents(agents);
  }

  deleteAgent(id: string): void {
    const agents = this.agents().filter(a => a.id !== id);
    this.agents.set(agents);
    this.saveAgents(agents);
  }

  // Historique management
  getHistorique(): HistoriqueEntry[] {
    return this.historique();
  }

  addHistoriqueEntries(entries: HistoriqueEntry[]): void {
    const historique = [...this.historique(), ...entries];
    this.historique.set(historique);
    this.saveHistorique(historique);
  }

  updateHistoriqueEntry(entry: HistoriqueEntry): void {
    const historique = this.historique().map(e => e.id === entry.id ? entry : e);
    this.historique.set(historique);
    this.saveHistorique(historique);
  }

  deleteHistoriqueEntry(id: string): void {
    const historique = this.historique().filter(e => e.id !== id);
    this.historique.set(historique);
    this.saveHistorique(historique);
  }

  // Planning management
  getPlannings(): PlanningSemaine[] {
    return this.plannings();
  }

  addPlanning(planning: PlanningSemaine): void {
    const plannings = [...this.plannings(), planning];
    this.plannings.set(plannings);
    this.savePlannings(plannings);
  }

  getPlanningActuel(): PlanningSemaine | null {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    return this.plannings().find(p => {
      const debut = new Date(p.dateDebut);
      debut.setHours(0, 0, 0, 0);
      const fin = new Date(p.dateFin);
      fin.setHours(23, 59, 59, 999);
      return aujourdhui >= debut && aujourdhui <= fin;
    }) || null;
  }

  // LocalStorage persistence
  private loadAgents(): Agent[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_AGENTS);
      if (data) {
        const agents = JSON.parse(data);
        // Convert date strings back to Date objects for disponibilites if needed
        return agents;
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
    return [];
  }

  private saveAgents(agents: Agent[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_AGENTS, JSON.stringify(agents));
    } catch (error) {
      console.error('Error saving agents:', error);
    }
  }

  private loadHistorique(): HistoriqueEntry[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_HISTORIQUE);
      if (data) {
        const entries = JSON.parse(data);
        // Convert date strings back to Date objects
        return entries.map((e: HistoriqueEntry) => ({
          ...e,
          date: new Date(e.date)
        }));
      }
    } catch (error) {
      console.error('Error loading historique:', error);
    }
    return [];
  }

  private saveHistorique(historique: HistoriqueEntry[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_HISTORIQUE, JSON.stringify(historique));
    } catch (error) {
      console.error('Error saving historique:', error);
    }
  }

  private loadPlannings(): PlanningSemaine[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_PLANNINGS);
      if (data) {
        const plannings = JSON.parse(data);
        // Convert date strings back to Date objects
        return plannings.map((p: PlanningSemaine) => ({
          ...p,
          dateDebut: new Date(p.dateDebut),
          dateFin: new Date(p.dateFin),
          dateGeneration: new Date(p.dateGeneration),
          entries: p.entries.map(e => ({
            ...e,
            groupes: e.groupes.map(g => ({
              ...g,
              agents: g.agents.map(a => ({
                ...a,
                disponibilites: a.disponibilites.map(d => ({
                  ...d
                }))
              }))
            }))
          }))
        }));
      }
    } catch (error) {
      console.error('Error loading plannings:', error);
    }
    return [];
  }

  private savePlannings(plannings: PlanningSemaine[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_PLANNINGS, JSON.stringify(plannings));
    } catch (error) {
      console.error('Error saving plannings:', error);
    }
  }

  // Export/Import
  exportData(): string {
    return JSON.stringify({
      agents: this.agents(),
      historique: this.historique(),
      plannings: this.plannings(),
      exportDate: new Date().toISOString()
    }, null, 2);
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.agents) {
        this.agents.set(data.agents);
        this.saveAgents(data.agents);
      }
      if (data.historique) {
        const historique = data.historique.map((e: HistoriqueEntry) => ({
          ...e,
          date: new Date(e.date)
        }));
        this.historique.set(historique);
        this.saveHistorique(historique);
      }
      if (data.plannings) {
        const plannings = data.plannings.map((p: PlanningSemaine) => ({
          ...p,
          dateDebut: new Date(p.dateDebut),
          dateFin: new Date(p.dateFin),
          dateGeneration: new Date(p.dateGeneration)
        }));
        this.plannings.set(plannings);
        this.savePlannings(plannings);
      }
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  // Initialize sample data
  private initializeSampleData(): void {
    const sampleAgents: Agent[] = [
      {
        id: '1',
        nom: 'Agent 1',
        actif: true,
        disponibilites: this.generateDefaultDisponibilites(),
        zonesHabituelles: ['Zone A'],
        indicationsSpeciales: ''
      },
      {
        id: '2',
        nom: 'Agent 2',
        actif: true,
        disponibilites: this.generateDefaultDisponibilites(),
        zonesHabituelles: ['Zone B'],
        indicationsSpeciales: ''
      },
      {
        id: '3',
        nom: 'Agent 3',
        actif: true,
        disponibilites: this.generateDefaultDisponibilites(),
        zonesHabituelles: ['Zone C'],
        indicationsSpeciales: ''
      },
      {
        id: '4',
        nom: 'Agent 4',
        actif: true,
        disponibilites: this.generateDefaultDisponibilites(),
        zonesHabituelles: ['Zone A'],
        indicationsSpeciales: ''
      },
      {
        id: '5',
        nom: 'Agent 5',
        actif: true,
        disponibilites: this.generateDefaultDisponibilites(),
        zonesHabituelles: ['Zone B'],
        indicationsSpeciales: ''
      }
    ];

    this.agents.set(sampleAgents);
    this.saveAgents(sampleAgents);
  }

  private generateDefaultDisponibilites() {
    const disponibilites = [];
    const jours = [JourSemaine.LUNDI, JourSemaine.MARDI, JourSemaine.MERCREDI, JourSemaine.JEUDI, JourSemaine.VENDREDI];
    for (const jour of jours) {
      disponibilites.push(
        { jour, demiJournee: DemiJournee.MATIN, disponible: true },
        { jour, demiJournee: DemiJournee.APRES_MIDI, disponible: true }
      );
    }
    return disponibilites;
  }
}

