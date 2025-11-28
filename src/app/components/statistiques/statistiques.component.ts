import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatistiquesService } from '../../services/statistiques.service';
import { StatistiqueBinome, StatistiqueZone, StatistiqueAgent } from '../../models/statistiques.model';

@Component({
  selector: 'app-statistiques',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <!-- Statistiques Binômes -->
      <div class="card">
        <div class="card-header">
          <h2>Statistiques des Binômes</h2>
        </div>
        <div class="stats-content">
          <p class="stats-description">
            Nombre de fois que chaque paire d'agents a travaillé ensemble
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
                <tr *ngFor="let stat of statistiquesBinomes()">
                  <td><strong>{{ stat.agent1 }}</strong></td>
                  <td><strong>{{ stat.agent2 }}</strong></td>
                  <td>
                    <span class="badge badge-info">{{ stat.nombreOccurrences }}</span>
                  </td>
                  <td>
                    {{ stat.dernierTravail ? formatDate(stat.dernierTravail) : '-' }}
                  </td>
                </tr>
                <tr *ngIf="statistiquesBinomes().length === 0">
                  <td colspan="4" class="text-center">Aucune statistique disponible</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Statistiques Zones -->
      <div class="card">
        <div class="card-header">
          <h2>Statistiques des Zones</h2>
        </div>
        <div class="stats-content">
          <p class="stats-description">
            Répartition du travail par zone
          </p>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Occurrences</th>
                  <th>Agents</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let stat of statistiquesZones()">
                  <td><strong>{{ stat.zone }}</strong></td>
                  <td>
                    <span class="badge badge-info">{{ stat.nombreOccurrences }}</span>
                  </td>
                  <td>
                    <div class="agents-list">
                      <span *ngFor="let agent of getAgentsList(stat.agents)" class="agent-badge">
                        {{ agent.nom }} ({{ agent.count }})
                      </span>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="statistiquesZones().length === 0">
                  <td colspan="3" class="text-center">Aucune statistique de zone disponible</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Statistiques Agents -->
      <div class="card">
        <div class="card-header">
          <h2>Statistiques par Agent</h2>
        </div>
        <div class="stats-content">
          <p class="stats-description">
            Détails du travail de chaque agent
          </p>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Total</th>
                  <th>Matin</th>
                  <th>Après-midi</th>
                  <th>Zones</th>
                  <th>Partenaires fréquents</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let stat of statistiquesAgents()">
                  <td><strong>{{ stat.nom }}</strong></td>
                  <td>
                    <span class="badge badge-success">{{ stat.nombreTotal }}</span>
                  </td>
                  <td>
                    <span class="badge badge-warning">{{ stat.nombreMatin }}</span>
                  </td>
                  <td>
                    <span class="badge badge-info">{{ stat.nombreApresMidi }}</span>
                  </td>
                  <td>
                    <div class="zones-list">
                      <span *ngFor="let zone of getZonesList(stat.zonesTravaillees)" class="zone-badge">
                        {{ zone.nom }} ({{ zone.count }})
                      </span>
                      <span *ngIf="getZonesList(stat.zonesTravaillees).length === 0">-</span>
                    </div>
                  </td>
                  <td>
                    <div class="partenaires-list">
                      <span *ngFor="let partenaire of getPartenairesList(stat.partenairesFrequents)" class="partenaire-badge">
                        {{ partenaire.nom }} ({{ partenaire.count }})
                      </span>
                      <span *ngIf="getPartenairesList(stat.partenairesFrequents).length === 0">-</span>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="statistiquesAgents().length === 0">
                  <td colspan="6" class="text-center">Aucune statistique d'agent disponible</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Paires les plus/moins fréquentes -->
      <div class="card">
        <div class="card-header">
          <h2>Analyse des Paires</h2>
        </div>
        <div class="stats-grid">
          <div class="stats-section">
            <h3>Paires les plus fréquentes</h3>
            <ul class="stats-list">
              <li *ngFor="let stat of pairesPlusFrequentes()">
                <strong>{{ stat.agent1 }}</strong> & <strong>{{ stat.agent2 }}</strong>
                <span class="badge badge-info">{{ stat.nombreOccurrences }} fois</span>
              </li>
              <li *ngIf="pairesPlusFrequentes().length === 0">Aucune donnée</li>
            </ul>
          </div>
          <div class="stats-section">
            <h3>Paires les moins fréquentes</h3>
            <ul class="stats-list">
              <li *ngFor="let stat of pairesMoinsFrequentes()">
                <strong>{{ stat.agent1 }}</strong> & <strong>{{ stat.agent2 }}</strong>
                <span class="badge badge-warning">{{ stat.nombreOccurrences }} fois</span>
              </li>
              <li *ngIf="pairesMoinsFrequentes().length === 0">Aucune donnée</li>
            </ul>
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
    
    .stats-description {
      color: #64748b;
      margin: 24px 0;
      font-size: 14px;
      line-height: 1.6;
    }
    
    .table-wrapper {
      overflow-x: auto;
      margin-top: 24px;
      border-radius: 12px;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
    
    .agents-list,
    .zones-list,
    .partenaires-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .agent-badge,
    .zone-badge,
    .partenaire-badge {
      display: inline-block;
      padding: 6px 12px;
      background: #eef2ff;
      color: #4338ca;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid #e0e7ff;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
      margin-top: 24px;
    }
    
    .stats-section {
      background: #f8fafc;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    
    .stats-section h3 {
      margin: 0 0 16px 0;
      color: #1e293b;
      font-size: 18px;
      font-weight: 600;
    }
    
    .stats-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .stats-list li {
      padding: 14px 16px;
      margin-bottom: 8px;
      background: white;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #e2e8f0;
      transition: all 0.2s ease;
    }
    
    .stats-list li:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
      transform: translateX(2px);
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

  statistiquesBinomes = signal<StatistiqueBinome[]>([]);
  statistiquesZones = signal<StatistiqueZone[]>([]);
  statistiquesAgents = signal<StatistiqueAgent[]>([]);
  pairesPlusFrequentes = signal<StatistiqueBinome[]>([]);
  pairesMoinsFrequentes = signal<StatistiqueBinome[]>([]);

  constructor() {
    this.chargerStatistiques();
  }

  chargerStatistiques(): void {
    this.statistiquesBinomes.set(this.statistiquesService.getStatistiquesBinomes());
    this.statistiquesZones.set(this.statistiquesService.getStatistiquesZones());
    this.statistiquesAgents.set(this.statistiquesService.getStatistiquesAgents());
    this.pairesPlusFrequentes.set(this.statistiquesService.getPairesPlusFrequentes(10));
    this.pairesMoinsFrequentes.set(this.statistiquesService.getPairesMoinsFrequentes(10));
  }

  getAgentsList(agents: { [key: string]: number }): Array<{ nom: string; count: number }> {
    return Object.entries(agents)
      .map(([nom, count]) => ({ nom, count }))
      .sort((a, b) => b.count - a.count);
  }

  getZonesList(zones: { [key: string]: number }): Array<{ nom: string; count: number }> {
    return Object.entries(zones)
      .map(([nom, count]) => ({ nom, count }))
      .sort((a, b) => b.count - a.count);
  }

  getPartenairesList(partenaires: { [key: string]: number }): Array<{ nom: string; count: number }> {
    return Object.entries(partenaires)
      .map(([nom, count]) => ({ nom, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }
}


