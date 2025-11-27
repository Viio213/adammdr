import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { HistoriqueEntry } from '../../models/historique.model';

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="card">
        <div class="card-header">
          <h2>📚 Historique des Plannings</h2>
          <div class="header-actions">
            <input 
              type="date" 
              [(ngModel)]="dateDebut" 
              class="form-control date-input"
              placeholder="Date début"
            />
            <input 
              type="date" 
              [(ngModel)]="dateFin" 
              class="form-control date-input"
              placeholder="Date fin"
            />
            <button class="btn btn-secondary" (click)="appliquerFiltres()">
              🔍 Filtrer
            </button>
            <button class="btn btn-secondary" (click)="reinitialiserFiltres()">
              🔄 Réinitialiser
            </button>
            <button class="btn btn-success" (click)="exporterHistorique()">
              💾 Exporter
            </button>
          </div>
        </div>

        <div class="historique-stats">
          <p>
            <strong>Total d'entrées:</strong> {{ historiqueFiltre().length }}
          </p>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Jour</th>
                <th>Demi-journée</th>
                <th>Binômes</th>
                <th>Zone</th>
                <th>Mission</th>
                <th>Réunion</th>
                <th>Commentaires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let entry of historiqueFiltre()">
                <td>{{ formatDate(entry.date) }}</td>
                <td>{{ entry.jour }}</td>
                <td>{{ entry.demiJournee === 'MATIN' ? 'Matin' : 'Après-midi' }}</td>
                <td><strong>{{ entry.binomes }}</strong></td>
                <td>
                  <input 
                    type="text" 
                    [(ngModel)]="entry.zone" 
                    class="form-control inline-input"
                    (blur)="sauvegarderEntry(entry)"
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    [(ngModel)]="entry.mission" 
                    class="form-control inline-input"
                    (blur)="sauvegarderEntry(entry)"
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    [(ngModel)]="entry.reunion" 
                    class="form-control inline-input"
                    (blur)="sauvegarderEntry(entry)"
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    [(ngModel)]="entry.commentaires" 
                    class="form-control inline-input"
                    (blur)="sauvegarderEntry(entry)"
                  />
                </td>
                <td>
                  <button class="btn btn-danger btn-sm" (click)="supprimerEntry(entry.id)">
                    🗑️
                  </button>
                </td>
              </tr>
              <tr *ngIf="historiqueFiltre().length === 0">
                <td colspan="9" class="text-center">Aucun historique disponible</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .header-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    
    .date-input {
      width: 150px;
    }
    
    .historique-stats {
      margin-bottom: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    
    .table-wrapper {
      overflow-x: auto;
    }
    
    .inline-input {
      width: 100%;
      padding: 6px;
      font-size: 12px;
      min-width: 100px;
    }
    
    .btn-sm {
      padding: 6px 12px;
      font-size: 14px;
    }
    
    .text-center {
      text-align: center;
      padding: 20px;
      color: #999;
    }
  `]
})
export class HistoriqueComponent {
  private dataService = inject(DataService);

  historique = signal<HistoriqueEntry[]>([]);
  historiqueFiltre = signal<HistoriqueEntry[]>([]);
  dateDebut: string = '';
  dateFin: string = '';

  constructor() {
    this.chargerHistorique();
  }

  chargerHistorique(): void {
    const historique = this.dataService.getHistorique();
    this.historique.set(historique);
    this.historiqueFiltre.set(historique);
  }

  appliquerFiltres(): void {
    let filtered = [...this.historique()];

    if (this.dateDebut) {
      const dateDebutObj = new Date(this.dateDebut);
      filtered = filtered.filter(e => new Date(e.date) >= dateDebutObj);
    }

    if (this.dateFin) {
      const dateFinObj = new Date(this.dateFin);
      dateFinObj.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => new Date(e.date) <= dateFinObj);
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    this.historiqueFiltre.set(filtered);
  }

  reinitialiserFiltres(): void {
    this.dateDebut = '';
    this.dateFin = '';
    this.historiqueFiltre.set([...this.historique()]);
  }

  sauvegarderEntry(entry: HistoriqueEntry): void {
    this.dataService.updateHistoriqueEntry(entry);
    this.chargerHistorique();
  }

  supprimerEntry(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) {
      this.dataService.deleteHistoriqueEntry(id);
      this.chargerHistorique();
    }
  }

  exporterHistorique(): void {
    const data = this.dataService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }
}

