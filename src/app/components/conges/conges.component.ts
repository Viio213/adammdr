import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { Conge, TypeConge, TYPE_CONGE_LABELS, StatutConge, STATUT_CONGE_LABELS } from '../../models/conge.model';
import { Agent, JourSemaine, DemiJournee } from '../../models/agent.model';

@Component({
  selector: 'app-conges',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <div class="card">
        <div class="card-header">
          <h2>Gestion des Congés</h2>
          <button class="btn btn-primary" (click)="ouvrirModalAjout()">
            Ajouter un Congé
          </button>
        </div>

        <!-- Filters -->
        <div class="filters">
          <label *ngIf="canViewAllConges">Filtrer par agent :</label>
          <select *ngIf="canViewAllConges" [(ngModel)]="filtreAgent" (change)="appliquerFiltre()" class="form-control filter-select">
            <option value="">Tous les agents</option>
            <option *ngFor="let agent of agents()" [value]="agent.id">{{ agent.nom }}</option>
          </select>
          <label>Statut :</label>
          <select [(ngModel)]="filtreStatut" (change)="appliquerFiltre()" class="form-control filter-select">
            <option value="">Tous</option>
            <option [value]="StatutConge.EN_ATTENTE">En traitement</option>
            <option [value]="StatutConge.VALIDE">Validé</option>
            <option [value]="StatutConge.REFUSE">Refusé</option>
          </select>
          <label>Période :</label>
          <select [(ngModel)]="filtrePeriode" (change)="appliquerFiltre()" class="form-control filter-select">
            <option value="">Tous</option>
            <option value="passes">Congés passés</option>
            <option value="avenir">Congés à venir</option>
          </select>
        </div>

        <div class="conges-list">
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Type</th>
                <th>Date début</th>
                <th>Date fin</th>
                <th>Période</th>
                <th>Statut</th>
                <th>Commentaire</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let conge of congesFiltres()">
                <td><strong>{{ conge.agentNom }}</strong></td>
                <td>
                  <span [class]="'badge ' + getTypeBadgeClass(conge.type)">
                    {{ getTypeLabel(conge.type) }}
                  </span>
                </td>
                <td>{{ formatDate(conge.dateDebut) }}</td>
                <td>{{ formatDate(conge.dateFin) }}</td>
                <td>{{ getPeriodeLabel(conge.demiJournee) }}</td>
                <td>
                  <span [class]="'badge ' + getStatutBadgeClass(conge.statut)">
                    {{ getStatutLabel(conge.statut) }}
                  </span>
                </td>
                <td>{{ conge.commentaire || '-' }}</td>
                <td class="actions-cell">
                  <!-- Validation buttons for chef/admin -->
                  <ng-container *ngIf="canValidateConge && conge.statut === StatutConge.EN_ATTENTE">
                    <button 
                      class="btn btn-success btn-sm" 
                      (click)="validerConge(conge)"
                      title="Valider la demande">
                      ✓ Valider
                    </button>
                    <button 
                      class="btn btn-danger btn-sm" 
                      (click)="refuserConge(conge)"
                      title="Refuser la demande">
                      ✗ Refuser
                    </button>
                  </ng-container>
                  <!-- Edit/Delete for own requests or admin -->
                  <ng-container *ngIf="canEditConge(conge)">
                    <button 
                      class="btn btn-secondary btn-sm" 
                      (click)="editerConge(conge)"
                      [disabled]="conge.statut === StatutConge.VALIDE">
                      Modifier
                    </button>
                    <button 
                      class="btn btn-danger btn-sm" 
                      (click)="supprimerConge(conge.id)">
                      Supprimer
                    </button>
                  </ng-container>
                </td>
              </tr>
              <tr *ngIf="congesFiltres().length === 0">
                <td colspan="8" class="text-center">
                  {{ canViewAllConges ? 'Aucun congé enregistré' : 'Vous n\\'avez aucun congé enregistré' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Summary -->
        <div class="conges-summary" *ngIf="!canViewAllConges && monAgent()">
          <h3>Mon résumé</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">En attente</span>
              <span class="summary-value pending">{{ countCongesByStatut(StatutConge.EN_ATTENTE) }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Validés</span>
              <span class="summary-value validated">{{ countCongesByStatut(StatutConge.VALIDE) }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Refusés</span>
              <span class="summary-value refused">{{ countCongesByStatut(StatutConge.REFUSE) }}</span>
            </div>
          </div>
        </div>

        <!-- Pending requests alert for chef/admin -->
        <div class="pending-alert" *ngIf="canValidateConge && pendingCount() > 0">
          <span class="pending-icon">⏳</span>
          <strong>{{ pendingCount() }} demande(s) en attente de validation</strong>
        </div>
      </div>
    </div>

    <!-- Modal Ajout/Édition Congé -->
    <div class="modal" *ngIf="afficherModal" (click)="fermerModal($event)">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ congeEnEdition ? 'Modifier' : 'Ajouter' }} un Congé</h3>
          <button class="btn-close" (click)="fermerModal()">×</button>
        </div>
        <form [formGroup]="congeForm" (ngSubmit)="sauvegarderConge()">
          <!-- Agent selection -->
          <div class="form-group">
            <label class="form-label">Agent *</label>
            <select formControlName="agentId" class="form-control" [attr.disabled]="!canViewAllConges && monAgent() ? true : null">
              <option value="">Sélectionner un agent</option>
              <option *ngFor="let agent of agentsSelectionnables()" [value]="agent.id">{{ agent.nom }}</option>
            </select>
            <small *ngIf="!canViewAllConges && monAgent()" class="form-hint">
              Vous ne pouvez demander un congé que pour vous-même
            </small>
          </div>

          <div class="form-group">
            <label class="form-label">Type de congé *</label>
            <select formControlName="type" class="form-control">
              <option [value]="TypeConge.CONGE_ANNUEL">{{ getTypeLabel(TypeConge.CONGE_ANNUEL) }}</option>
              <option [value]="TypeConge.CONGE_MALADIE">{{ getTypeLabel(TypeConge.CONGE_MALADIE) }}</option>
              <option [value]="TypeConge.HEURE_DITE">{{ getTypeLabel(TypeConge.HEURE_DITE) }}</option>
              <option [value]="TypeConge.RECUPERATION">{{ getTypeLabel(TypeConge.RECUPERATION) }}</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date début *</label>
              <input type="date" formControlName="dateDebut" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Date fin *</label>
              <input type="date" formControlName="dateFin" class="form-control" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Période</label>
            <select formControlName="demiJournee" class="form-control">
              <option value="JOURNEE">Journée complète</option>
              <option value="MATIN">Matin uniquement</option>
              <option value="APRES_MIDI">Après-midi uniquement</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Commentaire</label>
            <textarea formControlName="commentaire" class="form-control" rows="2"></textarea>
          </div>

          <!-- Warning if less than 4 agents available -->
          <div class="alert-warning-form" *ngIf="afficherAlerteAgents()">
            <div class="alert-icon">⚠️</div>
            <div class="alert-content">
              <strong>Attention :</strong> Cette demande de congé entraînera moins de 4 agents disponibles certains jours :
              <ul class="alert-days">
                <li *ngFor="let jour of joursAlerte()">
                  {{ formatDate(jour.date) }} : {{ jour.nombreAgents }} agent(s) disponible(s)
                </li>
              </ul>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" (click)="fermerModal()">
              Annuler
            </button>
            <button type="submit" class="btn btn-primary" [disabled]="!congeForm.valid">
              {{ congeEnEdition ? 'Modifier' : 'Ajouter' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0;
      padding-bottom: 24px;
      border-bottom: 2px solid #e2e8f0;
    }

    .card-header h2 {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .filters {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 24px 0;
      padding: 16px;
      background: #f8fafc;
      border-radius: 10px;
      flex-wrap: wrap;
    }

    .filters label {
      font-weight: 600;
      color: #475569;
    }

    .filter-select {
      max-width: 200px;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
      margin: 0 2px;
    }

    .actions-cell {
      white-space: nowrap;
    }

    .text-center {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
    }

    .badge-annuel {
      background: #dbeafe;
      color: #1e40af;
    }

    .badge-maladie {
      background: #fee2e2;
      color: #991b1b;
    }

    .badge-heure {
      background: #fef3c7;
      color: #92400e;
    }

    .badge-recup {
      background: #d1fae5;
      color: #065f46;
    }

    .badge-pending {
      background: #fef3c7;
      color: #92400e;
      animation: pulse 2s infinite;
    }

    .badge-validated {
      background: #d1fae5;
      color: #065f46;
    }

    .badge-refused {
      background: #fee2e2;
      color: #991b1b;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .conges-summary {
      margin-top: 32px;
      padding: 24px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }

    .conges-summary h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      color: #1e293b;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
    }

    .summary-item {
      background: white;
      padding: 16px;
      border-radius: 10px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }

    .summary-label {
      display: block;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 8px;
    }

    .summary-value {
      font-size: 24px;
      font-weight: 700;
    }

    .summary-value.pending {
      color: #f59e0b;
    }

    .summary-value.validated {
      color: #10b981;
    }

    .summary-value.refused {
      color: #ef4444;
    }

    .pending-alert {
      margin-top: 24px;
      padding: 16px 20px;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-radius: 10px;
      border-left: 4px solid #f59e0b;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .pending-icon {
      font-size: 24px;
    }

    .pending-alert strong {
      color: #92400e;
    }

    .modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 2px solid #e2e8f0;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
    }

    .btn-close {
      background: #f1f5f9;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #64748b;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-content form {
      padding: 24px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
      color: #475569;
      font-size: 14px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 2px solid #e2e8f0;
    }

    .alert-warning-form {
      margin: 16px 0;
      padding: 14px 16px;
      background: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      border-left: 4px solid #f59e0b;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .alert-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .alert-content {
      flex: 1;
      font-size: 13px;
      color: #92400e;
    }

    .alert-content strong {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
    }

    .alert-days {
      margin: 8px 0 0 0;
      padding-left: 20px;
    }

    .alert-days li {
      margin-bottom: 4px;
    }
  `]
})
export class CongesComponent {
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  conges = signal<Conge[]>([]);
  congesFiltres = signal<Conge[]>([]);
  agents = signal<Agent[]>([]);
  
  afficherModal = false;
  congeEnEdition: Conge | null = null;
  filtreAgent = '';
  filtreStatut = '';
  filtrePeriode = '';

  readonly TypeConge = TypeConge;
  readonly StatutConge = StatutConge;
  
  // Permissions
  canViewAllConges = this.authService.hasPermission('canViewStaff');
  canValidateConge = this.authService.hasPermission('canValidateConge');
  
  // Get current user's linked agent
  monAgent = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return null;
    
    // Check if user has agentId set
    if (user.agentId) {
      const agentById = this.agents().find(a => a.id === user.agentId);
      if (agentById) return agentById;
    }
    
    // Fallback: check if an agent has this user's ID
    return this.agents().find(a => a.userId === user.id) || null;
  });

  // Agents available for selection in dropdown
  // Admin/Chef: all agents | Agent: only their own
  agentsSelectionnables = computed(() => {
    if (this.canViewAllConges) {
      return this.agents();
    }
    const agent = this.monAgent();
    return agent ? [agent] : [];
  });

  // Count pending requests
  pendingCount = computed(() => {
    return this.conges().filter(c => c.statut === StatutConge.EN_ATTENTE).length;
  });

  congeForm: FormGroup = this.fb.group({
    agentId: ['', Validators.required],
    type: [TypeConge.CONGE_ANNUEL, Validators.required],
    dateDebut: ['', Validators.required],
    dateFin: ['', Validators.required],
    demiJournee: ['JOURNEE'],
    commentaire: ['']
  });

  constructor() {
    this.chargerDonnees();
  }

  async chargerDonnees(): Promise<void> {
    // Load agents and conges from Supabase database
    const agents = await this.dataService.refreshAgents();
    this.agents.set(agents);
    
    let conges = await this.dataService.refreshConges();
    
    // Filter for users to only see their own leaves
    if (!this.canViewAllConges) {
      const agent = this.monAgent();
      if (agent) {
        conges = conges.filter(c => c.agentId === agent.id);
      } else {
        conges = [];
      }
    }
    
    // Sort by date
    conges.sort((a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime());
    
    this.conges.set(conges);
    this.congesFiltres.set(conges);
  }

  appliquerFiltre(): void {
    let filtered = [...this.conges()];
    
    if (this.filtreAgent) {
      filtered = filtered.filter(c => c.agentId === this.filtreAgent);
    }
    
    if (this.filtreStatut) {
      filtered = filtered.filter(c => c.statut === this.filtreStatut);
    }
    
    if (this.filtrePeriode) {
      const aujourdhui = new Date();
      aujourdhui.setHours(0, 0, 0, 0);
      
      if (this.filtrePeriode === 'passes') {
        // Congés passés : dateFin < aujourd'hui
        filtered = filtered.filter(c => {
          const dateFin = new Date(c.dateFin);
          dateFin.setHours(0, 0, 0, 0);
          return dateFin < aujourdhui;
        });
      } else if (this.filtrePeriode === 'avenir') {
        // Congés à venir : dateDebut >= aujourd'hui
        filtered = filtered.filter(c => {
          const dateDebut = new Date(c.dateDebut);
          dateDebut.setHours(0, 0, 0, 0);
          return dateDebut >= aujourdhui;
        });
      }
    }
    
    this.congesFiltres.set(filtered);
  }

  canEditConge(conge: Conge): boolean {
    if (this.authService.isAdmin()) return true;
    
    const agent = this.monAgent();
    return agent !== null && conge.agentId === agent.id;
  }

  async validerConge(conge: Conge): Promise<void> {
    if (confirm('Valider cette demande de congé ?')) {
      const updatedConge: Conge = {
        ...conge,
        statut: StatutConge.VALIDE,
        dateValidation: new Date(),
        validePar: this.authService.currentUser()?.id
      };
      await this.dataService.updateConge(updatedConge);
      this.chargerDonnees();
    }
  }

  async refuserConge(conge: Conge): Promise<void> {
    if (confirm('Refuser cette demande de congé ?')) {
      const updatedConge: Conge = {
        ...conge,
        statut: StatutConge.REFUSE,
        dateValidation: new Date(),
        validePar: this.authService.currentUser()?.id
      };
      await this.dataService.updateConge(updatedConge);
      this.chargerDonnees();
    }
  }

  getTypeLabel(type: TypeConge): string {
    return TYPE_CONGE_LABELS[type];
  }

  getTypeBadgeClass(type: TypeConge): string {
    switch (type) {
      case TypeConge.CONGE_ANNUEL: return 'badge-annuel';
      case TypeConge.CONGE_MALADIE: return 'badge-maladie';
      case TypeConge.HEURE_DITE: return 'badge-heure';
      case TypeConge.RECUPERATION: return 'badge-recup';
      default: return '';
    }
  }

  getStatutLabel(statut: StatutConge): string {
    return STATUT_CONGE_LABELS[statut] || 'Inconnu';
  }

  getStatutBadgeClass(statut: StatutConge): string {
    switch (statut) {
      case StatutConge.EN_ATTENTE: return 'badge-pending';
      case StatutConge.VALIDE: return 'badge-validated';
      case StatutConge.REFUSE: return 'badge-refused';
      default: return '';
    }
  }

  getPeriodeLabel(periode?: string): string {
    switch (periode) {
      case 'MATIN': return 'Matin';
      case 'APRES_MIDI': return 'Après-midi';
      default: return 'Journée';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }

  countCongesByStatut(statut: StatutConge): number {
    return this.conges().filter(c => c.statut === statut).length;
  }

  ouvrirModalAjout(): void {
    this.congeEnEdition = null;
    
    // Pre-fill agent for non-admin users
    const agent = this.monAgent();
    this.congeForm.reset({
      agentId: agent?.id || '',
      type: TypeConge.CONGE_ANNUEL,
      demiJournee: 'JOURNEE'
    });
    
    this.afficherModal = true;
  }

  editerConge(conge: Conge): void {
    this.congeEnEdition = conge;
    this.congeForm.patchValue({
      agentId: conge.agentId,
      type: conge.type,
      dateDebut: this.formatDateForInput(conge.dateDebut),
      dateFin: this.formatDateForInput(conge.dateFin),
      demiJournee: conge.demiJournee || 'JOURNEE',
      commentaire: conge.commentaire || ''
    });
    this.afficherModal = true;
  }

  fermerModal(event?: Event): void {
    if (!event || (event.target as HTMLElement).classList.contains('modal')) {
      this.afficherModal = false;
      this.congeEnEdition = null;
      this.congeForm.reset();
    }
  }

  async sauvegarderConge(): Promise<void> {
    if (!this.congeForm.valid) return;

    const formValue = this.congeForm.value;
    
    // Get agent from form
    const agentId = formValue.agentId;
    const agent = this.agents().find(a => a.id === agentId);
    if (!agent) return;
    const agentNom = agent.nom;

    // Determine initial status
    // If admin/chef creates the leave, it's auto-validated
    // If agent creates it, it's pending
    const isAutoValidated = this.canValidateConge;

    const conge: Conge = {
      id: this.congeEnEdition?.id || this.generateId(),
      agentId,
      agentNom,
      type: formValue.type,
      dateDebut: new Date(formValue.dateDebut),
      dateFin: new Date(formValue.dateFin),
      demiJournee: formValue.demiJournee,
      commentaire: formValue.commentaire,
      dateCreation: this.congeEnEdition?.dateCreation || new Date(),
      creePar: this.authService.currentUser()?.id || '',
      statut: this.congeEnEdition?.statut || (isAutoValidated ? StatutConge.VALIDE : StatutConge.EN_ATTENTE),
      dateValidation: isAutoValidated ? new Date() : undefined,
      validePar: isAutoValidated ? this.authService.currentUser()?.id : undefined
    };

    if (this.congeEnEdition) {
      await this.dataService.updateConge(conge);
    } else {
      await this.dataService.addConge(conge);
    }

    this.chargerDonnees();
    this.fermerModal();
  }

  async supprimerConge(id: string): Promise<void> {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce congé ?')) {
      await this.dataService.deleteConge(id);
      this.chargerDonnees();
    }
  }

  private formatDateForInput(date: Date): string {
    return new Date(date).toISOString().split('T')[0];
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  // Check if the leave request would result in less than 4 agents available
  afficherAlerteAgents(): boolean {
    const formValue = this.congeForm.value;
    if (!formValue.dateDebut || !formValue.dateFin || !formValue.agentId) {
      return false;
    }

    const joursAlerte = this.calculerJoursAlerte(
      new Date(formValue.dateDebut),
      new Date(formValue.dateFin),
      formValue.agentId,
      formValue.demiJournee || 'JOURNEE'
    );

    return joursAlerte.length > 0;
  }

  joursAlerte(): { date: Date; nombreAgents: number }[] {
    const formValue = this.congeForm.value;
    if (!formValue.dateDebut || !formValue.dateFin || !formValue.agentId) {
      return [];
    }

    return this.calculerJoursAlerte(
      new Date(formValue.dateDebut),
      new Date(formValue.dateFin),
      formValue.agentId,
      formValue.demiJournee || 'JOURNEE'
    );
  }

  private calculerJoursAlerte(
    dateDebut: Date,
    dateFin: Date,
    agentId: string,
    demiJournee: string
  ): { date: Date; nombreAgents: number }[] {
    const joursAlerte: { date: Date; nombreAgents: number }[] = [];
    const agents = this.agents();
    const conges = this.conges().filter(c => c.statut === StatutConge.VALIDE); // Only validated leaves
    const agent = agents.find(a => a.id === agentId);
    
    if (!agent) return joursAlerte;

    // Iterate through each day in the leave period
    const currentDate = new Date(dateDebut);
    while (currentDate <= dateFin) {
      // Skip weekends
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const jourSemaine = this.getJourSemaine(currentDate);
      let nombreAgentsDisponibles = 0;

      // Count available agents for this day
      for (const a of agents) {
        if (!a.actif) continue;
        if (a.id === agentId) continue; // Exclude the agent requesting leave

        // Check if agent is available on this day
        const disponibiliteMatin = a.disponibilites.find(
          d => d.jour === jourSemaine && d.demiJournee === DemiJournee.MATIN && d.disponible
        );
        const disponibiliteApresMidi = a.disponibilites.find(
          d => d.jour === jourSemaine && d.demiJournee === DemiJournee.APRES_MIDI && d.disponible
        );

        if (!disponibiliteMatin && !disponibiliteApresMidi) continue;

        // Check if agent is on leave
        const conge = conges.find(c => {
          const debut = new Date(c.dateDebut);
          debut.setHours(0, 0, 0, 0);
          const fin = new Date(c.dateFin);
          fin.setHours(23, 59, 59, 999);
          const checkDate = new Date(currentDate);
          checkDate.setHours(12, 0, 0, 0);

          if (checkDate < debut || checkDate > fin) return false;
          if (c.agentId !== a.id) return false;
          
          if (c.demiJournee === 'JOURNEE') return true;
          if (c.demiJournee === 'MATIN' && disponibiliteMatin) return true;
          if (c.demiJournee === 'APRES_MIDI' && disponibiliteApresMidi) return true;
          
          return false;
        });

        if (!conge) {
          nombreAgentsDisponibles++;
        }
      }

      // If less than 4 agents available, add to alert list
      if (nombreAgentsDisponibles < 4) {
        joursAlerte.push({
          date: new Date(currentDate),
          nombreAgents: nombreAgentsDisponibles
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return joursAlerte;
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
}
