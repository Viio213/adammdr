import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanningGeneratorService } from '../../services/planning-generator.service';
import { DataService } from '../../services/data.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { AuthService } from '../../services/auth.service';
import { PlanningSemaine, PlanningJour, Groupe } from '../../models/planning.model';
import { JourSemaine, DemiJournee, JOURS_TRAVAIL } from '../../models/agent.model';
import { ZONES } from '../../models/zone.model';

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="card">
        <div class="card-header">
          <h2>Planning de la Semaine</h2>
          <div class="header-actions">
            <input 
              *ngIf="canEdit"
              type="date" 
              [(ngModel)]="dateDebutSemaine" 
              class="date-input"
            />
            <button 
              *ngIf="canEdit"
              class="btn btn-primary" 
              (click)="genererPlanningHebdo()">
              Générer Planning Hebdo
            </button>
            <button 
              *ngIf="canEdit && planningActuel() && !planningActuel()!.isConfirmed"
              class="btn btn-success" 
              (click)="confirmerPlanning()">
              Confirmer le Planning
            </button>
            <button 
              class="btn btn-secondary" 
              (click)="exporterExcel()" 
              [disabled]="!planningActuel()">
              Export Excel
            </button>
          </div>
        </div>

        <div *ngIf="planningActuel(); else noPlanning" class="planning-container">
          <div class="planning-info">
            <span>Semaine du</span>
            <strong>{{ formatDateShort(planningActuel()!.dateDebut) }}</strong>
            <span>au</span>
            <strong>{{ formatDateShort(planningActuel()!.dateFin) }}</strong>
            <span *ngIf="planningActuel()!.isConfirmed" class="badge badge-success">
              Confirmé
            </span>
            <span *ngIf="!planningActuel()!.isConfirmed" class="badge badge-warning">
              Brouillon
            </span>
          </div>

          <div class="table-wrapper">
            <table class="planning-table">
              <thead>
                <tr>
                  <th class="th-jour">JOUR</th>
                  <th class="th-periode">Matin</th>
                  <th class="th-periode">Après-midi</th>
                  <th class="th-binomes">Binômes</th>
                  <th class="th-zones">Zones</th>
                  <th class="th-vehicule">Véhicule</th>
                  <th class="th-mission">Mission</th>
                  <th class="th-reunion">Réunion</th>
                  <th class="th-commentaires">Commentaires</th>
                </tr>
              </thead>
              <tbody>
                <ng-container *ngFor="let jourPlanning of planningActuel()!.jours">
                  <!-- Morning rows -->
                  <ng-container *ngFor="let groupe of jourPlanning.matin.groupes; let first = first; let i = index">
                    <tr class="row-groupe" [class.row-first]="first">
                      <!-- Day cell (rowspan for all morning+afternoon groups) -->
                      <td *ngIf="first" 
                          class="td-jour" 
                          [attr.rowspan]="getJourRowspan(jourPlanning)">
                        <div class="jour-content">
                          <span class="jour-nom">{{ jourPlanning.jour }}</span>
                          <span class="jour-date">{{ formatDateShort(jourPlanning.date) }}</span>
                          <button 
                            *ngIf="canEdit && !planningActuel()!.isConfirmed"
                            class="btn btn-sm btn-generate"
                            (click)="genererJour(jourPlanning.jour)">
                            Générer
                          </button>
                        </div>
                      </td>
                      
                      <!-- Matin indicator (rowspan for morning groups) -->
                      <td *ngIf="first" 
                          class="td-periode td-matin"
                          [attr.rowspan]="jourPlanning.matin.groupes.length || 1">
                        Matin
                      </td>
                      
                      <!-- Empty afternoon cell for morning rows -->
                      <td *ngIf="first" 
                          class="td-periode td-empty-periode"
                          [attr.rowspan]="jourPlanning.matin.groupes.length || 1">
                      </td>
                      
                      <!-- Binômes -->
                      <td class="td-binomes">
                        <div class="binome-names">{{ getGroupeNoms(groupe) }}</div>
                      </td>
                      
                      <!-- Zone -->
                      <td class="td-zones">
                        <select 
                          *ngIf="canEdit && !planningActuel()!.isConfirmed"
                          [(ngModel)]="groupe.zoneId" 
                          class="zone-select"
                          (change)="onZoneChange(groupe)">
                          <option value="">-</option>
                          <option *ngFor="let zone of zones" [value]="zone.id">
                            {{ zone.nom }}
                          </option>
                        </select>
                        <span *ngIf="!canEdit || planningActuel()!.isConfirmed" class="readonly-value">
                          {{ getZoneName(groupe.zoneId) }}
                        </span>
                      </td>
                      
                      <!-- Véhicule -->
                      <td class="td-vehicule">
                        <label class="checkbox-vehicule">
                          <input 
                            type="checkbox" 
                            [(ngModel)]="groupe.vehicule"
                            [disabled]="!canEdit || planningActuel()!.isConfirmed"
                          />
                          <span class="checkmark"></span>
                        </label>
                      </td>
                      
                      <!-- Mission -->
                      <td class="td-mission">
                        <input 
                          *ngIf="canEdit && !planningActuel()!.isConfirmed"
                          type="text" 
                          [(ngModel)]="groupe.mission" 
                          class="cell-input"
                          placeholder="Mission..."
                        />
                        <span *ngIf="!canEdit || planningActuel()!.isConfirmed" class="readonly-value">
                          {{ groupe.mission || '-' }}
                        </span>
                      </td>
                      
                      <!-- Réunion -->
                      <td class="td-reunion">
                        <input 
                          *ngIf="canEdit && !planningActuel()!.isConfirmed"
                          type="text" 
                          [(ngModel)]="groupe.reunion" 
                          class="cell-input"
                          placeholder="Réunion..."
                        />
                        <span *ngIf="!canEdit || planningActuel()!.isConfirmed" class="readonly-value">
                          {{ groupe.reunion || '-' }}
                        </span>
                      </td>
                      
                      <!-- Commentaires -->
                      <td class="td-commentaires">
                        <input 
                          *ngIf="canEdit && !planningActuel()!.isConfirmed"
                          type="text" 
                          [(ngModel)]="groupe.commentaires" 
                          class="cell-input"
                          placeholder="Commentaire..."
                        />
                        <span *ngIf="!canEdit || planningActuel()!.isConfirmed" class="readonly-value">
                          {{ groupe.commentaires || '-' }}
                        </span>
                      </td>
                    </tr>
                  </ng-container>
                  
                  <!-- Empty morning row if no groups -->
                  <tr *ngIf="jourPlanning.matin.groupes.length === 0" class="row-empty">
                    <td class="td-jour" [attr.rowspan]="getJourRowspan(jourPlanning)">
                      <div class="jour-content">
                        <span class="jour-nom">{{ jourPlanning.jour }}</span>
                        <span class="jour-date">{{ formatDateShort(jourPlanning.date) }}</span>
                        <button 
                          *ngIf="canEdit && !planningActuel()!.isConfirmed"
                          class="btn btn-sm btn-generate"
                          (click)="genererJour(jourPlanning.jour)">
                          Générer
                        </button>
                      </div>
                    </td>
                    <td class="td-periode td-matin">Matin</td>
                    <td class="td-periode td-empty-periode"></td>
                    <td colspan="6" class="td-no-groupe">Aucun binôme</td>
                  </tr>
                  
                  <!-- Afternoon rows -->
                  <ng-container *ngFor="let groupe of jourPlanning.apresMidi.groupes; let first = first">
                    <tr class="row-groupe row-aprem" [class.row-first]="first">
                      <!-- Matin empty for afternoon -->
                      <td *ngIf="first" 
                          class="td-periode td-empty-periode"
                          [attr.rowspan]="jourPlanning.apresMidi.groupes.length || 1">
                      </td>
                      
                      <!-- Après-midi indicator -->
                      <td *ngIf="first" 
                          class="td-periode td-aprem"
                          [attr.rowspan]="jourPlanning.apresMidi.groupes.length || 1">
                        Après-midi
                      </td>
                      
                      <!-- Binômes -->
                      <td class="td-binomes">
                        <div class="binome-names">{{ getGroupeNoms(groupe) }}</div>
                      </td>
                      
                      <!-- Zone -->
                      <td class="td-zones">
                        <select 
                          *ngIf="canEdit && !planningActuel()!.isConfirmed"
                          [(ngModel)]="groupe.zoneId" 
                          class="zone-select"
                          (change)="onZoneChange(groupe)">
                          <option value="">-</option>
                          <option *ngFor="let zone of zones" [value]="zone.id">
                            {{ zone.nom }}
                          </option>
                        </select>
                        <span *ngIf="!canEdit || planningActuel()!.isConfirmed" class="readonly-value">
                          {{ getZoneName(groupe.zoneId) }}
                        </span>
                      </td>
                      
                      <!-- Véhicule -->
                      <td class="td-vehicule">
                        <label class="checkbox-vehicule">
                          <input 
                            type="checkbox" 
                            [(ngModel)]="groupe.vehicule"
                            [disabled]="!canEdit || planningActuel()!.isConfirmed"
                          />
                          <span class="checkmark"></span>
                        </label>
                      </td>
                      
                      <!-- Mission -->
                      <td class="td-mission">
                        <input 
                          *ngIf="canEdit && !planningActuel()!.isConfirmed"
                          type="text" 
                          [(ngModel)]="groupe.mission" 
                          class="cell-input"
                        />
                        <span *ngIf="!canEdit || planningActuel()!.isConfirmed" class="readonly-value">
                          {{ groupe.mission || '-' }}
                        </span>
                      </td>
                      
                      <!-- Réunion -->
                      <td class="td-reunion">
                        <input 
                          *ngIf="canEdit && !planningActuel()!.isConfirmed"
                          type="text" 
                          [(ngModel)]="groupe.reunion" 
                          class="cell-input"
                        />
                        <span *ngIf="!canEdit || planningActuel()!.isConfirmed" class="readonly-value">
                          {{ groupe.reunion || '-' }}
                        </span>
                      </td>
                      
                      <!-- Commentaires -->
                      <td class="td-commentaires">
                        <input 
                          *ngIf="canEdit && !planningActuel()!.isConfirmed"
                          type="text" 
                          [(ngModel)]="groupe.commentaires" 
                          class="cell-input"
                        />
                        <span *ngIf="!canEdit || planningActuel()!.isConfirmed" class="readonly-value">
                          {{ groupe.commentaires || '-' }}
                        </span>
                      </td>
                    </tr>
                  </ng-container>
                  
                  <!-- Empty afternoon row if no groups -->
                  <tr *ngIf="jourPlanning.apresMidi.groupes.length === 0" class="row-empty row-aprem">
                    <td class="td-periode td-empty-periode"></td>
                    <td class="td-periode td-aprem">Après-midi</td>
                    <td colspan="6" class="td-no-groupe">Aucun binôme</td>
                  </tr>
                </ng-container>
              </tbody>
            </table>
          </div>
        </div>

        <ng-template #noPlanning>
          <div class="no-planning">
            <p>Aucun planning généré</p>
            <span>Sélectionnez une date et cliquez sur "Générer Planning Hebdo"</span>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 24px;
      max-width: 1600px;
      margin: 0 auto;
    }
    
    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      padding: 24px;
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .card-header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
    }
    
    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    
    .date-input {
      padding: 10px 14px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
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
      background: linear-gradient(135deg, #2d5016 0%, #3d6b1e 100%);
      color: #fff;
    }
    
    .btn-primary:hover { background: #1f3a0f; }
    
    .btn-success {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: #fff;
    }
    
    .btn-secondary {
      background: #64748b;
      color: #fff;
    }
    
    .btn-sm {
      padding: 6px 12px;
      font-size: 11px;
    }
    
    .btn-generate {
      background: #3b82f6;
      color: #fff;
      margin-top: 8px;
    }
    
    .btn-generate:hover { background: #2563eb; }
    
    .planning-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-size: 14px;
      color: #64748b;
    }
    
    .planning-info strong { color: #1e293b; }
    
    .badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 12px;
    }
    
    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }
    
    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }
    
    .table-wrapper {
      overflow-x: auto;
      border: 2px solid #2d5016;
      border-radius: 10px;
    }
    
    .planning-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    
    thead tr {
      background: #e2e8f0;
    }
    
    thead th {
      color: #000;
      padding: 14px 10px;
      text-align: center;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.5px;
      border-right: 1px solid #cbd5e1;
      border-bottom: 2px solid #94a3b8;
    }
    
    thead th:last-child { border-right: none; }
    
    .th-jour { width: 120px; }
    .th-periode { width: 80px; }
    .th-binomes { width: 120px; }
    .th-zones { width: 180px; }
    .th-vehicule { width: 70px; }
    .th-mission { min-width: 120px; }
    .th-reunion { min-width: 120px; }
    .th-commentaires { min-width: 150px; }
    
    .td-jour {
      background: linear-gradient(135deg, #8bc34a 0%, #9ccc65 100%);
      color: #1b3409;
      font-weight: 700;
      text-align: center;
      vertical-align: top;
      padding: 12px 8px;
      border-right: 2px solid #7cb342;
    }
    
    .jour-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center;
    }
    
    .jour-nom {
      font-size: 14px;
      font-weight: 700;
    }
    
    .jour-date {
      font-size: 11px;
      opacity: 0.8;
    }
    
    .td-periode {
      background: #c5e1a5;
      color: #33691e;
      font-weight: 600;
      padding: 10px 8px;
      text-align: center;
      font-size: 12px;
      border-right: 1px solid #aed581;
      border-bottom: 1px solid #aed581;
    }
    
    .td-matin { background: #dcedc8; }
    .td-aprem { background: #c5e1a5; }
    .td-empty-periode { background: #f5f5f5; border-right: 1px solid #e0e0e0; }
    
    .row-groupe td {
      padding: 8px 10px;
      border-right: 1px solid #e0e0e0;
      border-bottom: 1px solid #e0e0e0;
      vertical-align: middle;
      background: #fff;
    }
    
    .row-groupe:hover td:not(.td-jour):not(.td-periode) {
      background: #f8fafc;
    }
    
    .row-aprem td:not(.td-jour):not(.td-periode) {
      background: #fffde7;
    }
    
    .row-aprem:hover td:not(.td-jour):not(.td-periode) {
      background: #fff9c4;
    }
    
    .td-binomes {
      text-align: center;
    }
    
    .binome-names {
      font-weight: 600;
      color: #1e293b;
      line-height: 1.4;
    }
    
    .zone-select {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      font-size: 11px;
      background: #fff;
    }
    
    .zone-select:focus {
      outline: none;
      border-color: #3b82f6;
    }
    
    .td-vehicule {
      text-align: center;
    }
    
    .checkbox-vehicule {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    
    .checkbox-vehicule input {
      width: 20px;
      height: 20px;
      accent-color: #2d5016;
      cursor: pointer;
    }
    
    .cell-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      font-size: 12px;
      background: #fff;
    }
    
    .cell-input:focus {
      outline: none;
      border-color: #3b82f6;
      background: #f0f9ff;
    }
    
    .readonly-value {
      font-size: 12px;
      color: #475569;
    }
    
    .row-empty td {
      background: #fafafa;
    }
    
    .td-no-groupe {
      text-align: center;
      color: #94a3b8;
      font-style: italic;
      padding: 16px;
    }
    
    .no-planning {
      text-align: center;
      padding: 80px 20px;
      color: #64748b;
    }
    
    .no-planning p {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 500;
    }
    
    .no-planning span {
      font-size: 14px;
      color: #94a3b8;
    }
    
    @media (max-width: 768px) {
      .page-container { padding: 12px; }
      .card-header { flex-direction: column; align-items: stretch; }
      .header-actions { flex-direction: column; }
      .date-input, .btn { width: 100%; }
    }
  `]
})
export class PlanningComponent {
  private planningGenerator = inject(PlanningGeneratorService);
  private dataService = inject(DataService);
  private excelExport = inject(ExcelExportService);
  private authService = inject(AuthService);

  planningActuel = signal<PlanningSemaine | null>(null);
  dateDebutSemaine = this.getLundiSemaine(new Date()).toISOString().split('T')[0];
  
  zones = ZONES;
  canEdit = this.authService.hasPermission('canGeneratePlanning');

  constructor() {
    this.chargerPlanningActuel();
  }

  genererPlanningHebdo(): void {
    const dateDebut = new Date(this.dateDebutSemaine);
    const planning = this.planningGenerator.generatePlanningSemaine(dateDebut);
    
    this.dataService.addPlanning(planning);
    this.planningActuel.set(planning);
  }

  genererJour(jour: JourSemaine): void {
    const planning = this.planningActuel();
    if (!planning) return;

    const updatedPlanning = this.planningGenerator.regenerateJour(planning, jour);
    
    // Update in storage
    const plannings = this.dataService.getPlannings().map((p: PlanningSemaine) => 
      p.id === updatedPlanning.id ? updatedPlanning : p
    );
    this.dataService.plannings.set(plannings);
    
    this.planningActuel.set(updatedPlanning);
  }

  confirmerPlanning(): void {
    const planning = this.planningActuel();
    if (!planning || planning.isConfirmed) return;

    if (!confirm('Confirmer ce planning ? Il sera enregistré dans l\'historique et les statistiques.')) {
      return;
    }

    // Confirm and save to history
    this.dataService.confirmPlanning(planning);
    
    // Convert to historique entries
    const historiqueEntries = this.planningGenerator.planningToHistorique(planning);
    this.dataService.addHistoriqueEntries(historiqueEntries);

    // Reload
    this.planningActuel.set({ ...planning, isConfirmed: true, dateConfirmation: new Date() });
  }

  chargerPlanningActuel(): void {
    const planning = this.dataService.getPlanningActuel();
    if (planning) {
      this.planningActuel.set(planning);
      this.dateDebutSemaine = new Date(planning.dateDebut).toISOString().split('T')[0];
    }
  }

  getJourRowspan(jourPlanning: PlanningJour): number {
    const matinRows = Math.max(jourPlanning.matin.groupes.length, 1);
    const apremRows = Math.max(jourPlanning.apresMidi.groupes.length, 1);
    return matinRows + apremRows;
  }

  getGroupeNoms(groupe: Groupe): string {
    return groupe.agents.map(a => a.nom).join(' / ');
  }

  getZoneName(zoneId?: string): string {
    if (!zoneId) return '-';
    const zone = ZONES.find(z => z.id === zoneId);
    return zone ? zone.nom.replace('Zone ', 'Z') : '-';
  }

  onZoneChange(groupe: Groupe): void {
    // Auto-select first school from zone
    if (groupe.zoneId) {
      const zone = ZONES.find(z => z.id === groupe.zoneId);
      if (zone && zone.ecoles.length > 0) {
        groupe.ecoleId = zone.ecoles[0].id;
      }
    } else {
      groupe.ecoleId = undefined;
    }
  }

  exporterExcel(): void {
    const planning = this.planningActuel();
    if (planning) {
      this.excelExport.exportPlanningToExcel(planning);
    }
  }

  formatDateShort(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private getLundiSemaine(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }
}

