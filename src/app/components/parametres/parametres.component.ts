import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { NotificationService } from '../../services/notification.service';

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
  `]
})
export class ParametresComponent {
  private dataService = inject(DataService);
  private excelExport = inject(ExcelExportService);
  private notification = inject(NotificationService);

  showWarning = false;
  nombreAgents = 0;
  nombreHistorique = 0;
  nombrePlannings = 0;

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
    a.download = `adammdr-backup-${new Date().toISOString().split('T')[0]}.json`;
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
}


