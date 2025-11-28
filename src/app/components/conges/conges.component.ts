import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { Conge, TypeConge, TYPE_CONGE_LABELS } from '../../models/conge.model';
import { Agent } from '../../models/agent.model';

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

        <!-- Filter for admin -->
        <div class="filters" *ngIf="isAdmin">
          <label>Filtrer par agent :</label>
          <select [(ngModel)]="filtreAgent" (change)="appliquerFiltre()" class="form-control filter-select">
            <option value="">Tous les agents</option>
            <option *ngFor="let agent of agents()" [value]="agent.id">{{ agent.nom }}</option>
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
                <td>{{ conge.commentaire || '-' }}</td>
                <td>
                  <button 
                    class="btn btn-secondary btn-sm" 
                    (click)="editerConge(conge)"
                    [disabled]="!canEditConge(conge)">
                    Modifier
                  </button>
                  <button 
                    class="btn btn-danger btn-sm" 
                    (click)="supprimerConge(conge.id)"
                    [disabled]="!canEditConge(conge)">
                    Supprimer
                  </button>
                </td>
              </tr>
              <tr *ngIf="congesFiltres().length === 0">
                <td colspan="7" class="text-center">
                  {{ isAdmin ? 'Aucun congé enregistré' : 'Vous n\\'avez aucun congé enregistré' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Summary -->
        <div class="conges-summary" *ngIf="!isAdmin && monAgent()">
          <h3>Mon résumé</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">Congés annuels</span>
              <span class="summary-value">{{ countCongesByType(TypeConge.CONGE_ANNUEL) }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Heures-dites</span>
              <span class="summary-value">{{ countCongesByType(TypeConge.HEURE_DITE) }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Récupérations</span>
              <span class="summary-value">{{ countCongesByType(TypeConge.RECUPERATION) }}</span>
            </div>
          </div>
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
          <!-- Agent selection (admin only) -->
          <div class="form-group" *ngIf="isAdmin">
            <label class="form-label">Agent *</label>
            <select formControlName="agentId" class="form-control">
              <option value="">Sélectionner un agent</option>
              <option *ngFor="let agent of agents()" [value]="agent.id">{{ agent.nom }}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Type de congé *</label>
            <select formControlName="type" class="form-control">
              <option [value]="TypeConge.CONGE_ANNUEL">{{ getTypeLabel(TypeConge.CONGE_ANNUEL) }}</option>
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
    }

    .filters label {
      font-weight: 600;
      color: #475569;
    }

    .filter-select {
      max-width: 250px;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
      margin: 0 2px;
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

    .badge-heure {
      background: #fef3c7;
      color: #92400e;
    }

    .badge-recup {
      background: #d1fae5;
      color: #065f46;
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
      color: #1e293b;
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

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 2px solid #e2e8f0;
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

  readonly TypeConge = TypeConge;
  
  isAdmin = this.authService.isAdmin();
  
  // Get current user's linked agent
  monAgent = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return null;
    return this.agents().find(a => a.userId === user.id) || null;
  });

  congeForm: FormGroup = this.fb.group({
    agentId: ['', this.isAdmin ? Validators.required : []],
    type: [TypeConge.CONGE_ANNUEL, Validators.required],
    dateDebut: ['', Validators.required],
    dateFin: ['', Validators.required],
    demiJournee: ['JOURNEE'],
    commentaire: ['']
  });

  constructor() {
    this.chargerDonnees();
  }

  chargerDonnees(): void {
    this.agents.set(this.dataService.getAgents());
    
    let conges = this.dataService.getConges();
    
    // Filter for non-admin users to only see their own leaves
    if (!this.isAdmin) {
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
    
    this.congesFiltres.set(filtered);
  }

  canEditConge(conge: Conge): boolean {
    if (this.isAdmin) return true;
    
    const agent = this.monAgent();
    return agent !== null && conge.agentId === agent.id;
  }

  getTypeLabel(type: TypeConge): string {
    return TYPE_CONGE_LABELS[type];
  }

  getTypeBadgeClass(type: TypeConge): string {
    switch (type) {
      case TypeConge.CONGE_ANNUEL: return 'badge-annuel';
      case TypeConge.HEURE_DITE: return 'badge-heure';
      case TypeConge.RECUPERATION: return 'badge-recup';
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

  countCongesByType(type: TypeConge): number {
    return this.conges().filter(c => c.type === type).length;
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

  sauvegarderConge(): void {
    if (!this.congeForm.valid) return;

    const formValue = this.congeForm.value;
    
    // Determine agent
    let agentId: string;
    let agentNom: string;
    
    if (this.isAdmin) {
      agentId = formValue.agentId;
      const agent = this.agents().find(a => a.id === agentId);
      agentNom = agent?.nom || '';
    } else {
      const agent = this.monAgent();
      if (!agent) return;
      agentId = agent.id;
      agentNom = agent.nom;
    }

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
      creePar: this.authService.currentUser()?.id || ''
    };

    if (this.congeEnEdition) {
      this.dataService.updateConge(conge);
    } else {
      this.dataService.addConge(conge);
    }

    this.chargerDonnees();
    this.fermerModal();
  }

  supprimerConge(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce congé ?')) {
      this.dataService.deleteConge(id);
      this.chargerDonnees();
    }
  }

  private formatDateForInput(date: Date): string {
    return new Date(date).toISOString().split('T')[0];
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

