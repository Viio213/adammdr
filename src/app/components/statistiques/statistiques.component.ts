import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StatistiquesService } from '../../services/statistiques.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { DataService } from '../../services/data.service';
import { 
  StatistiqueBinome, 
  StatistiqueZone, 
  StatistiqueAgent,
  StatistiqueVehicule,
  StatistiqueExterieur,
  StatistiqueEcole,
  StatistiqueChargeTravail
} from '../../models/statistiques.model';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-statistiques',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <!-- Header with export buttons -->
      <div class="stats-header">
        <h1>Statistiques</h1>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="exporterPdf()">Export PDF</button>
          <button class="btn btn-info" (click)="imprimerPdf()">Imprimer</button>
          <button *ngIf="canArchive" class="btn btn-warning" (click)="ouvrirModalArchivage()">
            Archiver
          </button>
        </div>
      </div>

      <!-- Date range selector -->
      <div class="date-range-selector">
        <div class="date-range-controls">
          <label class="checkbox-label">
            <input type="checkbox" [(ngModel)]="voirTout" (change)="onVoirToutChange()" />
            <span>Voir tout</span>
          </label>
          <div class="date-inputs" *ngIf="!voirTout">
            <div class="date-input-group">
              <label>Du</label>
              <input type="date" [ngModel]="dateDebutStr" (ngModelChange)="onDateDebutChange($event)" />
            </div>
            <div class="date-input-group">
              <label>Au</label>
              <input type="date" [ngModel]="dateFinStr" (ngModelChange)="onDateFinChange($event)" />
            </div>
          </div>
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

      <!-- Statistiques Charge de Travail (Managers only) -->
      <div class="card" *ngIf="isManager()">
        <div class="card-header">
          <h2>Charge de travail par agent</h2>
        </div>
        <div class="stats-content">
          <p class="stats-description">
            Statistiques de présence et d'absence par agent, prenant en compte le contrat, les congés, les maladies et les récupérations
          </p>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Type de contrat</th>
                  <th>Jours disponibles</th>
                  <th>Jours travaillés</th>
                  <th>Congés</th>
                  <th>Maladie</th>
                  <th>Récup</th>
                  <th>% Présence</th>
                  <th>% Absence</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let stat of statistiquesChargeTravail()">
                  <td><strong>{{ stat.agentNom }}</strong></td>
                  <td>{{ stat.typeContrat }}</td>
                  <td>
                    <span class="badge badge-secondary">{{ stat.joursDisponiblesTotal }}</span>
                  </td>
                  <td>
                    <span class="badge badge-success">{{ stat.joursTravailTotal }}</span>
                  </td>
                  <td>
                    <span class="badge badge-info" *ngIf="stat.joursConges > 0">{{ stat.joursConges }}</span>
                    <span *ngIf="stat.joursConges === 0">-</span>
                  </td>
                  <td>
                    <span class="badge badge-danger" *ngIf="stat.joursMaladie > 0">{{ stat.joursMaladie }}</span>
                    <span *ngIf="stat.joursMaladie === 0">-</span>
                  </td>
                  <td>
                    <span class="badge badge-warning" *ngIf="stat.joursRecup > 0">{{ stat.joursRecup }}</span>
                    <span *ngIf="stat.joursRecup === 0">-</span>
                  </td>
                  <td>
                    <div class="progress-bar progress-green">
                      <div class="progress" [style.width.%]="stat.pourcentagePresence"></div>
                      <span class="progress-text">{{ stat.pourcentagePresence }}%</span>
                    </div>
                  </td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress progress-red" [style.width.%]="stat.pourcentageAbsence"></div>
                      <span class="progress-text">{{ stat.pourcentageAbsence }}%</span>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="statistiquesChargeTravail().length === 0">
                  <td colspan="9" class="text-center">Aucune statistique disponible</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Archivage -->
    <div class="modal" *ngIf="afficherModalArchivage" (click)="fermerModalArchivage($event)">
      <div class="modal-content modal-small" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Archiver l'historique</h3>
          <button class="btn-close" (click)="fermerModalArchivage()" title="Fermer">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-description">
            Toutes les entrées d'historique jusqu'à la date sélectionnée seront archivées et supprimées de la table principale.
          </p>
          <div class="form-group">
            <label class="form-label">Date de fin d'archivage *</label>
            <input 
              type="date" 
              [(ngModel)]="dateFinArchivageStr" 
              class="form-control"
              [max]="dateMaxArchivage"
            />
            <small class="form-hint">
              Les entrées jusqu'à cette date (inclusive) seront archivées
            </small>
          </div>
          <div class="error-message" *ngIf="archivageError">
            {{ archivageError }}
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" (click)="fermerModalArchivage()">
            Annuler
          </button>
          <button type="button" class="btn btn-warning" (click)="confirmerArchivage()" [disabled]="!dateFinArchivageStr || isArchiving">
            {{ isArchiving ? 'Archivage...' : 'Archiver' }}
          </button>
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

    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }

    .badge-danger {
      background: #fee2e2;
      color: #991b1b;
    }

    .badge-info {
      background: #dbeafe;
      color: #1e40af;
    }

    .progress-red {
      background: linear-gradient(90deg, #ef4444, #f87171) !important;
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

    .date-range-selector {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }

    .date-range-controls {
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #1e293b;
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #3b82f6;
      cursor: pointer;
    }

    .date-inputs {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .date-input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .date-input-group label {
      font-size: 13px;
      font-weight: 600;
      color: #475569;
    }

    .date-input-group input[type="date"] {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      color: #1e293b;
      cursor: pointer;
    }

    .date-input-group input[type="date"]:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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
      z-index: 9999;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    .modal-small {
      max-width: 400px;
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
      font-size: 20px;
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
      line-height: 1;
    }

    .btn-close:hover {
      background: #e2e8f0;
      color: #1e293b;
    }

    .modal-body {
      padding: 24px;
    }

    .modal-description {
      margin: 0 0 20px 0;
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 24px;
      border-top: 2px solid #e2e8f0;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #475569;
      font-size: 14px;
    }

    .form-control {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      color: #1e293b;
    }

    .form-control:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-hint {
      display: block;
      margin-top: 6px;
      color: #94a3b8;
      font-size: 12px;
    }

    .error-message {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
    }
  `]
})
export class StatistiquesComponent {
  private statistiquesService = inject(StatistiquesService);
  private pdfExport = inject(PdfExportService);
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private notification = inject(NotificationService);
  
  statistiquesChargeTravail = signal<StatistiqueChargeTravail[]>([]);

  // Date range for filtering statistics
  voirTout = true;
  dateDebut?: Date;
  dateFin?: Date;
  dateDebutStr?: string;
  dateFinStr?: string;

  // Archivage
  canArchive = this.authService.hasPermission('canEditHistorique');
  afficherModalArchivage = false;
  dateFinArchivageStr?: string;
  dateFinArchivage?: Date;
  archivageError = '';
  isArchiving = false;
  
  get dateMaxArchivage(): string {
    const today = new Date();
    today.setDate(today.getDate() - 1); // Yesterday max
    return today.toISOString().split('T')[0];
  }

  // Use computed to reactively recalculate statistics when historique changes or date range changes or date range changes
  statistiquesBinomes = computed(() => {
    if (this.voirTout) {
      return this.statistiquesService.getStatistiquesBinomes();
    }
    return this.statistiquesService.getStatistiquesBinomes(this.dateDebut, this.dateFin);
  });
  statistiquesZones = computed(() => {
    if (this.voirTout) {
      return this.statistiquesService.getStatistiquesZones();
    }
    return this.statistiquesService.getStatistiquesZones(this.dateDebut, this.dateFin);
  });
  statistiquesAgents = computed(() => {
    if (this.voirTout) {
      return this.statistiquesService.getStatistiquesAgents();
    }
    return this.statistiquesService.getStatistiquesAgents(this.dateDebut, this.dateFin);
  });
  statistiquesVehicules = computed(() => {
    if (this.voirTout) {
      return this.statistiquesService.getStatistiquesVehicules();
    }
    return this.statistiquesService.getStatistiquesVehicules(this.dateDebut, this.dateFin);
  });
  statistiquesExterieur = computed(() => {
    if (this.voirTout) {
      return this.statistiquesService.getStatistiquesExterieur();
    }
    return this.statistiquesService.getStatistiquesExterieur(this.dateDebut, this.dateFin);
  });
  statistiquesEcoles = computed(() => {
    if (this.voirTout) {
      return this.statistiquesService.getStatistiquesEcoles();
    }
    return this.statistiquesService.getStatistiquesEcoles(this.dateDebut, this.dateFin);
  });
  pairesPlusFrequentes = computed(() => {
    if (this.voirTout) {
      return this.statistiquesService.getPairesPlusFrequentes(10);
    }
    return this.statistiquesService.getPairesPlusFrequentes(10, this.dateDebut, this.dateFin);
  });

  constructor() {
    // Statistics will be recalculated automatically when historique changes
    this.chargerChargeTravail();
  }
  
  onVoirToutChange(): void {
    if (this.voirTout) {
      this.dateDebut = undefined;
      this.dateFin = undefined;
      this.dateDebutStr = undefined;
      this.dateFinStr = undefined;
    }
    this.chargerChargeTravail();
  }

  onDateDebutChange(value: string): void {
    this.dateDebutStr = value;
    this.dateDebut = value ? new Date(value) : undefined;
    this.chargerChargeTravail();
  }

  onDateFinChange(value: string): void {
    this.dateFinStr = value;
    this.dateFin = value ? new Date(value) : undefined;
    this.chargerChargeTravail();
  }
  
  async chargerChargeTravail(): Promise<void> {
    if (this.isManager()) {
      const stats = await this.statistiquesService.getStatistiquesChargeTravail(
        this.voirTout ? undefined : this.dateDebut,
        this.voirTout ? undefined : this.dateFin
      );
      this.statistiquesChargeTravail.set(stats);
    }
  }
  
  isManager(): boolean {
    return this.authService.hasPermission('canManageUsers') || 
           this.authService.hasPermission('canViewStaff');
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

  ouvrirModalArchivage(): void {
    if (!this.canArchive) return;
    this.afficherModalArchivage = true;
    this.archivageError = '';
    this.dateFinArchivageStr = undefined;
    this.dateFinArchivage = undefined;
  }

  fermerModalArchivage(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.afficherModalArchivage = false;
    this.archivageError = '';
    this.dateFinArchivageStr = undefined;
    this.dateFinArchivage = undefined;
  }

  async confirmerArchivage(): Promise<void> {
    if (!this.dateFinArchivageStr) {
      this.archivageError = 'Veuillez sélectionner une date de fin d\'archivage';
      return;
    }

    const dateFin = new Date(this.dateFinArchivageStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateFin >= today) {
      this.archivageError = 'La date de fin d\'archivage doit être antérieure à aujourd\'hui';
      return;
    }

    // Confirmation
    const confirmed = await this.notification.confirm({
      title: 'Confirmer l\'archivage',
      message: `Êtes-vous sûr de vouloir archiver toutes les entrées jusqu'au ${dateFin.toLocaleDateString('fr-FR')} ? Cette action est irréversible.`,
      type: 'warning'
    });

    if (!confirmed) return;

    this.isArchiving = true;
    this.archivageError = '';

    try {
      const count = await this.dataService.archiverHistorique(dateFin);
      await this.notification.alert({
        title: 'Archivage réussi',
        message: `${count} entrée(s) ont été archivée(s) avec succès.`,
        type: 'success'
      });
      this.fermerModalArchivage();
    } catch (error: any) {
      this.archivageError = error?.message || 'Une erreur est survenue lors de l\'archivage';
      console.error('Error archiving:', error);
    } finally {
      this.isArchiving = false;
    }
  }
}
