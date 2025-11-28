import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanningGeneratorService } from '../../services/planning-generator.service';
import { DataService } from '../../services/data.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { PlanningSemaine, Groupe } from '../../models/planning.model';
import { JourSemaine, DemiJournee } from '../../models/agent.model';

interface DisplayRow {
  type: 'jour' | 'demijournee' | 'groupe' | 'empty';
  jour: JourSemaine;
  demiJournee?: DemiJournee;
  groupe?: Groupe;
  showJour?: boolean;
  jourRowspan?: number;
}

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
              type="date" 
              [(ngModel)]="dateDebutSemaine" 
              class="date-input"
            />
            <button class="btn btn-primary" (click)="genererPlanning()">
              Générer Planning
            </button>
            <button 
              class="btn btn-success" 
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
          </div>

          <div class="table-wrapper">
            <table class="planning-table">
              <thead>
                <tr>
                  <th class="th-jour">JOUR</th>
                  <th class="th-binomes">Binômes</th>
                  <th class="th-zones">Zones</th>
                  <th class="th-ecole">Ecole</th>
                  <th class="th-mission">Mission</th>
                  <th class="th-commentaires">Commentaires</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of displayRows()" [ngClass]="getRowClass(row)">
                  <!-- Jour cell -->
                  <td *ngIf="row.showJour" 
                      class="td-jour" 
                      [attr.rowspan]="row.jourRowspan">
                    {{ row.jour }}
                  </td>
                  
                  <!-- Demi-journée header row -->
                  <ng-container *ngIf="row.type === 'demijournee'">
                    <td class="td-demijournee">{{ row.demiJournee === 'MATIN' ? 'Matin' : 'Après-midi' }}</td>
                    <td colspan="4" class="td-select-empty">
                      <select class="mini-select"><option>--</option></select>
                    </td>
                  </ng-container>
                  
                  <!-- Groupe row -->
                  <ng-container *ngIf="row.type === 'groupe' && row.groupe">
                    <td class="td-binomes">
                      <div class="agent-initials">{{ getAgentsInitiales(row.groupe.agents) }}</div>
                    </td>
                    <td class="td-zones">
                      <select [(ngModel)]="row.groupe.zone" class="zone-dropdown" [class.filled]="row.groupe.zone">
                        <option value="">Zone</option>
                        <option value="Zone 1">Zone 1</option>
                        <option value="Zone 2">Zone 2</option>
                        <option value="Zone 3">Zone 3</option>
                        <option value="Zone 4">Zone 4</option>
                      </select>
                    </td>
                    <td class="td-ecole">
                      <input type="text" [(ngModel)]="row.groupe.mission" class="cell-input small" />
                    </td>
                    <td class="td-mission">
                      <input type="text" [(ngModel)]="row.groupe.reunion" class="cell-input" />
                    </td>
                    <td class="td-commentaires">
                      <input type="text" [(ngModel)]="row.groupe.commentaires" class="cell-input" />
                    </td>
                  </ng-container>
                  
                  <!-- Empty row -->
                  <ng-container *ngIf="row.type === 'empty'">
                    <td class="td-empty" colspan="5">Aucun binôme</td>
                  </ng-container>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <ng-template #noPlanning>
          <div class="no-planning">
            <p>Aucun planning généré</p>
            <span>Sélectionnez une date et cliquez sur "Générer Planning"</span>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .card {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      padding: 24px;
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #eee;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .card-header h2 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #2d5016;
    }
    
    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    
    .date-input {
      padding: 10px 14px;
      border: 1px solid #ccc;
      border-radius: 6px;
      font-size: 14px;
    }
    
    .btn {
      padding: 10px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .btn-primary {
      background: #2d5016;
      color: #fff;
    }
    
    .btn-primary:hover {
      background: #1f3a0f;
    }
    
    .planning-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-size: 14px;
      color: #666;
    }
    
    .planning-info strong {
      color: #333;
    }
    
    /* Table */
    .table-wrapper {
      overflow-x: auto;
      border: 2px solid #2d5016;
      border-radius: 6px;
    }
    
    .planning-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    
    /* Header */
    thead tr {
      background: #2d5016;
    }
    
    thead th {
      color: #fff;
      padding: 14px 10px;
      text-align: center;
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.3px;
      border-right: 1px solid #3a6619;
    }
    
    thead th:last-child {
      border-right: none;
    }
    
    .th-jour { width: 100px; }
    .th-binomes { width: 90px; }
    .th-zones { width: 100px; }
    .th-ecole { width: 60px; }
    .th-mission { min-width: 180px; }
    .th-commentaires { min-width: 180px; }
    
    /* Jour cell */
    .td-jour {
      background: #8bc34a;
      color: #1b3409;
      font-weight: 700;
      font-size: 14px;
      text-align: center;
      vertical-align: middle;
      border-right: 2px solid #7cb342;
      padding: 12px 8px;
    }
    
    /* Demi-journée row */
    .row-demijournee {
      background: #dcedc8;
    }
    
    .td-demijournee {
      background: #c5e1a5;
      color: #33691e;
      font-weight: 600;
      padding: 10px 14px;
      font-size: 13px;
      border-right: 1px solid #aed581;
      border-bottom: 1px solid #aed581;
    }
    
    .td-select-empty {
      background: #dcedc8;
      padding: 8px;
      border-bottom: 1px solid #c5e1a5;
    }
    
    .mini-select {
      padding: 5px 10px;
      border: 1px solid #aed581;
      border-radius: 4px;
      background: #fff;
      font-size: 12px;
      color: #666;
    }
    
    /* Groupe row */
    .row-groupe {
      background: #fff;
    }
    
    .row-groupe:hover {
      background: #f5f5f5;
    }
    
    .row-groupe.trinome {
      background: #fffde7;
    }
    
    .row-groupe.trinome:hover {
      background: #fff9c4;
    }
    
    .row-groupe td {
      padding: 8px 10px;
      border-right: 1px solid #e0e0e0;
      border-bottom: 1px solid #e0e0e0;
      vertical-align: middle;
    }
    
    .row-groupe td:last-child {
      border-right: none;
    }
    
    /* Binomes */
    .td-binomes {
      text-align: center;
    }
    
    .agent-initials {
      font-weight: 600;
      color: #333;
      line-height: 1.5;
      white-space: pre-line;
    }
    
    /* Zone dropdown */
    .zone-dropdown {
      width: 100%;
      padding: 7px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #fafafa;
      font-size: 12px;
      color: #555;
      cursor: pointer;
    }
    
    .zone-dropdown.filled {
      background: #e3f2fd;
      border-color: #64b5f6;
      color: #1565c0;
      font-weight: 500;
    }
    
    .zone-dropdown:focus {
      outline: none;
      border-color: #42a5f5;
    }
    
    /* Input cells */
    .cell-input {
      width: 100%;
      padding: 7px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 12px;
      background: #fff;
    }
    
    .cell-input:focus {
      outline: none;
      border-color: #42a5f5;
      background: #e3f2fd;
    }
    
    .cell-input.small {
      width: 50px;
      text-align: center;
    }
    
    .td-ecole {
      text-align: center;
    }
    
    /* Empty row */
    .row-empty {
      background: #fafafa;
    }
    
    .td-empty {
      padding: 16px;
      text-align: center;
      color: #999;
      font-style: italic;
      border-bottom: 1px solid #e0e0e0;
    }
    
    /* No planning */
    .no-planning {
      text-align: center;
      padding: 80px 20px;
      color: #888;
    }
    
    .no-planning p {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 500;
    }
    
    .no-planning span {
      font-size: 14px;
      color: #aaa;
    }
    
    @media (max-width: 768px) {
      .page-container {
        padding: 12px;
      }
      
      .card-header {
        flex-direction: column;
        align-items: stretch;
      }
      
      .header-actions {
        flex-direction: column;
      }
      
      .date-input, .btn {
        width: 100%;
      }
    }
  `]
})
export class PlanningComponent {
  private planningGenerator = inject(PlanningGeneratorService);
  private dataService = inject(DataService);
  private excelExport = inject(ExcelExportService);

  planningActuel = signal<PlanningSemaine | null>(null);
  dateDebutSemaine = this.getLundiSemaine(new Date()).toISOString().split('T')[0];
  
  readonly joursActifs: JourSemaine[] = [
    JourSemaine.LUNDI,
    JourSemaine.MARDI,
    JourSemaine.MERCREDI,
    JourSemaine.JEUDI,
    JourSemaine.VENDREDI
  ];

  readonly DemiJournee = DemiJournee;

  displayRows = computed<DisplayRow[]>(() => {
    const planning = this.planningActuel();
    if (!planning) return [];

    const rows: DisplayRow[] = [];

    for (const jour of this.joursActifs) {
      const matinGroupes = this.getGroupesForDemiJournee(planning, jour, DemiJournee.MATIN);
      const apremGroupes = this.getGroupesForDemiJournee(planning, jour, DemiJournee.APRES_MIDI);
      
      const matinRows = Math.max(matinGroupes.length, 1);
      const apremRows = Math.max(apremGroupes.length, 1);
      const jourRowspan = 2 + matinRows + apremRows; // 2 demi-journee headers + groupe rows

      // Matin header
      rows.push({
        type: 'demijournee',
        jour,
        demiJournee: DemiJournee.MATIN,
        showJour: true,
        jourRowspan
      });

      // Matin groupes
      if (matinGroupes.length > 0) {
        matinGroupes.forEach(groupe => {
          rows.push({ type: 'groupe', jour, demiJournee: DemiJournee.MATIN, groupe });
        });
      } else {
        rows.push({ type: 'empty', jour, demiJournee: DemiJournee.MATIN });
      }

      // Après-midi header
      rows.push({
        type: 'demijournee',
        jour,
        demiJournee: DemiJournee.APRES_MIDI
      });

      // Après-midi groupes
      if (apremGroupes.length > 0) {
        apremGroupes.forEach(groupe => {
          rows.push({ type: 'groupe', jour, demiJournee: DemiJournee.APRES_MIDI, groupe });
        });
      } else {
        rows.push({ type: 'empty', jour, demiJournee: DemiJournee.APRES_MIDI });
      }
    }

    return rows;
  });

  constructor() {
    this.chargerPlanningActuel();
  }

  genererPlanning(): void {
    const dateDebut = new Date(this.dateDebutSemaine);
    const planning = this.planningGenerator.generatePlanningSemaine(dateDebut);
    
    this.dataService.addPlanning(planning);
    const historiqueEntries = this.planningGenerator.planningToHistorique(planning);
    this.dataService.addHistoriqueEntries(historiqueEntries);
    
    this.planningActuel.set(planning);
  }

  chargerPlanningActuel(): void {
    const planning = this.dataService.getPlanningActuel();
    if (planning) {
      this.planningActuel.set(planning);
      this.dateDebutSemaine = planning.dateDebut.toISOString().split('T')[0];
    }
  }

  exporterExcel(): void {
    const planning = this.planningActuel();
    if (planning) {
      this.excelExport.exportPlanningToExcel(planning);
    }
  }

  private getGroupesForDemiJournee(planning: PlanningSemaine, jour: JourSemaine, demiJournee: DemiJournee): Groupe[] {
    const entry = planning.entries.find(e => e.jour === jour && e.demiJournee === demiJournee);
    return entry?.groupes || [];
  }

  getRowClass(row: DisplayRow): string {
    if (row.type === 'demijournee') return 'row-demijournee';
    if (row.type === 'empty') return 'row-empty';
    if (row.type === 'groupe') {
      const isTrinome = row.groupe && row.groupe.agents.length === 3;
      return isTrinome ? 'row-groupe trinome' : 'row-groupe';
    }
    return '';
  }

  getAgentsInitiales(agents: { nom: string }[]): string {
    return agents.map(a => {
      const parts = a.nom.trim().split(' ');
      if (parts.length >= 2) {
        return parts[0].charAt(0).toUpperCase() + parts[1].charAt(0).toUpperCase();
      }
      return a.nom.substring(0, 2).toUpperCase();
    }).join('\n');
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
