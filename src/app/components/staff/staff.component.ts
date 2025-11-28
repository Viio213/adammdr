import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Agent, JourSemaine, DemiJournee, JOURS_SEMAINE } from '../../models/agent.model';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <div class="card">
        <div class="card-header">
          <h2>Gestion du Staff</h2>
          <button class="btn btn-primary" (click)="ouvrirModalAjout()">
            Ajouter un Agent
          </button>
        </div>

        <div class="staff-list">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Statut</th>
                <th>Zones Habituelles</th>
                <th>Indications Spéciales</th>
                <th>Disponibilités</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let agent of agents()">
                <td><strong>{{ agent.nom }}</strong></td>
                <td>
                  <span [class]="'badge ' + (agent.actif ? 'badge-success' : 'badge-danger')">
                    {{ agent.actif ? 'Actif' : 'Inactif' }}
                  </span>
                </td>
                <td>{{ agent.zonesHabituelles?.join(', ') || '-' }}</td>
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
            <label class="form-label">Nom *</label>
            <input type="text" formControlName="nom" class="form-control" />
          </div>

          <div class="form-group">
            <label class="form-label">Zones Habituelles (séparées par des virgules)</label>
            <input type="text" formControlName="zonesHabituelles" class="form-control" 
                   placeholder="Zone A, Zone B, Zone C" />
          </div>

          <div class="form-group">
            <label class="form-label">Indications Spéciales</label>
            <textarea formControlName="indicationsSpeciales" class="form-control" rows="3"
                      placeholder="Mi-temps, congés, absences, etc."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Statut</label>
            <select formControlName="actif" class="form-control">
              <option [value]="true">Actif</option>
              <option [value]="false">Inactif</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Disponibilités</label>
            <div class="disponibilites-grid">
              <div *ngFor="let jour of JOURS_SEMAINE" class="jour-dispo">
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
      margin-bottom: 24px;
    }
    
    .btn-sm {
      padding: 6px 12px;
      font-size: 14px;
      margin: 0 4px;
    }
    
    .text-center {
      text-align: center;
      padding: 20px;
      color: #999;
    }
    
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 20px;
    }
    
    .modal-content {
      background: white;
      border-radius: 12px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .modal-header h3 {
      margin: 0;
    }
    
    .btn-close {
      background: none;
      border: none;
      font-size: 32px;
      cursor: pointer;
      color: #999;
      line-height: 1;
      padding: 0;
      width: 32px;
      height: 32px;
    }
    
    .modal-content form {
      padding: 20px;
    }
    
    .disponibilites-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 12px;
    }
    
    .jour-dispo {
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    
    .jour-dispo strong {
      display: block;
      margin-bottom: 8px;
      color: #555;
    }
    
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }
  `]
})
export class StaffComponent {
  private dataService = inject(DataService);
  private fb = inject(FormBuilder);

  agents = signal<Agent[]>([]);
  afficherModal = false;
  agentEnEdition: Agent | null = null;
  disponibilitesTemporaires: Map<string, boolean> = new Map();

  readonly JOURS_SEMAINE = JOURS_SEMAINE;
  readonly DemiJournee = DemiJournee;

  agentForm: FormGroup = this.fb.group({
    nom: ['', Validators.required],
    zonesHabituelles: [''],
    indicationsSpeciales: [''],
    actif: [true]
  });

  constructor() {
    this.chargerAgents();
  }

  chargerAgents(): void {
    this.agents.set(this.dataService.getAgents());
  }

  ouvrirModalAjout(): void {
    this.agentEnEdition = null;
    this.disponibilitesTemporaires.clear();
    this.agentForm.reset({ actif: true });
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
      zonesHabituelles: agent.zonesHabituelles?.join(', ') || '',
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

  sauvegarderAgent(): void {
    if (!this.agentForm.valid) return;

    const formValue = this.agentForm.value;
    const disponibilites = JOURS_SEMAINE.flatMap(jour => [
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
      zonesHabituelles: formValue.zonesHabituelles
        ? formValue.zonesHabituelles.split(',').map((z: string) => z.trim()).filter((z: string) => z)
        : [],
      indicationsSpeciales: formValue.indicationsSpeciales || '',
      actif: formValue.actif,
      disponibilites
    };

    if (this.agentEnEdition) {
      this.dataService.updateAgent(agent);
    } else {
      this.dataService.addAgent(agent);
    }

    this.chargerAgents();
    this.fermerModal();
  }

  supprimerAgent(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet agent ?')) {
      this.dataService.deleteAgent(id);
      this.chargerAgents();
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
    return false;
  }

  toggleDisponibilite(jour: JourSemaine, demiJournee: DemiJournee, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const key = `${jour}-${demiJournee}`;
    this.disponibilitesTemporaires.set(key, checked);
  }

  voirDisponibilites(agent: Agent): void {
    // Simple alert for now, could be enhanced with a modal
    const dispoText = agent.disponibilites
      .filter(d => d.disponible)
      .map(d => `${d.jour} ${d.demiJournee}`)
      .join('\n');
    alert(`Disponibilités de ${agent.nom}:\n\n${dispoText || 'Aucune disponibilité'}`);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

