import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  // ============================================
  // USERS
  // ============================================
  async getUsers() {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .order('nom');
    
    if (error) throw error;
    return data || [];
  }

  async getUserByUsername(username: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async createUser(user: any) {
    const { data, error } = await this.supabase
      .from('users')
      .insert([this.mapUserToDb(user)])
      .select()
      .single();
    
    if (error) throw error;
    return this.mapUserFromDb(data);
  }

  async updateUser(id: string, user: any) {
    const { data, error } = await this.supabase
      .from('users')
      .update(this.mapUserToDb(user))
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return this.mapUserFromDb(data);
  }

  async deleteUser(id: string) {
    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // ============================================
  // AGENTS
  // ============================================
  async getAgents() {
    // Get agents
    const { data: agentsData, error: agentsError } = await this.supabase
      .from('agents')
      .select('*')
      .order('nom');
    
    if (agentsError) throw agentsError;

    // Get all disponibilites
    const { data: disposData, error: disposError } = await this.supabase
      .from('disponibilites')
      .select('*');
    
    if (disposError) {
      console.warn('Could not load disponibilites:', disposError);
    }

    // Map and combine
    return (agentsData || []).map(a => {
      const agentDispos = (disposData || []).filter(d => d.agent_id === a.id);
      return this.mapAgentFromDb({ ...a, disponibilites: agentDispos });
    });
  }

  async createAgent(agent: any) {
    // Insert agent first
    const { data: agentData, error: agentError } = await this.supabase
      .from('agents')
      .insert([{
        nom: agent.nom,
        nom_complet: agent.nomComplet,
        type_contrat: agent.typeContrat,
        indications_speciales: agent.indicationsSpeciales,
        actif: agent.actif ?? true,
        user_id: agent.userId
      }])
      .select()
      .single();
    
    if (agentError) throw agentError;

    // Insert disponibilites
    if (agent.disponibilites && agent.disponibilites.length > 0) {
      const dispos = agent.disponibilites.map((d: any) => ({
        agent_id: agentData.id,
        jour: d.jour,
        demi_journee: d.demiJournee,
        disponible: d.disponible
      }));

      const { error: dispoError } = await this.supabase
        .from('disponibilites')
        .insert(dispos);
      
      if (dispoError) throw dispoError;
    }

    return { ...agent, id: agentData.id };
  }

  async updateAgent(agent: any) {
    const { error: agentError } = await this.supabase
      .from('agents')
      .update({
        nom: agent.nom,
        nom_complet: agent.nomComplet,
        type_contrat: agent.typeContrat,
        indications_speciales: agent.indicationsSpeciales,
        actif: agent.actif,
        user_id: agent.userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', agent.id);
    
    if (agentError) throw agentError;

    // Update disponibilites - delete and recreate
    if (agent.disponibilites) {
      await this.supabase
        .from('disponibilites')
        .delete()
        .eq('agent_id', agent.id);

      const dispos = agent.disponibilites.map((d: any) => ({
        agent_id: agent.id,
        jour: d.jour,
        demi_journee: d.demiJournee,
        disponible: d.disponible
      }));

      const { error: dispoError } = await this.supabase
        .from('disponibilites')
        .insert(dispos);
      
      if (dispoError) throw dispoError;
    }

    return agent;
  }

  async deleteAgent(id: string) {
    const { error } = await this.supabase
      .from('agents')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // ============================================
  // PLANNINGS
  // ============================================
  async getPlannings() {
    const { data, error } = await this.supabase
      .from('plannings')
      .select('*')
      .order('date_debut', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(p => this.mapPlanningFromDb(p));
  }

  async createPlanning(planning: any) {
    const { data, error } = await this.supabase
      .from('plannings')
      .insert([this.mapPlanningToDb(planning)])
      .select()
      .single();
    
    if (error) throw error;
    return this.mapPlanningFromDb(data);
  }

  async updatePlanning(planning: any) {
    const { data, error } = await this.supabase
      .from('plannings')
      .update(this.mapPlanningToDb(planning))
      .eq('id', planning.id)
      .select()
      .single();
    
    if (error) throw error;
    return this.mapPlanningFromDb(data);
  }

  async deletePlanning(id: string) {
    const { error } = await this.supabase
      .from('plannings')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // ============================================
  // HISTORIQUE
  // ============================================
  async getHistorique() {
    const { data, error } = await this.supabase
      .from('historique')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(h => this.mapHistoriqueFromDb(h));
  }

  async createHistoriqueEntries(entries: any[]) {
    const dbEntries = entries.map(e => this.mapHistoriqueToDb(e));
    
    const { data, error } = await this.supabase
      .from('historique')
      .insert(dbEntries)
      .select();
    
    if (error) throw error;
    return (data || []).map(h => this.mapHistoriqueFromDb(h));
  }

  async updateHistorique(entry: any) {
    const { data, error } = await this.supabase
      .from('historique')
      .update(this.mapHistoriqueToDb(entry))
      .eq('id', entry.id)
      .select()
      .single();
    
    if (error) throw error;
    return this.mapHistoriqueFromDb(data);
  }

  async deleteHistorique(id: string) {
    const { error } = await this.supabase
      .from('historique')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // ============================================
  // CONGES
  // ============================================
  async getConges() {
    const { data, error } = await this.supabase
      .from('conges')
      .select('*')
      .order('date_debut', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(c => this.mapCongeFromDb(c));
  }

  async createConge(conge: any) {
    const { data, error } = await this.supabase
      .from('conges')
      .insert([this.mapCongeToDb(conge)])
      .select()
      .single();
    
    if (error) throw error;
    return this.mapCongeFromDb(data);
  }

  async updateConge(conge: any) {
    const { data, error } = await this.supabase
      .from('conges')
      .update(this.mapCongeToDb(conge))
      .eq('id', conge.id)
      .select()
      .single();
    
    if (error) throw error;
    return this.mapCongeFromDb(data);
  }

  async deleteConge(id: string) {
    const { error } = await this.supabase
      .from('conges')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // ============================================
  // MAPPERS - DB to App
  // ============================================
  private mapUserFromDb(data: any): any {
    if (!data) return null;
    return {
      id: data.id,
      username: data.username,
      password: data.password,
      nom: data.nom,
      prenom: data.prenom,
      role: data.role,
      actif: data.actif,
      agentId: data.agent_id,
      dateCreation: data.date_creation ? new Date(data.date_creation) : new Date(),
      derniereConnexion: data.derniere_connexion ? new Date(data.derniere_connexion) : undefined
    };
  }

  private mapUserToDb(user: any): any {
    return {
      username: user.username,
      password: user.password,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      actif: user.actif,
      agent_id: user.agentId,
      derniere_connexion: user.derniereConnexion?.toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private mapAgentFromDb(data: any): any {
    if (!data) return null;
    return {
      id: data.id,
      nom: data.nom,
      nomComplet: data.nom_complet,
      typeContrat: data.type_contrat,
      indicationsSpeciales: data.indications_speciales,
      actif: data.actif,
      userId: data.user_id,
      disponibilites: (data.disponibilites || []).map((d: any) => ({
        jour: d.jour,
        demiJournee: d.demi_journee,
        disponible: d.disponible
      }))
    };
  }

  private mapPlanningFromDb(data: any): any {
    if (!data) return null;
    const planningData = data.data || {};
    return {
      id: data.id,
      dateDebut: new Date(data.date_debut),
      dateFin: new Date(data.date_fin),
      dateGeneration: new Date(data.date_generation),
      isConfirmed: data.is_confirmed,
      dateConfirmation: data.date_confirmation ? new Date(data.date_confirmation) : undefined,
      jours: planningData.jours || [],
      entries: planningData.entries || []
    };
  }

  private mapPlanningToDb(planning: any): any {
    return {
      id: planning.id,
      date_debut: planning.dateDebut instanceof Date 
        ? planning.dateDebut.toISOString().split('T')[0]
        : planning.dateDebut,
      date_fin: planning.dateFin instanceof Date
        ? planning.dateFin.toISOString().split('T')[0]
        : planning.dateFin,
      date_generation: planning.dateGeneration?.toISOString() || new Date().toISOString(),
      is_confirmed: planning.isConfirmed || false,
      date_confirmation: planning.dateConfirmation?.toISOString(),
      data: {
        jours: planning.jours,
        entries: planning.entries
      },
      updated_at: new Date().toISOString()
    };
  }

  private mapHistoriqueFromDb(data: any): any {
    if (!data) return null;
    return {
      id: data.id,
      date: new Date(data.date),
      jour: data.jour,
      demiJournee: data.demi_journee,
      agentIds: data.agent_ids || [],
      binomes: data.binomes,
      zoneId: data.zone_id,
      zoneName: data.zone_name,
      ecoleId: data.ecole_id,
      ecoleName: data.ecole_name,
      vehicule: data.vehicule,
      mission: data.mission,
      reunion: data.reunion,
      commentaires: data.commentaires,
      planningId: data.planning_id,
      mois: data.mois
    };
  }

  private mapHistoriqueToDb(entry: any): any {
    return {
      id: entry.id,
      date: entry.date instanceof Date
        ? entry.date.toISOString().split('T')[0]
        : entry.date,
      jour: entry.jour,
      demi_journee: entry.demiJournee,
      agent_ids: entry.agentIds || [],
      binomes: entry.binomes,
      zone_id: entry.zoneId,
      zone_name: entry.zoneName,
      ecole_id: entry.ecoleId,
      ecole_name: entry.ecoleName,
      vehicule: entry.vehicule || false,
      mission: entry.mission,
      reunion: entry.reunion || false,
      commentaires: entry.commentaires,
      planning_id: entry.planningId,
      mois: entry.mois
    };
  }

  private mapCongeFromDb(data: any): any {
    if (!data) return null;
    return {
      id: data.id,
      agentId: data.agent_id,
      agentNom: data.agent_nom,
      type: data.type,
      dateDebut: new Date(data.date_debut),
      dateFin: new Date(data.date_fin),
      demiJournee: data.demi_journee,
      commentaire: data.commentaire,
      statut: data.statut,
      dateCreation: new Date(data.date_creation),
      creePar: data.cree_par,
      dateValidation: data.date_validation ? new Date(data.date_validation) : undefined,
      validePar: data.valide_par
    };
  }

  private mapCongeToDb(conge: any): any {
    return {
      id: conge.id,
      agent_id: conge.agentId,
      agent_nom: conge.agentNom,
      type: conge.type,
      date_debut: conge.dateDebut instanceof Date
        ? conge.dateDebut.toISOString().split('T')[0]
        : conge.dateDebut,
      date_fin: conge.dateFin instanceof Date
        ? conge.dateFin.toISOString().split('T')[0]
        : conge.dateFin,
      demi_journee: conge.demiJournee,
      commentaire: conge.commentaire,
      statut: conge.statut,
      cree_par: conge.creePar,
      date_validation: conge.dateValidation?.toISOString(),
      valide_par: conge.validePar,
      updated_at: new Date().toISOString()
    };
  }
}

