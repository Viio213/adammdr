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
          <h2>👥 Statistiques des Binômes</h2>
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
          <h2>📍 Statistiques des Zones</h2>
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
          <h2>👤 Statistiques par Agent</h2>
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
          <h2>📊 Analyse des Paires</h2>
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
      margin-bottom: 24px;
    }
    
    .stats-description {
      color: #666;
      margin-bottom: 16px;
      font-style: italic;
    }
    
    .table-wrapper {
      overflow-x: auto;
    }
    
    .agents-list,
    .zones-list,
    .partenaires-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    
    .agent-badge,
    .zone-badge,
    .partenaire-badge {
      display: inline-block;
      padding: 4px 8px;
      background: #e3f2fd;
      border-radius: 4px;
      font-size: 12px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }
    
    .stats-section h3 {
      margin-bottom: 16px;
      color: #555;
    }
    
    .stats-list {
      list-style: none;
      padding: 0;
    }
    
    .stats-list li {
      padding: 12px;
      margin-bottom: 8px;
      background: #f8f9fa;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .text-center {
      text-align: center;
      padding: 20px;
      color: #999;
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


