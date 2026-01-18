import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { NotificationService } from '../../services/notification.service';
import { ZonePriorityService } from '../../services/zone-priority.service';
import { ZONES } from '../../models/zone.model';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="card">
        <div class="card-header">
          <h2>Paramètres</h2>
        </div>

        <div class="settings-section">
          <h3>Export de Données</h3>
          <p>Exportez toutes vos données (agents, historique, plannings).</p>
          <div class="export-buttons">
            <button class="btn btn-primary" (click)="exporterDonnees()">
              Export JSON
            </button>
            <button class="btn btn-success" (click)="exporterExcel()">
              Export Excel
            </button>
          </div>
        </div>

        <div class="settings-section">
          <h3>Import de Données</h3>
          <p>Importez des données depuis un fichier JSON précédemment exporté.</p>
          <div class="import-warning" *ngIf="showWarning">
            L'import remplacera toutes vos données actuelles !
          </div>
          <input 
            type="file" 
            #fileInput 
            accept=".json" 
            (change)="importerDonnees($event)"
            style="display: none"
          />
          <button class="btn btn-secondary" (click)="fileInput.click()">
            Choisir un fichier
          </button>
        </div>

        <div class="settings-section">
          <h3>Réinitialisation</h3>
          <p>Supprimez toutes les données stockées localement.</p>
          <div class="reset-buttons">
            <button class="btn btn-warning" (click)="resetDatabase()">
              Reset DB (Historique, Stats, Congés)
            </button>
            <button class="btn btn-danger" (click)="reinitialiserDonnees()">
              Réinitialiser toutes les données
            </button>
          </div>
        </div>

        <div class="settings-section">
          <h3>Priorités des Zones</h3>
          <p>Configurez l'ordre de priorité des zones lors de la génération du planning. Plus le nombre est bas, plus la priorité est élevée.</p>
          <div class="zones-priority-list">
            <div *ngFor="let item of zonesAvecPriorites()" class="zone-priority-item">
              <div class="zone-info">
                <strong>{{ item.zone.nom }}</strong>
                <span class="zone-detail">{{ item.zone.isExterieur ? 'Extérieur' : 'Intérieur' }}</span>
              </div>
              <div class="priority-control">
                <label>Priorité:</label>
                <input 
                  type="number" 
                  [(ngModel)]="item.priorite" 
                  min="1" 
                  max="10"
                  class="priority-input"
                  (change)="updateZonePriority(item.zone.id, item.priorite)"
                />
                <span class="priority-hint">({{ getPriorityLabel(item.priorite) }})</span>
              </div>
            </div>
          </div>
          <div class="priority-actions">
            <button class="btn btn-secondary" (click)="resetZonePriorities()">
              Réinitialiser les priorités par défaut
            </button>
          </div>
        </div>

        <div class="settings-section">
          <h3>Informations</h3>
          <div class="info-grid">
            <div class="info-item">
              <strong>Agents:</strong> {{ nombreAgents }}
            </div>
            <div class="info-item">
              <strong>Entrées historiques:</strong> {{ nombreHistorique }}
            </div>
            <div class="info-item">
              <strong>Plannings:</strong> {{ nombrePlannings }}
            </div>
            <div class="info-item">
              <strong>Version:</strong> 1.0.0
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card-header {
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
    
    .settings-section {
      padding: 24px;
      margin-bottom: 24px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 12px;
      border-left: 4px solid #6366f1;
      transition: all 0.2s ease;
    }
    
    .settings-section:hover {
      border-left-color: #4f46e5;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
    }
    
    .settings-section h3 {
      margin: 0 0 12px 0;
      color: #1e293b;
      font-size: 18px;
      font-weight: 600;
    }
    
    .settings-section p {
      color: #64748b;
      margin-bottom: 16px;
      line-height: 1.6;
      font-size: 14px;
    }
    
    .import-warning {
      padding: 14px 16px;
      background: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      margin-bottom: 16px;
      color: #92400e;
      font-size: 14px;
      font-weight: 500;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    
    .info-item {
      padding: 16px;
      background: white;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      transition: all 0.2s ease;
    }
    
    .info-item:hover {
      border-color: #cbd5e1;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
    
    .info-item strong {
      display: block;
      color: #64748b;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      font-weight: 600;
    }
    
    .export-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .reset-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn-warning {
      background: #f59e0b;
      color: #fff;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-warning:hover {
      background: #d97706;
    }

    /* Zones Priority */
    .zones-priority-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 20px;
    }

    .zone-priority-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: white;
      border-radius: 10px;
      border: 2px solid #e2e8f0;
      transition: all 0.2s;
    }

    .zone-priority-item:hover {
      border-color: #4a6fa5;
      box-shadow: 0 2px 8px rgba(74, 111, 165, 0.1);
    }

    .zone-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .zone-info strong {
      color: #1e293b;
      font-size: 15px;
      font-weight: 600;
    }

    .zone-detail {
      color: #64748b;
      font-size: 12px;
    }

    .priority-control {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .priority-control label {
      color: #475569;
      font-size: 14px;
      font-weight: 500;
    }

    .priority-input {
      width: 80px;
      padding: 8px 12px;
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      font-size: 14px;
      text-align: center;
    }

    .priority-input:focus {
      outline: none;
      border-color: #4a6fa5;
    }

    .priority-hint {
      color: #94a3b8;
      font-size: 12px;
      font-style: italic;
    }

    .priority-actions {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    }
  `]
})
export class ParametresComponent {
  private dataService = inject(DataService);
  private excelExport = inject(ExcelExportService);
  private notification = inject(NotificationService);
  private zonePriorityService = inject(ZonePriorityService);

  showWarning = false;
  nombreAgents = 0;
  nombreHistorique = 0;
  nombrePlannings = 0;
  
  // Zones avec priorités
  zonesAvecPriorites = signal(this.zonePriorityService.getZonesWithPriorities());

  constructor() {
    this.chargerStatistiques();
  }

  chargerStatistiques(): void {
    this.nombreAgents = this.dataService.getAgents().length;
    this.nombreHistorique = this.dataService.getHistorique().length;
    this.nombrePlannings = this.dataService.getPlannings().length;
  }

  exporterDonnees(): void {
    const data = this.dataService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planner-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exporterExcel(): void {
    this.excelExport.exportAllToExcel();
  }

  async importerDonnees(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    const confirmed = await this.notification.confirm({
      title: 'Importer des données',
      message: 'Cette action remplacera toutes vos données actuelles. Continuer ?',
      confirmText: 'Importer',
      cancelText: 'Annuler',
      type: 'warning'
    });
    
    if (!confirmed) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = e.target?.result as string;
        const success = await this.dataService.importData(jsonData);
        
        if (success) {
          await this.notification.alert({
            title: 'Succès',
            message: 'Données importées avec succès !',
            type: 'success'
          });
          this.chargerStatistiques();
          window.location.reload();
        } else {
          await this.notification.alert({
            title: 'Erreur',
            message: 'Erreur lors de l\'import des données.',
            type: 'danger'
          });
        }
      } catch (error) {
        await this.notification.alert({
          title: 'Erreur',
          message: 'Fichier invalide.',
          type: 'danger'
        });
        console.error(error);
      }
    };
    reader.readAsText(file);
  }

  async resetDatabase(): Promise<void> {
    const confirmed1 = await this.notification.confirm({
      title: 'Réinitialiser la base',
      message: 'Êtes-vous sûr de vouloir supprimer l\'historique, les statistiques et les congés ? Cette action est irréversible !',
      confirmText: 'Continuer',
      cancelText: 'Annuler',
      type: 'danger'
    });
    
    if (!confirmed1) return;

    const confirmed2 = await this.notification.confirm({
      title: 'Dernière confirmation',
      message: 'Supprimer l\'historique, les statistiques et les congés ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      type: 'danger'
    });
    
    if (!confirmed2) return;

    const result = await this.dataService.resetDatabase();
    
    await this.notification.alert({
      title: result.success ? 'Succès' : 'Erreur',
      message: result.message,
      type: result.success ? 'success' : 'danger'
    });
    
    if (result.success) {
      this.chargerStatistiques();
      window.location.reload();
    }
  }

  async reinitialiserDonnees(): Promise<void> {
    const confirmed1 = await this.notification.confirm({
      title: 'Supprimer toutes les données',
      message: 'Êtes-vous sûr de vouloir supprimer TOUTES les données ? Cette action est irréversible !',
      confirmText: 'Continuer',
      cancelText: 'Annuler',
      type: 'danger'
    });
    
    if (!confirmed1) return;

    const confirmed2 = await this.notification.confirm({
      title: 'Dernière confirmation',
      message: 'Supprimer définitivement toutes les données ?',
      confirmText: 'Supprimer tout',
      cancelText: 'Annuler',
      type: 'danger'
    });
    
    if (!confirmed2) return;

    localStorage.clear();
    
    await this.notification.alert({
      title: 'Données supprimées',
      message: 'Toutes les données ont été supprimées. La page va se recharger.',
      type: 'success'
    });
    
    window.location.reload();
  }

  updateZonePriority(zoneId: string, priorite: number): void {
    this.zonePriorityService.setPriority(zoneId, priorite);
    // Refresh the list
    this.zonesAvecPriorites.set(this.zonePriorityService.getZonesWithPriorities());
  }

  resetZonePriorities(): void {
    this.zonePriorityService.resetToDefaults();
    this.zonesAvecPriorites.set(this.zonePriorityService.getZonesWithPriorities());
    this.notification.alert({
      title: 'Succès',
      message: 'Les priorités ont été réinitialisées aux valeurs par défaut.',
      type: 'success'
    });
  }

  getPriorityLabel(priorite: number): string {
    if (priorite === 1) return 'Priorité absolue';
    if (priorite === 2) return 'Haute priorité';
    if (priorite === 3) return 'Priorité moyenne';
    if (priorite >= 4) return 'Basse priorité';
    return 'Non définie';
  }
}


