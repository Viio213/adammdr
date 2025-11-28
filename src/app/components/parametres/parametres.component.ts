import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';

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
          <p>Exportez toutes vos données (agents, historique, plannings) au format JSON.</p>
          <button class="btn btn-primary" (click)="exporterDonnees()">
            Exporter toutes les données
          </button>
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
          <button class="btn btn-danger" (click)="reinitialiserDonnees()">
            Réinitialiser toutes les données
          </button>
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
    .settings-section {
      padding: 24px;
      margin-bottom: 24px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    
    .settings-section h3 {
      margin-top: 0;
      margin-bottom: 12px;
      color: #555;
    }
    
    .settings-section p {
      color: #666;
      margin-bottom: 16px;
    }
    
    .import-warning {
      padding: 12px;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 6px;
      margin-bottom: 12px;
      color: #856404;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    
    .info-item {
      padding: 12px;
      background: white;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
    }
  `]
})
export class ParametresComponent {
  private dataService = inject(DataService);

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

  importerDonnees(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    if (!confirm('Cette action remplacera toutes vos données actuelles. Continuer ?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        const success = this.dataService.importData(jsonData);
        
        if (success) {
          alert('Données importées avec succès !');
          this.chargerStatistiques();
          // Reload page to refresh all components
          window.location.reload();
        } else {
          alert('Erreur lors de l\'import des données.');
        }
      } catch (error) {
        alert('Erreur: Fichier invalide.');
        console.error(error);
      }
    };
    reader.readAsText(file);
  }

  reinitialiserDonnees(): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer TOUTES les données ? Cette action est irréversible !')) {
      return;
    }

    if (!confirm('Dernière confirmation : supprimer toutes les données ?')) {
      return;
    }

    localStorage.clear();
    alert('Toutes les données ont été supprimées. La page va se recharger.');
    window.location.reload();
  }
}


