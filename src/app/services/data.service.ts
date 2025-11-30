import { Injectable, signal } from '@angular/core';
import { Agent, JourSemaine, DemiJournee, AGENTS_DEFAUT, TypeContrat } from '../models/agent.model';
import { PlanningSemaine } from '../models/planning.model';
import { HistoriqueEntry } from '../models/historique.model';
import { Conge, StatutConge } from '../models/conge.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly STORAGE_KEY_AGENTS = 'adammdr_agents';
  private readonly STORAGE_KEY_HISTORIQUE = 'adammdr_historique';
  private readonly STORAGE_KEY_PLANNINGS = 'adammdr_plannings';
  private readonly STORAGE_KEY_CONGES = 'adammdr_conges';

  // Signals for reactive updates
  agents = signal<Agent[]>(this.loadAgents());
  historique = signal<HistoriqueEntry[]>(this.loadHistorique());
  plannings = signal<PlanningSemaine[]>(this.loadPlannings());
  conges = signal<Conge[]>(this.loadConges());

  constructor() {
    // Initialize with default agents if empty
    if (this.agents().length === 0) {
      this.initializeDefaultAgents();
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
    // Remove existing planning for the same week if exists
    const existingIndex = this.plannings().findIndex(p => {
      const pDebut = new Date(p.dateDebut).toISOString().split('T')[0];
      const newDebut = new Date(planning.dateDebut).toISOString().split('T')[0];
      return pDebut === newDebut;
    });
    
    let plannings: PlanningSemaine[];
    if (existingIndex >= 0) {
      plannings = [...this.plannings()];
      plannings[existingIndex] = planning;
    } else {
      plannings = [...this.plannings(), planning];
    }
    
    this.plannings.set(plannings);
    this.savePlannings(plannings);
  }

  updatePlanning(planning: PlanningSemaine): void {
    const plannings = this.plannings().map(p => p.id === planning.id ? planning : p);
    this.plannings.set(plannings);
    this.savePlannings(plannings);
  }

  getPlanningActuel(): PlanningSemaine | null {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    // First try to find planning for current week
    const currentWeekPlanning = this.plannings().find(p => {
      const debut = new Date(p.dateDebut);
      debut.setHours(0, 0, 0, 0);
      const fin = new Date(p.dateFin);
      fin.setHours(23, 59, 59, 999);
      return aujourdhui >= debut && aujourdhui <= fin;
    });
    
    if (currentWeekPlanning) return currentWeekPlanning;
    
    // Otherwise return the most recently generated planning
    const sortedPlannings = [...this.plannings()].sort((a, b) => 
      new Date(b.dateGeneration).getTime() - new Date(a.dateGeneration).getTime()
    );
    
    return sortedPlannings[0] || null;
  }

  getPlanningByDate(dateDebut: Date): PlanningSemaine | null {
    const targetDate = new Date(dateDebut).toISOString().split('T')[0];
    return this.plannings().find(p => {
      const pDate = new Date(p.dateDebut).toISOString().split('T')[0];
      return pDate === targetDate;
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

  // Initialize default agents from AGENTS_DEFAUT
  private initializeDefaultAgents(): void {
    const agents: Agent[] = AGENTS_DEFAUT.map((agentData, index) => ({
      id: `agent-${index + 1}`,
      ...agentData
    }));

    this.agents.set(agents);
    this.saveAgents(agents);
  }

  // Conges management
  getConges(): Conge[] {
    return this.conges();
  }

  getCongesByAgent(agentId: string): Conge[] {
    return this.conges().filter(c => c.agentId === agentId);
  }

  getCongesByPeriod(dateDebut: Date, dateFin: Date): Conge[] {
    return this.conges().filter(c => {
      const debut = new Date(c.dateDebut);
      const fin = new Date(c.dateFin);
      return debut <= dateFin && fin >= dateDebut;
    });
  }

  addConge(conge: Conge): void {
    const conges = [...this.conges(), conge];
    this.conges.set(conges);
    this.saveConges(conges);
  }

  updateConge(conge: Conge): void {
    const conges = this.conges().map(c => c.id === conge.id ? conge : c);
    this.conges.set(conges);
    this.saveConges(conges);
  }

  deleteConge(id: string): void {
    const conges = this.conges().filter(c => c.id !== id);
    this.conges.set(conges);
    this.saveConges(conges);
  }

  private loadConges(): Conge[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_CONGES);
      if (data) {
        const conges = JSON.parse(data);
        return conges.map((c: Conge) => ({
          ...c,
          dateDebut: new Date(c.dateDebut),
          dateFin: new Date(c.dateFin),
          dateCreation: new Date(c.dateCreation),
          // Backward compatibility: add status if missing
          statut: c.statut || StatutConge.VALIDE,
          dateValidation: c.dateValidation ? new Date(c.dateValidation) : undefined
        }));
      }
    } catch (error) {
      console.error('Error loading conges:', error);
    }
    return [];
  }

  private saveConges(conges: Conge[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_CONGES, JSON.stringify(conges));
    } catch (error) {
      console.error('Error saving conges:', error);
    }
  }

  // Check if agent is available on a specific date/period (considering leaves)
  isAgentAvailable(agentId: string, date: Date, demiJournee: DemiJournee): boolean {
    const agent = this.agents().find(a => a.id === agentId);
    if (!agent || !agent.actif) return false;

    // Check regular availability
    const jourSemaine = this.getJourSemaine(date);
    const dispo = agent.disponibilites.find(
      d => d.jour === jourSemaine && d.demiJournee === demiJournee
    );
    if (!dispo?.disponible) return false;

    // Check validated leaves only (not pending or refused)
    const conges = this.conges().filter(c => {
      // Only consider validated leaves
      if (c.statut !== StatutConge.VALIDE) return false;
      
      const debut = new Date(c.dateDebut);
      debut.setHours(0, 0, 0, 0);
      const fin = new Date(c.dateFin);
      fin.setHours(23, 59, 59, 999);
      const checkDate = new Date(date);
      checkDate.setHours(12, 0, 0, 0);
      
      if (checkDate < debut || checkDate > fin) return false;
      if (c.agentId !== agentId) return false;
      if (c.demiJournee === 'JOURNEE') return true;
      if (c.demiJournee === demiJournee) return true;
      return false;
    });

    return conges.length === 0;
  }

  private getJourSemaine(date: Date): JourSemaine {
    const jours = [
      JourSemaine.DIMANCHE,
      JourSemaine.LUNDI,
      JourSemaine.MARDI,
      JourSemaine.MERCREDI,
      JourSemaine.JEUDI,
      JourSemaine.VENDREDI,
      JourSemaine.SAMEDI
    ];
    return jours[date.getDay()];
  }

  // Confirm planning and save to history
  confirmPlanning(planning: PlanningSemaine): void {
    planning.isConfirmed = true;
    planning.dateConfirmation = new Date();
    
    // Update planning
    const plannings = this.plannings().map(p => p.id === planning.id ? planning : p);
    this.plannings.set(plannings);
    this.savePlannings(plannings);
  }
}

