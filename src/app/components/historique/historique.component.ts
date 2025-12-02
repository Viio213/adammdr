import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { AuthService } from '../../services/auth.service';
import { HistoriqueEntry } from '../../models/historique.model';

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="card">
        <div class="card-header">
          <h2>Historique des Plannings</h2>
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
              Filtrer
            </button>
            <button class="btn btn-secondary" (click)="reinitialiserFiltres()">
              Réinitialiser
            </button>
            <button *ngIf="canEdit" class="btn btn-success" (click)="exporterHistorique()">
              Export JSON
            </button>
            <button class="btn btn-success" (click)="exporterExcel()">
              Export Excel
            </button>
            <button class="btn btn-primary" (click)="exporterPdf()">
              Export PDF
            </button>
            <button class="btn btn-info" (click)="imprimerPdf()">
              Imprimer
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
                <th>Véhicule</th>
                <th>Mission</th>
                <th>Réunion</th>
                <th>Commentaires</th>
                <th *ngIf="canEdit">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let entry of historiqueFiltre()">
                <td>{{ formatDate(entry.date) }}</td>
                <td>{{ entry.jour }}</td>
                <td>{{ entry.demiJournee === 'MATIN' ? 'Matin' : 'Après-midi' }}</td>
                <td><strong>{{ entry.binomes }}</strong></td>
                <td>{{ entry.zoneName || '-' }}</td>
                <td>
                  <span [class]="entry.vehicule ? 'badge badge-success' : 'badge badge-secondary'">
                    {{ entry.vehicule ? 'Oui' : 'Non' }}
                  </span>
                </td>
                <td>
                  <ng-container *ngIf="canEdit; else readOnlyMission">
                    <input 
                      type="text" 
                      [(ngModel)]="entry.mission" 
                      class="form-control inline-input"
                      (blur)="sauvegarderEntry(entry)"
                    />
                  </ng-container>
                  <ng-template #readOnlyMission>
                    {{ entry.mission || '-' }}
                  </ng-template>
                </td>
                <td>
                  <ng-container *ngIf="canEdit; else readOnlyReunion">
                    <input 
                      type="text" 
                      [(ngModel)]="entry.reunion" 
                      class="form-control inline-input"
                      (blur)="sauvegarderEntry(entry)"
                    />
                  </ng-container>
                  <ng-template #readOnlyReunion>
                    {{ entry.reunion || '-' }}
                  </ng-template>
                </td>
                <td>
                  <ng-container *ngIf="canEdit; else readOnlyCommentaires">
                    <input 
                      type="text" 
                      [(ngModel)]="entry.commentaires" 
                      class="form-control inline-input"
                      (blur)="sauvegarderEntry(entry)"
                    />
                  </ng-container>
                  <ng-template #readOnlyCommentaires>
                    {{ entry.commentaires || '-' }}
                  </ng-template>
                </td>
                <td *ngIf="canEdit">
                  <button class="btn btn-danger btn-sm" (click)="supprimerEntry(entry.id)">
                    Supprimer
                  </button>
                </td>
              </tr>
              <tr *ngIf="historiqueFiltre().length === 0">
                <td [attr.colspan]="canEdit ? 10 : 9" class="text-center">Aucun historique disponible</td>
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
      margin-bottom: 0;
      padding-bottom: 24px;
      border-bottom: 2px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .card-header h2 {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }
    
    .header-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    
    .date-input {
      min-width: 160px;
    }
    
    .btn-info {
      background: #0ea5e9;
      color: white;
    }

    .btn-info:hover {
      background: #0284c7;
    }
    
    .historique-stats {
      margin: 24px 0;
      padding: 16px 20px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 10px;
      border-left: 4px solid #6366f1;
    }
    
    .historique-stats p {
      margin: 0;
      font-size: 15px;
      color: #475569;
    }
    
    .historique-stats strong {
      color: #1e293b;
      font-weight: 600;
    }
    
    .table-wrapper {
      overflow-x: auto;
      margin-top: 24px;
      border-radius: 12px;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
    
    .inline-input {
      width: 100%;
      padding: 8px 12px;
      font-size: 13px;
      min-width: 120px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      transition: all 0.2s ease;
    }
    
    .inline-input:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
    
    .btn-sm {
      padding: 8px 16px;
      font-size: 13px;
    }
    
    .text-center {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
    }
  `]
})
export class HistoriqueComponent {
  private dataService = inject(DataService);
  private excelExport = inject(ExcelExportService);
  private pdfExport = inject(PdfExportService);
  private authService = inject(AuthService);

  // Use computed to reactively get historique from DataService
  historique = computed(() => this.dataService.historique());
  historiqueFiltre = signal<HistoriqueEntry[]>([]);
  dateDebut: string = '';
  dateFin: string = '';

  canEdit = this.authService.hasPermission('canEditHistorique');

  constructor() {
    // Initialize filtered list from computed historique
    effect(() => {
      this.historiqueFiltre.set([...this.historique()]);
    });
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

  async sauvegarderEntry(entry: HistoriqueEntry): Promise<void> {
    if (!this.canEdit) return;
    await this.dataService.updateHistoriqueEntry(entry);
    // No need to manually reload, computed signal will update automatically
  }

  async supprimerEntry(id: string): Promise<void> {
    if (!this.canEdit) return;
    if (confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) {
      await this.dataService.deleteHistoriqueEntry(id);
      // No need to manually reload, computed signal will update automatically
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

  exporterExcel(): void {
    this.excelExport.exportHistoriqueToExcel(this.historiqueFiltre());
  }

  exporterPdf(): void {
    this.pdfExport.exportHistoriqueToPdf(this.historiqueFiltre());
  }

  imprimerPdf(): void {
    this.pdfExport.printHistorique(this.historiqueFiltre());
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }
}
