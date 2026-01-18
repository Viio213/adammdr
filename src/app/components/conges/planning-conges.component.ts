import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Conge, TypeConge, TYPE_CONGE_LABELS, StatutConge } from '../../models/conge.model';
import { Agent, JourSemaine, JOURS_TRAVAIL, DemiJournee } from '../../models/agent.model';

interface DemiJourneePlanning {
  demiJournee: 'MATIN' | 'APRES_MIDI';
  agentsDisponibles: Agent[];
  agentsEnConge: { agent: Agent; conge: Conge }[];
  nombreAgentsTravail: number;
  alerte: boolean; // true si moins de 4 agents
}

interface JourPlanningConge {
  date: Date;
  jourSemaine: JourSemaine;
  matin: DemiJourneePlanning;
  apresMidi: DemiJourneePlanning;
}

@Component({
  selector: 'app-planning-conges',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="card">
        <div class="card-header">
          <h2>Planning des Congés</h2>
          <div class="header-controls">
            <input 
              type="date" 
              [(ngModel)]="dateDebutSemaineString" 
              class="date-input"
              (change)="onDateChange()"
            />
            <button class="btn btn-secondary" (click)="semainePrecedente()">
              ← Semaine précédente
            </button>
            <button class="btn btn-secondary" (click)="semaineSuivante()">
              Semaine suivante →
            </button>
            <button class="btn btn-primary" (click)="aujourdhui()">
              Aujourd'hui
            </button>
          </div>
        </div>

        <div class="alert-summary" *ngIf="joursAlerte().length > 0">
          <div class="alert alert-warning">
            <strong>⚠️ Attention :</strong> 
            {{ joursAlerte().length }} demi-journée(s) avec moins de 4 agents disponibles
          </div>
        </div>

        <div class="planning-table-container">
          <table class="planning-table">
            <thead>
              <tr>
                <th class="th-date">Date</th>
                <th class="th-jour">Jour</th>
                <th class="th-demi-journee">Demi-journée</th>
                <th class="th-agents">Agents disponibles</th>
                <th class="th-conges">Agents en congé</th>
                <th class="th-statut">Statut</th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngFor="let jour of joursPlanning()">
                <!-- Matin -->
                <tr [class.alert-row]="jour.matin.alerte">
                  <td class="td-date" [attr.rowspan]="2">{{ formatDate(jour.date) }}</td>
                  <td class="td-jour" [attr.rowspan]="2">{{ getJourLabel(jour.jourSemaine) }}</td>
                  <td class="td-demi-journee">
                    <span class="demi-journee-label matin">Matin</span>
                  </td>
                  <td class="td-agents">
                    <div class="agents-list">
                      <span *ngFor="let agent of jour.matin.agentsDisponibles" class="badge badge-success">
                        {{ agent.nom }}
                      </span>
                      <span *ngIf="jour.matin.agentsDisponibles.length === 0" class="text-muted">
                        Aucun agent disponible
                      </span>
                    </div>
                    <div class="count-info">
                      <strong>{{ jour.matin.nombreAgentsTravail }} agent(s)</strong>
                    </div>
                  </td>
                  <td class="td-conges">
                    <div *ngFor="let item of jour.matin.agentsEnConge" class="conge-item">
                      <span class="agent-name">{{ item.agent.nom }}</span>
                      <span class="conge-type" [class]="getCongeTypeClass(item.conge.type)">
                        {{ getTypeCongeLabel(item.conge.type) }}
                      </span>
                      <span class="conge-statut" [class]="getStatutClass(item.conge.statut)">
                        {{ getStatutLabel(item.conge.statut) }}
                      </span>
                    </div>
                    <span *ngIf="jour.matin.agentsEnConge.length === 0" class="text-muted">
                      Aucun congé
                    </span>
                  </td>
                  <td class="td-statut">
                    <span *ngIf="jour.matin.alerte" class="badge badge-danger">
                      ⚠️ Alerte
                    </span>
                    <span *ngIf="!jour.matin.alerte" class="badge badge-success">
                      ✓ OK
                    </span>
                  </td>
                </tr>
                <!-- Après-midi -->
                <tr [class.alert-row]="jour.apresMidi.alerte">
                  <td class="td-demi-journee">
                    <span class="demi-journee-label apres-midi">Après-midi</span>
                  </td>
                  <td class="td-agents">
                    <div class="agents-list">
                      <span *ngFor="let agent of jour.apresMidi.agentsDisponibles" class="badge badge-success">
                        {{ agent.nom }}
                      </span>
                      <span *ngIf="jour.apresMidi.agentsDisponibles.length === 0" class="text-muted">
                        Aucun agent disponible
                      </span>
                    </div>
                    <div class="count-info">
                      <strong>{{ jour.apresMidi.nombreAgentsTravail }} agent(s)</strong>
                    </div>
                  </td>
                  <td class="td-conges">
                    <div *ngFor="let item of jour.apresMidi.agentsEnConge" class="conge-item">
                      <span class="agent-name">{{ item.agent.nom }}</span>
                      <span class="conge-type" [class]="getCongeTypeClass(item.conge.type)">
                        {{ getTypeCongeLabel(item.conge.type) }}
                      </span>
                      <span class="conge-statut" [class]="getStatutClass(item.conge.statut)">
                        {{ getStatutLabel(item.conge.statut) }}
                      </span>
                    </div>
                    <span *ngIf="jour.apresMidi.agentsEnConge.length === 0" class="text-muted">
                      Aucun congé
                    </span>
                  </td>
                  <td class="td-statut">
                    <span *ngIf="jour.apresMidi.alerte" class="badge badge-danger">
                      ⚠️ Alerte
                    </span>
                    <span *ngIf="!jour.apresMidi.alerte" class="badge badge-success">
                      ✓ OK
                    </span>
                  </td>
                </tr>
              </ng-container>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
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
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
    }

    .header-controls {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .date-input {
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
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
      background: #6366f1;
      color: #fff;
    }

    .btn-primary:hover {
      background: #4f46e5;
    }

    .btn-secondary {
      background: #e2e8f0;
      color: #475569;
    }

    .btn-secondary:hover {
      background: #cbd5e1;
    }

    .alert-summary {
      margin-bottom: 20px;
    }

    .alert {
      padding: 16px 20px;
      border-radius: 8px;
      border-left: 4px solid;
    }

    .alert-warning {
      background: #fef3c7;
      border-color: #f59e0b;
      color: #92400e;
    }

    .planning-table-container {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    .planning-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    thead {
      background: #1e293b;
    }

    thead th {
      color: #fff;
      padding: 14px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.3px;
    }

    tbody tr {
      border-bottom: 1px solid #e2e8f0;
      transition: background 0.2s;
    }

    tbody tr:hover {
      background: #f8fafc;
    }

    tbody tr.alert-row {
      background: #fef2f2;
    }

    tbody tr.alert-row:hover {
      background: #fee2e2;
    }

    tbody td {
      padding: 16px;
      vertical-align: top;
    }

    .th-date, .td-date {
      width: 120px;
    }

    .th-jour, .td-jour {
      width: 120px;
      font-weight: 600;
      color: #475569;
    }

    .th-demi-journee, .td-demi-journee {
      width: 140px;
    }

    .demi-journee-label {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
    }

    .demi-journee-label.matin {
      background: #fef3c7;
      color: #92400e;
    }

    .demi-journee-label.apres-midi {
      background: #dbeafe;
      color: #1e40af;
    }

    .th-agents, .td-agents {
      min-width: 200px;
    }

    .th-conges, .td-conges {
      min-width: 300px;
    }

    .th-statut, .td-statut {
      width: 100px;
      text-align: center;
    }

    .agents-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
    }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }

    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }

    .badge-danger {
      background: #fee2e2;
      color: #991b1b;
    }

    .count-info {
      margin-top: 8px;
      font-size: 13px;
      color: #64748b;
    }

    .conge-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      padding: 6px 10px;
      background: #f8fafc;
      border-radius: 6px;
      flex-wrap: wrap;
    }

    .agent-name {
      font-weight: 600;
      color: #1e293b;
    }

    .conge-type {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    .conge-type.annuel {
      background: #dbeafe;
      color: #1e40af;
    }

    .conge-type.maladie {
      background: #fee2e2;
      color: #991b1b;
    }

    .conge-type.heure {
      background: #fef3c7;
      color: #92400e;
    }

    .conge-type.recup {
      background: #d1fae5;
      color: #065f46;
    }

    .conge-statut {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }

    .conge-statut.en-attente {
      background: #fef3c7;
      color: #92400e;
    }

    .conge-statut.valide {
      background: #d1fae5;
      color: #065f46;
    }

    .conge-statut.refuse {
      background: #fee2e2;
      color: #991b1b;
    }

    .conge-duree {
      font-size: 11px;
      color: #64748b;
      font-style: italic;
    }

    .text-muted {
      color: #94a3b8;
      font-style: italic;
    }

    @media (max-width: 768px) {
      .card-header {
        flex-direction: column;
        align-items: stretch;
      }

      .header-controls {
        flex-direction: column;
      }

      .date-input, .btn {
        width: 100%;
      }
    }
  `]
})
export class PlanningCongesComponent {
  private dataService = inject(DataService);

  dateDebutSemaine = signal<Date>(this.getLundiSemaine(new Date()));
  dateDebutSemaineString = signal<string>(this.getLundiSemaine(new Date()).toISOString().split('T')[0]);
  conges = signal<Conge[]>([]);
  agents = signal<Agent[]>([]);

  readonly TypeConge = TypeConge;
  readonly TYPE_CONGE_LABELS = TYPE_CONGE_LABELS;
  readonly StatutConge = StatutConge;

  joursPlanning = computed<JourPlanningConge[]>(() => {
    const dateDebut = this.dateDebutSemaine();
    const jours: JourPlanningConge[] = [];
    const agents = this.agents();
    const conges = this.conges();

    // Generate days for the week (Monday to Friday)
    for (let i = 0; i < 5; i++) {
      const date = new Date(dateDebut);
      date.setDate(date.getDate() + i);
      
      const jourSemaine = this.getJourSemaine(date);
      
      // Calculate for morning
      const matin = this.calculerDemiJournee(agents, conges, jourSemaine, date, 'MATIN');
      
      // Calculate for afternoon
      const apresMidi = this.calculerDemiJournee(agents, conges, jourSemaine, date, 'APRES_MIDI');

      jours.push({
        date: new Date(date),
        jourSemaine,
        matin,
        apresMidi
      });
    }

    return jours;
  });

  private calculerDemiJournee(
    agents: Agent[],
    conges: Conge[],
    jourSemaine: JourSemaine,
    date: Date,
    demiJournee: 'MATIN' | 'APRES_MIDI'
  ): DemiJourneePlanning {
    const agentsEnConge: { agent: Agent; conge: Conge }[] = [];
    const agentsDisponibles: Agent[] = [];
    const demiJourneeEnum = demiJournee === 'MATIN' ? DemiJournee.MATIN : DemiJournee.APRES_MIDI;

    // Check each agent
    for (const agent of agents) {
      if (!agent.enService) continue;

      // Check if agent is available for this half-day
      const disponibilite = agent.disponibilites.find(
        d => d.jour === jourSemaine && d.demiJournee === demiJourneeEnum && d.disponible
      );

      if (!disponibilite) continue;

      // Check if agent is on leave (only validated leaves count)
      const conge = conges.find(c => {
        if (c.statut !== StatutConge.VALIDE) return false; // Only count validated leaves
        
        const debut = new Date(c.dateDebut);
        debut.setHours(0, 0, 0, 0);
        const fin = new Date(c.dateFin);
        fin.setHours(23, 59, 59, 999);
        const checkDate = new Date(date);
        checkDate.setHours(12, 0, 0, 0);

        if (checkDate < debut || checkDate > fin) return false;
        if (c.agentId !== agent.id) return false;
        
        // Check if the leave applies to this half-day
        if (c.demiJournee === 'JOURNEE') return true;
        if (c.demiJournee === demiJournee) return true;
        
        return false;
      });

      if (conge) {
        agentsEnConge.push({ agent, conge });
      } else {
        agentsDisponibles.push(agent);
      }
    }

    const nombreAgentsTravail = agentsDisponibles.length;
    const alerte = nombreAgentsTravail < 4;

    return {
      demiJournee,
      agentsDisponibles,
      agentsEnConge,
      nombreAgentsTravail,
      alerte
    };
  }

  joursAlerte = computed(() => {
    const alertes: { date: Date; demiJournee: string }[] = [];
    for (const jour of this.joursPlanning()) {
      if (jour.matin.alerte) {
        alertes.push({ date: jour.date, demiJournee: 'Matin' });
      }
      if (jour.apresMidi.alerte) {
        alertes.push({ date: jour.date, demiJournee: 'Après-midi' });
      }
    }
    return alertes;
  });

  constructor() {
    this.chargerDonnees();
  }

  async chargerDonnees(): Promise<void> {
    const agents = await this.dataService.refreshAgents();
    this.agents.set(agents);
    const conges = await this.dataService.refreshConges();
    this.conges.set(conges);
  }

  onDateChange(): void {
    const date = new Date(this.dateDebutSemaineString());
    const lundi = this.getLundiSemaine(date);
    this.dateDebutSemaine.set(lundi);
    this.dateDebutSemaineString.set(lundi.toISOString().split('T')[0]);
  }

  semainePrecedente(): void {
    const date = new Date(this.dateDebutSemaine());
    date.setDate(date.getDate() - 7);
    this.dateDebutSemaine.set(date);
    this.dateDebutSemaineString.set(date.toISOString().split('T')[0]);
  }

  semaineSuivante(): void {
    const date = new Date(this.dateDebutSemaine());
    date.setDate(date.getDate() + 7);
    this.dateDebutSemaine.set(date);
    this.dateDebutSemaineString.set(date.toISOString().split('T')[0]);
  }

  aujourdhui(): void {
    const date = this.getLundiSemaine(new Date());
    this.dateDebutSemaine.set(date);
    this.dateDebutSemaineString.set(date.toISOString().split('T')[0]);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getJourLabel(jour: JourSemaine): string {
    const labels: { [key in JourSemaine]: string } = {
      [JourSemaine.LUNDI]: 'Lundi',
      [JourSemaine.MARDI]: 'Mardi',
      [JourSemaine.MERCREDI]: 'Mercredi',
      [JourSemaine.JEUDI]: 'Jeudi',
      [JourSemaine.VENDREDI]: 'Vendredi',
      [JourSemaine.SAMEDI]: 'Samedi',
      [JourSemaine.DIMANCHE]: 'Dimanche'
    };
    return labels[jour] || jour;
  }

  getTypeCongeLabel(type: TypeConge): string {
    return TYPE_CONGE_LABELS[type] || type;
  }

  getCongeTypeClass(type: TypeConge): string {
    const classes: { [key in TypeConge]: string } = {
      [TypeConge.CONGE_ANNUEL]: 'annuel',
      [TypeConge.CONGE_MALADIE]: 'maladie',
      [TypeConge.HEURE_DITE]: 'heure',
      [TypeConge.RECUPERATION]: 'recup'
    };
    return classes[type] || '';
  }

  getStatutLabel(statut: StatutConge): string {
    switch (statut) {
      case StatutConge.EN_ATTENTE: return 'En attente';
      case StatutConge.VALIDE: return 'Validé';
      case StatutConge.REFUSE: return 'Refusé';
      default: return '';
    }
  }

  getStatutClass(statut: StatutConge): string {
    switch (statut) {
      case StatutConge.EN_ATTENTE: return 'en-attente';
      case StatutConge.VALIDE: return 'valide';
      case StatutConge.REFUSE: return 'refuse';
      default: return '';
    }
  }

  private getJourSemaine(date: Date): JourSemaine {
    const jours = [
      JourSemaine.DIMANCHE,
      JourSemaine.LUNDI,
      JourSemaine.MARDI,
      JourSemaine.MERCREDI,
      JourSemaine.JEUDI,
      JourSemaine.VENDREDI,
      JourSemaine.SAMEDI
    ];
    return jours[date.getDay()];
  }

  private getLundiSemaine(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }
}
