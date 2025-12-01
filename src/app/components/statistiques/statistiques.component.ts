import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatistiquesService } from '../../services/statistiques.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { 
  StatistiqueBinome, 
  StatistiqueZone, 
  StatistiqueAgent,
  StatistiqueVehicule,
  StatistiqueExterieur,
  StatistiqueEcole
} from '../../models/statistiques.model';

@Component({
  selector: 'app-statistiques',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <!-- Header with export buttons -->
      <div class="stats-header">
        <h1>Statistiques</h1>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="exporterPdf()">Export PDF</button>
          <button class="btn btn-info" (click)="imprimerPdf()">Imprimer</button>
        </div>
      </div>

      <!-- Quick Stats Cards -->
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value">{{ statistiquesAgents().length }}</span>
            <span class="stat-label">Agents actifs</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value">{{ getTotalVehicule() }}</span>
            <span class="stat-label">Sorties véhicule</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value">{{ getTotalExterieur() }}</span>
            <span class="stat-label">Sorties extérieur</span>
          </div>
        </div>
      </div>

      <!-- Statistiques Binômes -->
      <div class="card">
        <div class="card-header">
          <h2>Paires d'agents les plus fréquentes</h2>
        </div>
        <div class="stats-content">
          <p class="stats-description">
            Agents qui travaillent le plus souvent ensemble
          </p>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Agent 1</th>
                  <th>Agent 2</th>
                  <th>Occurrences</th>
                  <th>Dernier travail</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let stat of pairesPlusFrequentes(); let i = index">
                  <td><strong>{{ stat.agent1 }}</strong></td>
                  <td><strong>{{ stat.agent2 }}</strong></td>
                  <td>
                    <div class="bar-container">
                      <div class="bar" [style.width.%]="getBarWidth(stat.nombreOccurrences, getMaxPaires())"></div>
                      <span class="bar-value">{{ stat.nombreOccurrences }}</span>
                    </div>
                  </td>
                  <td>{{ stat.dernierTravail ? formatDate(stat.dernierTravail) : '-' }}</td>
                </tr>
                <tr *ngIf="pairesPlusFrequentes().length === 0">
                  <td colspan="4" class="text-center">Aucune statistique disponible</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Statistiques Véhicules -->
      <div class="card">
        <div class="card-header">
          <h2>Répartition des véhicules</h2>
        </div>
        <div class="stats-content">
          <p class="stats-description">
            Agents classés par utilisation du véhicule (priorité à ceux qui en ont eu le moins)
          </p>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>En véhicule</th>
                  <th>À pied</th>
                  <th>% Véhicule</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let stat of statistiquesVehicules()">
                  <td><strong>{{ stat.agentNom }}</strong></td>
                  <td>
                    <span class="badge badge-success">{{ stat.nombreVehicule }}</span>
                  </td>
                  <td>
                    <span class="badge badge-secondary">{{ stat.nombrePied }}</span>
                  </td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress" [style.width.%]="stat.pourcentageVehicule"></div>
                      <span class="progress-text">{{ stat.pourcentageVehicule }}%</span>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="statistiquesVehicules().length === 0">
                  <td colspan="4" class="text-center">Aucune statistique disponible</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Statistiques Zones Extérieures -->
      <div class="card">
        <div class="card-header">
          <h2>Agents en zones extérieures</h2>
        </div>
        <div class="stats-content">
          <p class="stats-description">
            Zones extérieures = Zone 1 (Saint-Servais) et Zone 4 (Jambes)
          </p>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Extérieur</th>
                  <th>Intérieur</th>
                  <th>% Extérieur</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let stat of statistiquesExterieur()">
                  <td><strong>{{ stat.agentNom }}</strong></td>
                  <td>
                    <span class="badge badge-info">{{ stat.nombreExterieur }}</span>
                  </td>
                  <td>
                    <span class="badge badge-secondary">{{ stat.nombreInterieur }}</span>
                  </td>
                  <td>
                    <div class="progress-bar progress-green">
                      <div class="progress" [style.width.%]="stat.pourcentageExterieur"></div>
                      <span class="progress-text">{{ stat.pourcentageExterieur }}%</span>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="statistiquesExterieur().length === 0">
                  <td colspan="4" class="text-center">Aucune statistique disponible</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Statistiques par Agent -->
      <div class="card">
        <div class="card-header">
          <h2>Détails par Agent</h2>
        </div>
        <div class="stats-content">
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Total</th>
                  <th>Matin</th>
                  <th>Après-midi</th>
                  <th>Partenaires fréquents</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let stat of statistiquesAgents()">
                  <td><strong>{{ stat.nom }}</strong></td>
                  <td>
                    <span class="badge badge-primary">{{ stat.nombreTotal }}</span>
                  </td>
                  <td>
                    <span class="badge badge-warning">{{ stat.nombreMatin }}</span>
                  </td>
                  <td>
                    <span class="badge badge-info">{{ stat.nombreApresMidi }}</span>
                  </td>
                  <td>
                    <div class="partenaires-list">
                      <span *ngFor="let partenaire of getTopPartenaires(stat.partenairesFrequents)" class="partenaire-badge">
                        {{ partenaire.nom }} ({{ partenaire.count }})
                      </span>
                      <span *ngIf="getTopPartenaires(stat.partenairesFrequents).length === 0">-</span>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="statistiquesAgents().length === 0">
                  <td colspan="5" class="text-center">Aucune statistique disponible</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Statistiques Zones -->
      <div class="card">
        <div class="card-header">
          <h2>Répartition par Zone</h2>
        </div>
        <div class="stats-content">
          <div class="zones-grid">
            <div *ngFor="let zone of statistiquesZones()" 
                 class="zone-card"
                 [class.zone-exterieur]="zone.isExterieur">
              <div class="zone-header">
                <span class="zone-name">{{ zone.zoneName }}</span>
                <span class="zone-count">{{ zone.nombreOccurrences }}</span>
              </div>
              <div class="zone-badge" *ngIf="zone.isExterieur">Extérieur</div>
              <div class="zone-agents">
                <span *ngFor="let agent of getTopAgentsZone(zone.agents)" class="agent-badge">
                  {{ agent.nom }}: {{ agent.count }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Statistiques Écoles -->
      <div class="card">
        <div class="card-header">
          <h2>Répartition par École</h2>
        </div>
        <div class="stats-content">
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>École</th>
                  <th>Zone</th>
                  <th>Occurrences</th>
                  <th>Agents fréquents</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let ecole of statistiquesEcoles()">
                  <td><strong>{{ ecole.ecoleName }}</strong></td>
                  <td>{{ ecole.zoneName }}</td>
                  <td>
                    <span class="badge badge-primary">{{ ecole.nombreOccurrences }}</span>
                  </td>
                  <td>
                    <div class="partenaires-list">
                      <span *ngFor="let agent of getTopAgentsZone(ecole.agents)" class="partenaire-badge">
                        {{ agent.nom }} ({{ agent.count }})
                      </span>
                      <span *ngIf="getTopAgentsZone(ecole.agents).length === 0">-</span>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="statistiquesEcoles().length === 0">
                  <td colspan="4" class="text-center">Aucune statistique disponible</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stats-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .stats-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #4a6fa5 0%, #5b9bd5 100%);
      color: #fff;
    }

    .btn-primary:hover { background: #3d5a87; }

    .btn-info {
      background: #0ea5e9;
      color: #fff;
    }

    .btn-info:hover { background: #0284c7; }

    .stats-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
    }

    .stat-label {
      font-size: 13px;
      color: #64748b;
    }

    .card-header {
      margin-bottom: 0;
      padding-bottom: 24px;
      border-bottom: 2px solid #e2e8f0;
    }

    .card-header h2 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .stats-description {
      color: #64748b;
      margin: 24px 0 16px 0;
      font-size: 14px;
    }

    .table-wrapper {
      overflow-x: auto;
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .bar-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .bar {
      height: 20px;
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
      border-radius: 4px;
      min-width: 4px;
    }

    .bar-value {
      font-weight: 600;
      color: #1e293b;
      min-width: 30px;
    }

    .progress-bar {
      position: relative;
      height: 24px;
      background: #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      min-width: 100px;
    }

    .progress-bar .progress {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
      border-radius: 12px;
    }

    .progress-bar.progress-green .progress {
      background: linear-gradient(90deg, #10b981, #34d399);
    }

    .progress-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 11px;
      font-weight: 600;
      color: #1e293b;
    }

    .badge-primary {
      background: #dbeafe;
      color: #1e40af;
    }

    .badge-secondary {
      background: #f1f5f9;
      color: #475569;
    }

    .partenaires-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .partenaire-badge {
      padding: 4px 8px;
      background: #f0fdf4;
      color: #166534;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }

    .zones-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-top: 24px;
    }

    .zone-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #e2e8f0;
    }

    .zone-card.zone-exterieur {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border-color: #a7f3d0;
    }

    .zone-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .zone-name {
      font-weight: 600;
      color: #1e293b;
      font-size: 14px;
    }

    .zone-count {
      font-size: 24px;
      font-weight: 700;
      color: #3b82f6;
    }

    .zone-badge {
      display: inline-block;
      padding: 4px 10px;
      background: #10b981;
      color: white;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .zone-agents {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .agent-badge {
      padding: 4px 8px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      font-size: 11px;
      color: #475569;
    }

    .text-center {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
    }
  `]
})
export class StatistiquesComponent {
  private statistiquesService = inject(StatistiquesService);
  private pdfExport = inject(PdfExportService);

  statistiquesBinomes = signal<StatistiqueBinome[]>([]);
  statistiquesZones = signal<StatistiqueZone[]>([]);
  statistiquesAgents = signal<StatistiqueAgent[]>([]);
  statistiquesVehicules = signal<StatistiqueVehicule[]>([]);
  statistiquesExterieur = signal<StatistiqueExterieur[]>([]);
  statistiquesEcoles = signal<StatistiqueEcole[]>([]);
  pairesPlusFrequentes = signal<StatistiqueBinome[]>([]);

  constructor() {
    this.chargerStatistiques();
  }

  chargerStatistiques(): void {
    this.statistiquesBinomes.set(this.statistiquesService.getStatistiquesBinomes());
    this.statistiquesZones.set(this.statistiquesService.getStatistiquesZones());
    this.statistiquesAgents.set(this.statistiquesService.getStatistiquesAgents());
    this.statistiquesVehicules.set(this.statistiquesService.getStatistiquesVehicules());
    this.statistiquesExterieur.set(this.statistiquesService.getStatistiquesExterieur());
    this.statistiquesEcoles.set(this.statistiquesService.getStatistiquesEcoles());
    this.pairesPlusFrequentes.set(this.statistiquesService.getPairesPlusFrequentes(10));
  }

  getTotalVehicule(): number {
    return this.statistiquesVehicules().reduce((sum, s) => sum + s.nombreVehicule, 0);
  }

  getTotalExterieur(): number {
    return this.statistiquesExterieur().reduce((sum, s) => sum + s.nombreExterieur, 0);
  }

  getMaxPaires(): number {
    const paires = this.pairesPlusFrequentes();
    return paires.length > 0 ? paires[0].nombreOccurrences : 1;
  }

  getBarWidth(value: number, max: number): number {
    return Math.round((value / max) * 100);
  }

  getTopPartenaires(partenaires: { [nom: string]: number }): Array<{ nom: string; count: number }> {
    return Object.entries(partenaires)
      .map(([nom, count]) => ({ nom, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  getTopAgentsZone(agents: { [nom: string]: number }): Array<{ nom: string; count: number }> {
    return Object.entries(agents)
      .map(([nom, count]) => ({ nom, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }

  exporterPdf(): void {
    this.pdfExport.exportStatistiquesToPdf(
      this.pairesPlusFrequentes(),
      this.statistiquesAgents(),
      this.statistiquesZones()
    );
  }

  imprimerPdf(): void {
    this.pdfExport.printStatistiques(
      this.pairesPlusFrequentes(),
      this.statistiquesAgents(),
      this.statistiquesZones()
    );
  }
}
