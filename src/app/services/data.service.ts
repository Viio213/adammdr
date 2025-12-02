import { Injectable, inject, signal } from '@angular/core';
import { Agent, JourSemaine, DemiJournee, AGENTS_DEFAUT, TypeContrat } from '../models/agent.model';
import { PlanningSemaine } from '../models/planning.model';
import { HistoriqueEntry } from '../models/historique.model';
import { Conge, StatutConge } from '../models/conge.model';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private supabase = inject(SupabaseService);
  
  // Signals for reactive updates
  agents = signal<Agent[]>([]);
  historique = signal<HistoriqueEntry[]>([]);
  plannings = signal<PlanningSemaine[]>([]);
  conges = signal<Conge[]>([]);

  // Loading states
  isLoading = signal<boolean>(true);
  private initialized = false;
  private lastPlanningId: string | null = null;

  constructor() {
    this.initializeData();
  }

  /**
   * Initialize data from Supabase
   */
  async initializeData(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.isLoading.set(true);
      
      // Load all data in parallel
      const [agents, plannings, historique, conges] = await Promise.all([
        this.supabase.getAgents(),
        this.supabase.getPlannings(),
        this.supabase.getHistorique(),
        this.supabase.getConges()
      ]);

      this.agents.set(agents);
      this.plannings.set(plannings);
      this.historique.set(historique);
      this.conges.set(conges);

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing data from Supabase:', error);
      // Fallback: try localStorage if Supabase fails
      this.loadFromLocalStorage();
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Fallback to localStorage if Supabase fails
   */
  private loadFromLocalStorage(): void {
    try {
      const agentsData = localStorage.getItem('adammdr_agents');
      if (agentsData) {
        this.agents.set(JSON.parse(agentsData));
      }
      
      const planningsData = localStorage.getItem('adammdr_plannings');
      if (planningsData) {
        const plannings = JSON.parse(planningsData).map((p: any) => ({
          ...p,
          dateDebut: new Date(p.dateDebut),
          dateFin: new Date(p.dateFin),
          dateGeneration: new Date(p.dateGeneration)
        }));
        this.plannings.set(plannings);
      }
      
      const historiqueData = localStorage.getItem('adammdr_historique');
      if (historiqueData) {
        const historique = JSON.parse(historiqueData).map((h: any) => ({
          ...h,
          date: new Date(h.date)
        }));
        this.historique.set(historique);
      }
      
      const congesData = localStorage.getItem('adammdr_conges');
      if (congesData) {
        const conges = JSON.parse(congesData).map((c: any) => ({
          ...c,
          dateDebut: new Date(c.dateDebut),
          dateFin: new Date(c.dateFin),
          dateCreation: new Date(c.dateCreation)
        }));
        this.conges.set(conges);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }

  /**
   * Refresh all data from Supabase
   */
  async refreshData(): Promise<void> {
    this.initialized = false;
    await this.initializeData();
  }

  // ============================================
  // AGENTS
  // ============================================
  getAgents(): Agent[] {
    return this.agents();
  }

  /**
   * Refresh agents from Supabase database
   */
  async refreshAgents(): Promise<Agent[]> {
    try {
      const agents = await this.supabase.getAgents();
      this.agents.set(agents);
      return agents;
    } catch (error) {
      console.error('Error refreshing agents from Supabase:', error);
      return this.agents();
    }
  }

  async addAgent(agent: Agent): Promise<void> {
    try {
      const newAgent = await this.supabase.createAgent(agent);
      this.agents.set([...this.agents(), newAgent]);
    } catch (error) {
      console.error('Error adding agent:', error);
      // Fallback to local
      this.agents.set([...this.agents(), agent]);
    }
  }

  async updateAgent(agent: Agent): Promise<void> {
    try {
      await this.supabase.updateAgent(agent);
      const agents = this.agents().map(a => a.id === agent.id ? agent : a);
      this.agents.set(agents);
    } catch (error) {
      console.error('Error updating agent:', error);
      const agents = this.agents().map(a => a.id === agent.id ? agent : a);
      this.agents.set(agents);
    }
  }

  async deleteAgent(id: string): Promise<void> {
    try {
      await this.supabase.deleteAgent(id);
      const agents = this.agents().filter(a => a.id !== id);
      this.agents.set(agents);
    } catch (error) {
      console.error('Error deleting agent:', error);
      const agents = this.agents().filter(a => a.id !== id);
      this.agents.set(agents);
    }
  }

  // ============================================
  // PLANNINGS
  // ============================================
  getPlannings(): PlanningSemaine[] {
    return this.plannings();
  }

  async addPlanning(planning: PlanningSemaine): Promise<PlanningSemaine> {
    try {
      // Remove existing planning for the same week if exists
      const existingIndex = this.plannings().findIndex(p => {
        const pDebut = new Date(p.dateDebut).toISOString().split('T')[0];
        const newDebut = new Date(planning.dateDebut).toISOString().split('T')[0];
        return pDebut === newDebut;
      });
      
      if (existingIndex >= 0) {
        const existingPlanning = this.plannings()[existingIndex];
        await this.supabase.deletePlanning(existingPlanning.id);
        // Remove from local array
        const planningsWithoutOld = this.plannings().filter(p => p.id !== existingPlanning.id);
        this.plannings.set(planningsWithoutOld);
      }

      const newPlanning = await this.supabase.createPlanning(planning);
      
      // Add new planning to array
      const plannings = [...this.plannings(), newPlanning];
      this.plannings.set(plannings);
      this.lastPlanningId = newPlanning.id;
      
      return newPlanning;
    } catch (error) {
      console.error('Error adding planning:', error);
      // Fallback to local: remove existing and add new
      const existingIndex = this.plannings().findIndex(p => {
        const pDebut = new Date(p.dateDebut).toISOString().split('T')[0];
        const newDebut = new Date(planning.dateDebut).toISOString().split('T')[0];
        return pDebut === newDebut;
      });
      
      let plannings: PlanningSemaine[];
      if (existingIndex >= 0) {
        plannings = this.plannings().filter((_, index) => index !== existingIndex);
        plannings.push(planning);
      } else {
        plannings = [...this.plannings(), planning];
      }
      
      this.plannings.set(plannings);
      this.lastPlanningId = planning.id;
      
      return planning;
    }
  }

  async updatePlanning(planning: PlanningSemaine): Promise<void> {
    try {
      await this.supabase.updatePlanning(planning);
      const plannings = this.plannings().map(p => p.id === planning.id ? planning : p);
      this.plannings.set(plannings);
      this.lastPlanningId = planning.id;
    } catch (error) {
      console.error('Error updating planning:', error);
      const plannings = this.plannings().map(p => p.id === planning.id ? planning : p);
      this.plannings.set(plannings);
      this.lastPlanningId = planning.id;
    }
  }

  getPlanningActuel(): PlanningSemaine | null {
    // First, try to get the last viewed planning by ID
    if (this.lastPlanningId) {
      const lastPlanning = this.plannings().find(p => p.id === this.lastPlanningId);
      if (lastPlanning) return lastPlanning;
    }
    
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    // Then try to find planning for current week
    const currentWeekPlanning = this.plannings().find(p => {
      const debut = new Date(p.dateDebut);
      debut.setHours(0, 0, 0, 0);
      const fin = new Date(p.dateFin);
      fin.setHours(23, 59, 59, 999);
      return aujourdhui >= debut && aujourdhui <= fin;
    });
    
    if (currentWeekPlanning) {
      this.lastPlanningId = currentWeekPlanning.id;
      return currentWeekPlanning;
    }
    
    // Otherwise return the most recently generated planning
    const sortedPlannings = [...this.plannings()].sort((a, b) => 
      new Date(b.dateGeneration).getTime() - new Date(a.dateGeneration).getTime()
    );
    
    const mostRecent = sortedPlannings[0] || null;
    if (mostRecent) {
      this.lastPlanningId = mostRecent.id;
    }
    return mostRecent;
  }

  getPlanningByDate(dateDebut: Date): PlanningSemaine | null {
    const targetDate = new Date(dateDebut).toISOString().split('T')[0];
    return this.plannings().find(p => {
      const pDate = new Date(p.dateDebut).toISOString().split('T')[0];
      return pDate === targetDate;
    }) || null;
  }

  async confirmPlanning(planning: PlanningSemaine): Promise<void> {
    const confirmedPlanning = {
      ...planning,
      isConfirmed: true,
      dateConfirmation: new Date()
    };
    await this.updatePlanning(confirmedPlanning);
  }

  // ============================================
  // HISTORIQUE
  // ============================================
  getHistorique(): HistoriqueEntry[] {
    return this.historique();
  }

  async addHistoriqueEntries(entries: HistoriqueEntry[]): Promise<void> {
    try {
      const newEntries = await this.supabase.createHistoriqueEntries(entries);
      this.historique.set([...this.historique(), ...newEntries]);
    } catch (error) {
      console.error('Error adding historique entries:', error);
      this.historique.set([...this.historique(), ...entries]);
    }
  }

  async updateHistoriqueEntry(entry: HistoriqueEntry): Promise<void> {
    try {
      await this.supabase.updateHistorique(entry);
      const historique = this.historique().map(h => h.id === entry.id ? entry : h);
      this.historique.set(historique);
    } catch (error) {
      console.error('Error updating historique:', error);
      const historique = this.historique().map(h => h.id === entry.id ? entry : h);
      this.historique.set(historique);
    }
  }

  async deleteHistoriqueEntry(id: string): Promise<void> {
    try {
      await this.supabase.deleteHistorique(id);
      const historique = this.historique().filter(h => h.id !== id);
      this.historique.set(historique);
    } catch (error) {
      console.error('Error deleting historique:', error);
      const historique = this.historique().filter(h => h.id !== id);
      this.historique.set(historique);
    }
  }

  // ============================================
  // CONGES
  // ============================================
  getConges(): Conge[] {
    return this.conges();
  }

  /**
   * Refresh conges from Supabase database
   */
  async refreshConges(): Promise<Conge[]> {
    try {
      const conges = await this.supabase.getConges();
      this.conges.set(conges);
      return conges;
    } catch (error) {
      console.error('Error refreshing conges from Supabase:', error);
      return this.conges();
    }
  }

  async addConge(conge: Conge): Promise<void> {
    try {
      const newConge = await this.supabase.createConge(conge);
      this.conges.set([...this.conges(), newConge]);
    } catch (error) {
      console.error('Error adding conge:', error);
      this.conges.set([...this.conges(), conge]);
    }
  }

  async updateConge(conge: Conge): Promise<void> {
    try {
      await this.supabase.updateConge(conge);
      const conges = this.conges().map(c => c.id === conge.id ? conge : c);
      this.conges.set(conges);
    } catch (error) {
      console.error('Error updating conge:', error);
      const conges = this.conges().map(c => c.id === conge.id ? conge : c);
      this.conges.set(conges);
    }
  }

  async deleteConge(id: string): Promise<void> {
    try {
      await this.supabase.deleteConge(id);
      const conges = this.conges().filter(c => c.id !== id);
      this.conges.set(conges);
    } catch (error) {
      console.error('Error deleting conge:', error);
      const conges = this.conges().filter(c => c.id !== id);
      this.conges.set(conges);
    }
  }

  async validerConge(conge: Conge, validePar: string): Promise<void> {
    const updatedConge: Conge = {
      ...conge,
      statut: StatutConge.VALIDE,
      dateValidation: new Date(),
      validePar
    };
    await this.updateConge(updatedConge);
  }

  async refuserConge(conge: Conge, validePar: string): Promise<void> {
    const updatedConge: Conge = {
      ...conge,
      statut: StatutConge.REFUSE,
      dateValidation: new Date(),
      validePar
    };
    await this.updateConge(updatedConge);
  }

  // ============================================
  // AVAILABILITY CHECK
  // ============================================
  isAgentAvailable(agentId: string, date: Date, demiJournee: DemiJournee): boolean {
    const agent = this.agents().find(a => a.id === agentId);
    if (!agent || !agent.actif) return false;

    // Check disponibilites
    const jourSemaine = this.getJourSemaine(date);
    const dispo = agent.disponibilites?.find(
      d => d.jour === jourSemaine && d.demiJournee === demiJournee
    );
    if (dispo && !dispo.disponible) return false;

    // Check conges
    const congesAgent = this.conges().filter(c => 
      c.agentId === agentId && 
      c.statut === StatutConge.VALIDE
    );

    for (const conge of congesAgent) {
      const dateDebut = new Date(conge.dateDebut);
      const dateFin = new Date(conge.dateFin);
      dateDebut.setHours(0, 0, 0, 0);
      dateFin.setHours(23, 59, 59, 999);
      
      const checkDate = new Date(date);
      checkDate.setHours(12, 0, 0, 0);

      if (checkDate >= dateDebut && checkDate <= dateFin) {
        // Check demi-journee if specified
        if (conge.demiJournee === 'JOURNEE') {
          return false;
        } else if (conge.demiJournee === 'MATIN' && demiJournee === DemiJournee.MATIN) {
          return false;
        } else if (conge.demiJournee === 'APRES_MIDI' && demiJournee === DemiJournee.APRES_MIDI) {
          return false;
        }
      }
    }

    return true;
  }

  private getJourSemaine(date: Date): JourSemaine {
    const jours: JourSemaine[] = [
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

  // ============================================
  // EXPORT/IMPORT
  // ============================================
  exportData(): string {
    return JSON.stringify({
      agents: this.agents(),
      historique: this.historique(),
      plannings: this.plannings(),
      conges: this.conges(),
      exportDate: new Date().toISOString()
    }, null, 2);
  }

  async importData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);
      
      // This would need to be implemented with Supabase bulk inserts
      // For now, just update the signals
      if (data.agents) {
        this.agents.set(data.agents);
      }
      if (data.historique) {
        const historique = data.historique.map((h: any) => ({
          ...h,
          date: new Date(h.date)
        }));
        this.historique.set(historique);
      }
      if (data.plannings) {
        const plannings = data.plannings.map((p: any) => ({
          ...p,
          dateDebut: new Date(p.dateDebut),
          dateFin: new Date(p.dateFin),
          dateGeneration: new Date(p.dateGeneration)
        }));
        this.plannings.set(plannings);
      }
      if (data.conges) {
        const conges = data.conges.map((c: any) => ({
          ...c,
          dateDebut: new Date(c.dateDebut),
          dateFin: new Date(c.dateFin),
          dateCreation: new Date(c.dateCreation)
        }));
        this.conges.set(conges);
      }
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  // ============================================
  // RESET DATABASE
  // ============================================
  /**
   * Reset database: delete historique, conges (stats are calculated from historique)
   */
  async resetDatabase(): Promise<{ success: boolean; message: string }> {
    try {
      // Delete all historique entries
      const historique = this.historique();
      for (const entry of historique) {
        await this.supabase.deleteHistorique(entry.id);
      }
      this.historique.set([]);

      // Delete all conges
      const conges = this.conges();
      for (const conge of conges) {
        await this.supabase.deleteConge(conge.id);
      }
      this.conges.set([]);

      return { success: true, message: 'Base de données réinitialisée avec succès' };
    } catch (error) {
      console.error('Error resetting database:', error);
      return { success: false, message: 'Erreur lors de la réinitialisation' };
    }
  }
}
