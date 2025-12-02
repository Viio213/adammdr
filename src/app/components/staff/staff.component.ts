import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';
import { Agent, JourSemaine, DemiJournee, JOURS_SEMAINE, JOURS_TRAVAIL, TypeContrat, TYPE_CONTRAT_LABELS } from '../../models/agent.model';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <div class="card">
        <div class="card-header">
          <h2>Disponibilités des Agents</h2>
          <button class="btn btn-primary" (click)="ouvrirModalAjout()">
            Ajouter un Agent
          </button>
        </div>

        <div class="staff-list">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Type Contrat</th>
                <th>Statut</th>
                <th>Indications</th>
                <th>Disponibilités</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let agent of agents()">
                <td><strong>{{ agent.nom }}</strong></td>
                <td>
                  <span class="badge badge-info">{{ getTypeContratLabel(agent.typeContrat) }}</span>
                </td>
                <td>
                  <span [class]="'badge ' + (agent.actif ? 'badge-success' : 'badge-danger')">
                    {{ agent.actif ? 'Actif' : 'Inactif' }}
                  </span>
                </td>
                <td>{{ agent.indicationsSpeciales || '-' }}</td>
                <td>
                  <button class="btn btn-secondary btn-sm" (click)="voirDisponibilites(agent)">
                    Voir
                  </button>
                </td>
                <td>
                  <button class="btn btn-secondary btn-sm" (click)="editerAgent(agent)">
                    Modifier
                  </button>
                  <button class="btn btn-danger btn-sm" (click)="supprimerAgent(agent.id)">
                    Supprimer
                  </button>
                </td>
              </tr>
              <tr *ngIf="agents().length === 0">
                <td colspan="6" class="text-center">Aucun agent enregistré</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Ajout/Édition Agent -->
    <div class="modal" *ngIf="afficherModal" (click)="fermerModal($event)">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ agentEnEdition ? 'Modifier' : 'Ajouter' }} un Agent</h3>
          <button class="btn-close" (click)="fermerModal()">×</button>
        </div>
        <form [formGroup]="agentForm" (ngSubmit)="sauvegarderAgent()">
          <div class="form-group">
            <label class="form-label">Nom / Initiales *</label>
            <input type="text" formControlName="nom" class="form-control" placeholder="Ex: AA, BL, SC..." />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Type de contrat</label>
              <select formControlName="typeContrat" class="form-control">
                <option [value]="TypeContrat.TEMPS_PLEIN">Temps plein</option>
                <option [value]="TypeContrat.MI_TEMPS">Mi-temps</option>
                <option [value]="TypeContrat.TEMPS_PARTIEL">Temps partiel</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Statut</label>
              <select formControlName="actif" class="form-control">
                <option [ngValue]="true">Actif</option>
                <option [ngValue]="false">Inactif</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Indications Spéciales</label>
            <textarea formControlName="indicationsSpeciales" class="form-control" rows="2"
                      placeholder="Ex: Pas dispo mercredi AM, mi-temps..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Disponibilités</label>
            <div class="disponibilites-grid">
              <div *ngFor="let jour of JOURS_TRAVAIL" class="jour-dispo">
                <strong>{{ jour }}</strong>
                <div class="checkbox-group">
                  <label class="checkbox-item">
                    <input type="checkbox" 
                           [checked]="isDisponible(jour, DemiJournee.MATIN)"
                           (change)="toggleDisponibilite(jour, DemiJournee.MATIN, $event)" />
                    Matin
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" 
                           [checked]="isDisponible(jour, DemiJournee.APRES_MIDI)"
                           (change)="toggleDisponibilite(jour, DemiJournee.APRES_MIDI, $event)" />
                    Après-midi
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" (click)="fermerModal()">
              Annuler
            </button>
            <button type="submit" class="btn btn-primary" [disabled]="!agentForm.valid">
              {{ agentEnEdition ? 'Modifier' : 'Ajouter' }}
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
    
    .btn-sm {
      padding: 8px 16px;
      font-size: 13px;
      margin: 0 2px;
    }
    
    .text-center {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
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
      animation: fadeIn 0.2s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .modal-content {
      background: white;
      border-radius: 16px;
      max-width: 700px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      animation: slideUp 0.3s ease;
    }
    
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
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
    
    .disponibilites-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }
    
    .jour-dispo {
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    
    .jour-dispo strong {
      display: block;
      margin-bottom: 8px;
      color: #1e293b;
      font-size: 13px;
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
export class StaffComponent {
  private dataService = inject(DataService);
  private fb = inject(FormBuilder);

  private notification = inject(NotificationService);
  
  // Use computed to reactively get agents from DataService
  agents = computed(() => this.dataService.agents());
  afficherModal = false;
  agentEnEdition: Agent | null = null;
  disponibilitesTemporaires: Map<string, boolean> = new Map();

  readonly JOURS_SEMAINE = JOURS_SEMAINE;
  readonly JOURS_TRAVAIL = JOURS_TRAVAIL;
  readonly DemiJournee = DemiJournee;
  readonly TypeContrat = TypeContrat;

  agentForm: FormGroup = this.fb.group({
    nom: ['', Validators.required],
    typeContrat: [TypeContrat.TEMPS_PLEIN],
    indicationsSpeciales: [''],
    actif: [true]
  });

  constructor() {
    // No need to manually load, computed signal will react to changes
  }

  getTypeContratLabel(type: TypeContrat): string {
    return TYPE_CONTRAT_LABELS[type] || type;
  }

  ouvrirModalAjout(): void {
    this.agentEnEdition = null;
    this.disponibilitesTemporaires.clear();
    // Set all days as available by default
    for (const jour of JOURS_TRAVAIL) {
      this.disponibilitesTemporaires.set(`${jour}-${DemiJournee.MATIN}`, true);
      this.disponibilitesTemporaires.set(`${jour}-${DemiJournee.APRES_MIDI}`, true);
    }
    this.agentForm.reset({ 
      actif: true,
      typeContrat: TypeContrat.TEMPS_PLEIN
    });
    this.afficherModal = true;
  }

  editerAgent(agent: Agent): void {
    this.agentEnEdition = agent;
    this.disponibilitesTemporaires.clear();
    
    // Load disponibilites into map
    agent.disponibilites.forEach(d => {
      const key = `${d.jour}-${d.demiJournee}`;
      this.disponibilitesTemporaires.set(key, d.disponible);
    });

    this.agentForm.patchValue({
      nom: agent.nom,
      typeContrat: agent.typeContrat,
      indicationsSpeciales: agent.indicationsSpeciales || '',
      actif: agent.actif
    });
    
    this.afficherModal = true;
  }

  fermerModal(event?: Event): void {
    if (!event || (event.target as HTMLElement).classList.contains('modal')) {
      this.afficherModal = false;
      this.agentEnEdition = null;
      this.disponibilitesTemporaires.clear();
      this.agentForm.reset();
    }
  }

  async sauvegarderAgent(): Promise<void> {
    if (!this.agentForm.valid) return;

    const formValue = this.agentForm.value;
    
    // Check for duplicate agent name (only for new agents)
    if (!this.agentEnEdition) {
      const existingAgent = this.agents().find(
        a => a.nom.toLowerCase() === formValue.nom.toLowerCase()
      );
      
      if (existingAgent) {
        const confirmed = await this.notification.confirm({
          title: 'Agent existant',
          message: `Un agent avec le nom "${formValue.nom}" existe déjà. Voulez-vous quand même créer cet agent ?`,
          confirmText: 'Créer quand même',
          cancelText: 'Annuler',
          type: 'warning'
        });
        
        if (!confirmed) return;
      }
    }
    
    const disponibilites = JOURS_TRAVAIL.flatMap(jour => [
      {
        jour,
        demiJournee: DemiJournee.MATIN,
        disponible: this.isDisponible(jour, DemiJournee.MATIN)
      },
      {
        jour,
        demiJournee: DemiJournee.APRES_MIDI,
        disponible: this.isDisponible(jour, DemiJournee.APRES_MIDI)
      }
    ]);

    const agent: Agent = {
      id: this.agentEnEdition?.id || this.generateId(),
      nom: formValue.nom,
      typeContrat: formValue.typeContrat,
      indicationsSpeciales: formValue.indicationsSpeciales || '',
      actif: formValue.actif,
      disponibilites
    };

    if (this.agentEnEdition) {
      await this.dataService.updateAgent(agent);
    } else {
      await this.dataService.addAgent(agent);
    }

    // No need to manually reload, computed signal will update automatically
    this.fermerModal();
  }

  async supprimerAgent(id: string): Promise<void> {
    const confirmed = await this.notification.confirm({
      title: 'Supprimer l\'agent',
      message: 'Êtes-vous sûr de vouloir supprimer cet agent ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      type: 'danger'
    });
    
    if (confirmed) {
      await this.dataService.deleteAgent(id);
    }
  }

  isDisponible(jour: JourSemaine, demiJournee: DemiJournee): boolean {
    const key = `${jour}-${demiJournee}`;
    if (this.disponibilitesTemporaires.has(key)) {
      return this.disponibilitesTemporaires.get(key)!;
    }
    if (this.agentEnEdition) {
      const dispo = this.agentEnEdition.disponibilites.find(
        d => d.jour === jour && d.demiJournee === demiJournee
      );
      return dispo?.disponible ?? false;
    }
    return true; // Default to available for new agents
  }

  toggleDisponibilite(jour: JourSemaine, demiJournee: DemiJournee, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const key = `${jour}-${demiJournee}`;
    this.disponibilitesTemporaires.set(key, checked);
  }

  voirDisponibilites(agent: Agent): void {
    const dispoText = agent.disponibilites
      .filter(d => d.disponible)
      .map(d => `${d.jour} ${d.demiJournee === 'MATIN' ? 'Matin' : 'AM'}`)
      .join('\n');
    
    await this.notification.alert({
      title: `Disponibilités de ${agent.nom}`,
      message: dispoText || 'Aucune disponibilité configurée',
      type: 'info'
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
