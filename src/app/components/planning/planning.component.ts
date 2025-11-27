import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanningGeneratorService } from '../../services/planning-generator.service';
import { DataService } from '../../services/data.service';
import { PlanningSemaine, PlanningEntry } from '../../models/planning.model';
import { JourSemaine, DemiJournee, JOURS_SEMAINE } from '../../models/agent.model';

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="card">
        <div class="card-header">
          <h2>📋 Planning de la Semaine</h2>
          <div class="header-actions">
            <input 
              type="date" 
              [(ngModel)]="dateDebutSemaine" 
              class="form-control date-input"
            />
            <button class="btn btn-primary" (click)="genererPlanning()">
              🎲 Générer Planning
            </button>
            <button 
              class="btn btn-secondary" 
              (click)="toggleZones()"
              *ngIf="planningActuel"
            >
              {{ afficherZones ? 'Masquer' : 'Afficher' }} Zones
            </button>
          </div>
        </div>

        <div *ngIf="planningActuel; else noPlanning" class="planning-container">
          <div class="planning-info">
            <p>
              <strong>Semaine du</strong> 
              {{ formatDate(planningActuel.dateDebut) }} 
              <strong>au</strong> 
              {{ formatDate(planningActuel.dateFin) }}
            </p>
            <p class="text-muted">
              Généré le {{ formatDate(planningActuel.dateGeneration) }}
            </p>
          </div>

          <div class="planning-table-wrapper">
            <table class="planning-table">
              <thead>
                <tr>
                  <th>Jour</th>
                  <th>Matin</th>
                  <th>Après-midi</th>
                  <th *ngIf="afficherZones">Zone</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let jour of JOURS_SEMAINE">
                  <td class="jour-cell">
                    <strong>{{ jour }}</strong>
                  </td>
                  <td class="groupe-cell" [class.trinome]="isTrinome(getEntryForDemiJournee(jour, DemiJournee.MATIN), DemiJournee.MATIN)">
                    <div *ngFor="let groupe of getGroupes(getEntryForDemiJournee(jour, DemiJournee.MATIN), DemiJournee.MATIN)" class="groupe">
                      <span class="groupe-nom">{{ getAgentsNames(groupe.agents) }}</span>
                      <span *ngIf="afficherZones && groupe.zone" class="groupe-zone">{{ groupe.zone }}</span>
                    </div>
                    <div *ngIf="getGroupes(getEntryForDemiJournee(jour, DemiJournee.MATIN), DemiJournee.MATIN).length === 0" class="empty-cell">
                      -
                    </div>
                  </td>
                  <td class="groupe-cell" [class.trinome]="isTrinome(getEntryForDemiJournee(jour, DemiJournee.APRES_MIDI), DemiJournee.APRES_MIDI)">
                    <div *ngFor="let groupe of getGroupes(getEntryForDemiJournee(jour, DemiJournee.APRES_MIDI), DemiJournee.APRES_MIDI)" class="groupe">
                      <span class="groupe-nom">{{ getAgentsNames(groupe.agents) }}</span>
                      <span *ngIf="afficherZones && groupe.zone" class="groupe-zone">{{ groupe.zone }}</span>
                    </div>
                    <div *ngIf="getGroupes(getEntryForDemiJournee(jour, DemiJournee.APRES_MIDI), DemiJournee.APRES_MIDI).length === 0" class="empty-cell">
                      -
                    </div>
                  </td>
                  <td *ngIf="afficherZones" class="zone-cell">
                    <input 
                      type="text" 
                      [value]="getZoneForJour(jour)"
                      (input)="updateZoneForJour(jour, $event)"
                      placeholder="Zone"
                      class="form-control zone-input"
                      *ngIf="getGroupes(getEntryForDemiJournee(jour, DemiJournee.MATIN), DemiJournee.MATIN).length > 0"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <ng-template #noPlanning>
          <div class="no-planning">
            <p>Aucun planning généré pour cette semaine.</p>
            <p>Cliquez sur "Générer Planning" pour créer un nouveau planning.</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .header-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    
    .date-input {
      width: 200px;
    }
    
    .planning-info {
      margin-bottom: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    
    .text-muted {
      color: #6c757d;
      font-size: 14px;
    }
    
    .planning-table-wrapper {
      overflow-x: auto;
    }
    
    .planning-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
    }
    
    .planning-table th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px;
      text-align: center;
      font-weight: 600;
    }
    
    .planning-table td {
      padding: 12px;
      border: 1px solid #e0e0e0;
      vertical-align: top;
    }
    
    .jour-cell {
      background: #f8f9fa;
      font-size: 16px;
      text-align: center;
      width: 120px;
    }
    
    .groupe-cell {
      min-width: 200px;
      min-height: 60px;
    }
    
    .groupe {
      padding: 8px;
      margin-bottom: 8px;
      background: #e3f2fd;
      border-radius: 6px;
      border-left: 4px solid #2196f3;
    }
    
    .groupe.trinome .groupe {
      background: #fff3e0;
      border-left-color: #ff9800;
    }
    
    .groupe-nom {
      display: block;
      font-weight: 600;
      color: #1976d2;
      margin-bottom: 4px;
    }
    
    .groupe-zone {
      display: block;
      font-size: 12px;
      color: #666;
    }
    
    .empty-cell {
      color: #999;
      font-style: italic;
      text-align: center;
      padding: 20px;
    }
    
    .zone-input {
      width: 100%;
      padding: 6px;
      font-size: 12px;
    }
    
    .no-planning {
      text-align: center;
      padding: 40px;
      color: #666;
    }
  `]
})
export class PlanningComponent {
  private planningGenerator = inject(PlanningGeneratorService);
  private dataService = inject(DataService);

  planningActuel = signal<PlanningSemaine | null>(null);
  dateDebutSemaine = this.getLundiSemaine(new Date()).toISOString().split('T')[0];
  afficherZones = false;

  readonly JOURS_SEMAINE = JOURS_SEMAINE;
  readonly DemiJournee = DemiJournee;

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

  getEntriesForJour(jour: JourSemaine): PlanningEntry[] {
    if (!this.planningActuel()) return [];
    return this.planningActuel()!.entries.filter(e => e.jour === jour);
  }

  getEntryForDemiJournee(jour: JourSemaine, demiJournee: DemiJournee): PlanningEntry | null {
    if (!this.planningActuel()) return null;
    return this.planningActuel()!.entries.find(e => e.jour === jour && e.demiJournee === demiJournee) || null;
  }

  getGroupes(entry: PlanningEntry | null, demiJournee: DemiJournee) {
    if (!entry || entry.demiJournee !== demiJournee) return [];
    return entry.groupes;
  }

  getRowspanForJour(jour: JourSemaine): number {
    // Always return 1 since we show one row per day with both morning and afternoon
    return 1;
  }

  isTrinome(entry: PlanningEntry | null, demiJournee: DemiJournee): boolean {
    if (!entry) return false;
    const groupes = this.getGroupes(entry, demiJournee);
    return groupes.some(g => g.agents.length === 3);
  }

  getAgentsNames(agents: { nom: string }[]): string {
    return agents.map(a => a.nom).join(', ');
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  toggleZones(): void {
    this.afficherZones = !this.afficherZones;
  }

  getZoneForJour(jour: JourSemaine): string {
    const entry = this.getEntryForDemiJournee(jour, DemiJournee.MATIN);
    if (!entry || entry.groupes.length === 0) return '';
    return entry.groupes[0].zone || '';
  }

  updateZoneForJour(jour: JourSemaine, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const entry = this.getEntryForDemiJournee(jour, DemiJournee.MATIN);
    if (entry && entry.groupes.length > 0) {
      entry.groupes[0].zone = value;
      // Save to historique if needed
      if (this.planningActuel()) {
        this.dataService.addPlanning(this.planningActuel()!);
      }
    }
  }

  private getLundiSemaine(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }
}

