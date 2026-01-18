import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanningGeneratorService } from '../../services/planning-generator.service';
import { DataService } from '../../services/data.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { AuthService } from '../../services/auth.service';
import { StatistiquesService } from '../../services/statistiques.service';
import { PlanningSemaine, PlanningJour, Groupe } from '../../models/planning.model';
import { Agent, JourSemaine, DemiJournee, JOURS_TRAVAIL } from '../../models/agent.model';
import { HistoriqueEntry } from '../../models/historique.model';
import { ZONES } from '../../models/zone.model';
import { NotificationService } from '../../services/notification.service';

// Types of conflicts that can occur
export interface ConflitGroupe {
  type: 'AGENT_OCCUPE' | 'MEME_BINOME_JOURNEE' | 'MEME_ZONE_JOURNEE';
  description: string;
  agentsConcernes?: string[];
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
            <div class="view-toggle">
              <button 
                class="btn btn-sm" 
                [class.btn-active]="vueMode === 'semaine'"
                (click)="vueMode = 'semaine'">
                Vue Semaine
              </button>
              <button 
                class="btn btn-sm" 
                [class.btn-active]="vueMode === 'mois'"
                (click)="vueMode = 'mois'; chargerVueMensuelle()">
                Vue Mensuelle
              </button>
            </div>
            <input 
              *ngIf="vueMode === 'semaine'"
              type="date" 
              [(ngModel)]="dateDebutSemaine" 
              class="date-input"
              (change)="onDateChange()"
              title="Sélectionnez une date pour charger le planning de la semaine correspondante"
            />
            <input 
              *ngIf="vueMode === 'mois'"
              type="month" 
              [(ngModel)]="moisSelectionne" 
              class="date-input"
              (change)="chargerVueMensuelle()"
            />
            <button 
              *ngIf="canEdit && vueMode === 'semaine'"
              class="btn btn-primary" 
              (click)="genererPlanningHebdo()">
              Générer Planning Hebdo
            </button>
            <button 
              *ngIf="canEdit && vueMode === 'semaine'"
              class="btn btn-primary" 
              (click)="ouvrirModalGenerationMultiple()">
              Générer plusieurs plannings
            </button>
            <button 
              class="btn btn-secondary" 
              (click)="ouvrirModalExport()">
              Exporter
            </button>
            <button 
              class="btn btn-info" 
              (click)="imprimerPdf()" 
              [disabled]="!planningActuel()">
              Imprimer
            </button>
          </div>
        </div>

        <!-- Vue Mensuelle -->
        <div *ngIf="vueMode === 'mois'" class="vue-mensuelle-container">
          <div class="mois-header">
            <h3>{{ getMoisLabel() }}</h3>
            <p class="mois-info">{{ planningsMois().length }} planning(s) trouvé(s)</p>
          </div>
          <div class="plannings-grid" *ngIf="planningsMois().length > 0; else noPlanningsMois">
            <div 
              *ngFor="let planning of planningsMois()" 
              class="planning-card"
              [class.confirmed]="planning.isConfirmed"
              (click)="selectionnerPlanning(planning)">
              <div class="planning-card-header">
                <span class="planning-week">Semaine du {{ formatDateShort(planning.dateDebut) }}</span>
                <span class="planning-badge" [class.badge-success]="planning.isConfirmed" [class.badge-warning]="!planning.isConfirmed">
                  {{ planning.isConfirmed ? 'Confirmé' : 'Brouillon' }}
                </span>
              </div>
              <div class="planning-card-body">
                <p class="planning-dates">{{ formatDateShort(planning.dateDebut) }} - {{ formatDateShort(planning.dateFin) }}</p>
                <p class="planning-info">Généré le {{ formatDateLong(planning.dateGeneration) }}</p>
              </div>
            </div>
          </div>
          <ng-template #noPlanningsMois>
            <div class="no-planning">
              <p>Aucun planning pour ce mois</p>
            </div>
          </ng-template>
        </div>

        <!-- Vue Semaine -->
        <div *ngIf="vueMode === 'semaine' && planningActuel(); else noPlanning" class="planning-container">
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
                  <th class="th-zones">Zone</th>
                  <th class="th-ecole">École</th>
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
                        <div class="binome-cell">
                          <span 
                            *ngIf="hasGroupeConflitsMatin(groupe, jourPlanning)"
                            class="conflict-indicator"
                            [title]="getGroupeConflitsTooltipMatin(groupe, jourPlanning)">
                          </span>
                          <div class="binome-names">{{ getGroupeNoms(groupe) }}</div>
                          <button 
                            *ngIf="canEdit && !planningActuel()!.isConfirmed"
                            class="btn-edit-binome"
                            (click)="ouvrirModalBinome(groupe, jourPlanning.date, 'MATIN')"
                            title="Modifier les agents">
                            ✎
                          </button>
                        </div>
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
                      
                      <!-- École -->
                      <td class="td-ecole">
                        <select 
                          *ngIf="canEdit && !planningActuel()!.isConfirmed && groupe.zoneId"
                          [(ngModel)]="groupe.ecoleId" 
                          class="ecole-select"
                          (change)="sauvegarderPlanning()">
                          <option value="">-</option>
                          <option *ngFor="let ecole of getEcolesForZone(groupe.zoneId)" [value]="ecole.id">
                            {{ ecole.nom }}
                          </option>
                        </select>
                        <span *ngIf="!canEdit || planningActuel()!.isConfirmed" class="readonly-value">
                          {{ getEcoleName(groupe.ecoleId) }}
                        </span>
                        <span *ngIf="canEdit && !planningActuel()!.isConfirmed && !groupe.zoneId" class="readonly-value">-</span>
                      </td>
                      
                      <!-- Véhicule -->
                      <td class="td-vehicule">
                        <label class="checkbox-vehicule">
                          <input 
                            type="checkbox" 
                            [(ngModel)]="groupe.vehicule"
                            [disabled]="!canEdit || planningActuel()!.isConfirmed"
                            (change)="sauvegarderPlanning()"
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
                          (blur)="sauvegarderPlanning()"
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
                          (blur)="sauvegarderPlanning()"
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
                          (blur)="sauvegarderPlanning()"
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
                    <td colspan="7" class="td-no-groupe">Aucun binôme</td>
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
                        <div class="binome-cell">
                          <span 
                            *ngIf="hasGroupeConflitsApresMidi(groupe, jourPlanning)"
                            class="conflict-indicator"
                            [title]="getGroupeConflitsTooltipApresMidi(groupe, jourPlanning)">
                          </span>
                          <div class="binome-names">{{ getGroupeNoms(groupe) }}</div>
                          <button 
                            *ngIf="canEdit && !planningActuel()!.isConfirmed"
                            class="btn-edit-binome"
                            (click)="ouvrirModalBinome(groupe, jourPlanning.date, 'APRES_MIDI')"
                            title="Modifier les agents">
                            ✎
                          </button>
                        </div>
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
                      
                      <!-- École -->
                      <td class="td-ecole">
                        <select 
                          *ngIf="canEdit && !planningActuel()!.isConfirmed && groupe.zoneId"
                          [(ngModel)]="groupe.ecoleId" 
                          class="ecole-select"
                          (change)="sauvegarderPlanning()">
                          <option value="">-</option>
                          <option *ngFor="let ecole of getEcolesForZone(groupe.zoneId)" [value]="ecole.id">
                            {{ ecole.nom }}
                          </option>
                        </select>
                        <span *ngIf="!canEdit || planningActuel()!.isConfirmed" class="readonly-value">
                          {{ getEcoleName(groupe.ecoleId) }}
                        </span>
                        <span *ngIf="canEdit && !planningActuel()!.isConfirmed && !groupe.zoneId" class="readonly-value">-</span>
                      </td>
                      
                      <!-- Véhicule -->
                      <td class="td-vehicule">
                        <label class="checkbox-vehicule">
                          <input 
                            type="checkbox" 
                            [(ngModel)]="groupe.vehicule"
                            [disabled]="!canEdit || planningActuel()!.isConfirmed"
                            (change)="sauvegarderPlanning()"
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
                          (blur)="sauvegarderPlanning()"
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
                          (blur)="sauvegarderPlanning()"
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
                          (blur)="sauvegarderPlanning()"
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
                    <td colspan="7" class="td-no-groupe">Aucun binôme</td>
                  </tr>
                </ng-container>
              </tbody>
            </table>
          </div>
        </div>

        <ng-template #noPlanning>
          <div class="no-planning" *ngIf="vueMode === 'semaine'">
            <p>Aucun planning généré</p>
            <span>Sélectionnez une date et cliquez sur "Générer Planning Hebdo"</span>
          </div>
        </ng-template>
      </div>
    </div>

    <!-- Modal pour modifier les binômes -->
    <div class="modal-overlay" *ngIf="showBinomeModal" (click)="fermerModalBinome($event)">
      <div class="modal-binome" (click)="$event.stopPropagation()">
        <div class="modal-binome-header">
          <h3>Modifier le groupe</h3>
          <button class="btn-close" (click)="fermerModalBinome()">Fermer</button>
        </div>
        <div class="modal-binome-content">
          <p class="modal-info">Sélectionnez les agents pour ce groupe (2-3 agents) :</p>
          <div class="agents-list">
            <label 
              *ngFor="let agent of agentsDisponibles()" 
              class="agent-checkbox"
              [class.selected]="isAgentSelected(agent.id)"
              [class.has-conflict]="hasAgentConflits(agent.id) && isAgentSelected(agent.id)">
              <input 
                type="checkbox" 
                [checked]="isAgentSelected(agent.id)"
                (change)="toggleAgent(agent)"
              />
              <span class="agent-name">{{ agent.nom }}</span>
              <span 
                *ngIf="hasAgentConflits(agent.id)" 
                class="conflict-warning"
                [title]="getAgentConflitsTooltip(agent.id)">
              </span>
              <span *ngIf="!isAgentAvailable(agent.id)" class="agent-occupied">(dans autre groupe)</span>
            </label>
          </div>
          <p *ngIf="selectedAgents.length < 2" class="warning-text">
            Veuillez sélectionner au moins 2 agents
          </p>
          <div class="conflict-legend" *ngIf="hasAnySelectedAgentConflict()">
            <span class="legend-item">
              <span class="conflict-warning"></span>
              <span>Conflit détecté (survol pour détails)</span>
            </span>
          </div>
        </div>
        <div class="modal-binome-footer">
          <button class="btn btn-secondary" (click)="fermerModalBinome()">Annuler</button>
          <button 
            class="btn btn-primary" 
            [disabled]="selectedAgents.length < 2"
            (click)="sauvegarderBinome()">
            Enregistrer
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Export -->
    <div class="modal-overlay" *ngIf="showModalExport" (click)="fermerModalExport($event)">
      <div class="modal-content modal-export" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Exporter des plannings</h3>
          <button class="btn-close" (click)="fermerModalExport()">Fermer</button>
        </div>
        <div class="modal-body">
          <p class="modal-description">
            Sélectionnez les plannings que vous souhaitez exporter. Seuls les plannings futurs (générés ou brouillons) sont affichés.
          </p>
          <div class="plannings-list">
            <div class="plannings-header">
              <label class="checkbox-select-all">
                <input 
                  type="checkbox" 
                  [checked]="tousPlanningsSelectionnes()"
                  (change)="toggleSelectionTous($event)"
                />
                <span>Tout sélectionner</span>
              </label>
              <span class="plannings-count">{{ planningsSelectionnables().length }} planning(s) disponible(s)</span>
            </div>
            <div class="plannings-items">
              <div *ngFor="let planning of planningsSelectionnables()" class="planning-item">
                <label class="checkbox-item">
                  <input 
                    type="checkbox" 
                    [checked]="isPlanningSelectionne(planning.id)"
                    (change)="toggleSelectionPlanning(planning.id, $event)"
                  />
                  <div class="planning-info">
                    <div class="planning-dates">
                      <strong>{{ formatDateRange(planning.dateDebut, planning.dateFin) }}</strong>
                    </div>
                    <div class="planning-status">
                      <span [class]="'badge ' + (planning.isConfirmed ? 'badge-success' : 'badge-warning')">
                        {{ planning.isConfirmed ? 'Confirmé' : 'Brouillon' }}
                      </span>
                      <span class="planning-date-gen">
                        Généré le {{ formatDate(planning.dateGeneration) }}
                      </span>
                    </div>
                  </div>
                </label>
              </div>
              <div *ngIf="planningsSelectionnables().length === 0" class="no-plannings">
                Aucun planning futur disponible
              </div>
            </div>
          </div>
          <div class="export-actions">
            <button 
              class="btn btn-secondary" 
              (click)="exporterSelectionExcel()"
              [disabled]="planningsSelectionnes().length === 0">
              Exporter en Excel ({{ planningsSelectionnes().length }})
            </button>
            <button 
              class="btn btn-primary" 
              (click)="exporterSelectionPdf()"
              [disabled]="planningsSelectionnes().length === 0">
              Exporter en PDF ({{ planningsSelectionnes().length }})
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Génération Multiple -->
    <div class="modal-overlay" *ngIf="showModalGenerationMultiple" (click)="fermerModalGenerationMultiple($event)">
      <div class="modal-content modal-generation-multiple" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Générer plusieurs plannings</h3>
          <button class="btn-close" (click)="fermerModalGenerationMultiple()">Fermer</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Date de début (premier lundi)</label>
            <input 
              type="date" 
              [(ngModel)]="dateDebutGeneration" 
              class="form-control"
              [min]="dateMinGeneration"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Date de fin (dernier lundi)</label>
            <input 
              type="date" 
              [(ngModel)]="dateFinGeneration" 
              class="form-control"
              [min]="dateDebutGeneration"
            />
          </div>
          <div class="info-box">
            <p><strong>Information :</strong></p>
            <p>Les plannings seront générés pour chaque semaine (du lundi au vendredi) entre les dates sélectionnées.</p>
            <p *ngIf="nombreSemainesAGenerer() > 0" class="semaines-count">
              <strong>{{ nombreSemainesAGenerer() }} semaine(s)</strong> seront générées.
            </p>
          </div>
          <div *ngIf="isGeneratingMultiple" class="progress-container">
            <div class="progress-info">
              <p>Génération en cours... {{ semaineEnCours }}/{{ totalSemaines }}</p>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="(semaineEnCours / totalSemaines) * 100"></div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button 
            class="btn btn-secondary" 
            (click)="fermerModalGenerationMultiple()"
            [disabled]="isGeneratingMultiple">
            Annuler
          </button>
          <button 
            class="btn btn-primary" 
            (click)="genererPlanningsMultiple()"
            [disabled]="!dateDebutGeneration || !dateFinGeneration || isGeneratingMultiple || nombreSemainesAGenerer() === 0">
            Générer
          </button>
        </div>
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
      background: linear-gradient(135deg, #4a6fa5 0%, #5b9bd5 100%);
      color: #fff;
    }
    
    .btn-primary:hover { background: #3d5a87; }
    
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
    
    .btn-info {
      background: #0ea5e9;
      color: #fff;
    }
    
    .btn-info:hover { background: #0284c7; }
    
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
      border: 2px solid #4a6fa5;
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
    .th-zones { width: 160px; }
    .th-ecole { width: 80px; }
    .th-vehicule { width: 70px; }
    .th-mission { min-width: 100px; }
    .th-reunion { min-width: 100px; }
    .th-commentaires { min-width: 120px; }
    
    .td-jour {
      background: linear-gradient(135deg, #7da0d4 0%, #9db8e3 100%);
      color: #1e3a5f;
      font-weight: 700;
      text-align: center;
      vertical-align: top;
      padding: 12px 8px;
      border-right: 2px solid #5b9bd5;
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
      background: #b8d0ed;
      color: #3d5a87;
      font-weight: 600;
      padding: 10px 8px;
      text-align: center;
      font-size: 12px;
      border-right: 1px solid #9db8e3;
      border-bottom: 1px solid #9db8e3;
    }
    
    .td-matin { background: #e8f1fb; }
    .td-aprem { background: #d4e4f7; }
    .td-empty-periode { background: #f5f5f5; border-right: 1px solid #e0e0e0; }
    
    .row-groupe td {
      padding: 8px 10px;
      border-right: 1px solid #e0e0e0;
      border-bottom: 1px solid #e0e0e0;
      vertical-align: middle;
      background: #fff;
    }
    
    /* Make day separations more visible - only between days, not between morning and afternoon */
    /* Apply thick border only to first morning row of each day (except first day), exclude afternoon rows */
    tbody tr.row-first:not(:first-of-type):not(.row-aprem) td {
      border-top: 4px solid #64748b;
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
    
    .binome-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    
    .binome-names {
      font-weight: 600;
      color: #1e293b;
      line-height: 1.4;
    }

    .conflict-indicator {
      font-size: 14px;
      cursor: help;
      animation: pulse-warning 2s infinite;
    }

    @keyframes pulse-warning {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    
    .btn-edit-binome {
      background: #e2e8f0;
      border: none;
      border-radius: 4px;
      width: 24px;
      height: 24px;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    
    .btn-edit-binome:hover {
      background: #3b82f6;
      color: #fff;
    }
    
    .zone-select, .ecole-select {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      font-size: 11px;
      background: #fff;
    }
    
    .zone-select:focus, .ecole-select:focus {
      outline: none;
      border-color: #3b82f6;
    }
    
    .td-ecole {
      text-align: center;
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
      accent-color: #4a6fa5;
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

    /* Modal Binômes */
    .modal-overlay {
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
      z-index: 2000;
      padding: 20px;
    }

    .modal-binome {
      background: white;
      border-radius: 16px;
      max-width: 450px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .modal-binome-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 2px solid #e2e8f0;
    }

    .modal-binome-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
    }

    .btn-close {
      background: #f1f5f9;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #64748b;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-close:hover {
      background: #e2e8f0;
    }

    .modal-binome-content {
      padding: 24px;
    }

    .modal-info {
      margin: 0 0 16px 0;
      color: #64748b;
      font-size: 14px;
    }

    .agents-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 300px;
      overflow-y: auto;
    }

    .agent-checkbox {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #f8fafc;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
    }

    .agent-checkbox:hover:not(.disabled) {
      background: #f1f5f9;
    }

    .agent-checkbox.selected {
      background: #ecfdf5;
      border-color: #10b981;
    }

    .agent-checkbox.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .agent-checkbox input {
      width: 18px;
      height: 18px;
      accent-color: #10b981;
    }

    .agent-name {
      font-weight: 600;
      color: #1e293b;
      flex: 1;
    }

    .agent-busy {
      font-size: 11px;
      color: #f59e0b;
      font-style: italic;
    }

    .agent-occupied {
      font-size: 11px;
      color: #64748b;
      font-style: italic;
    }

    .agent-checkbox.has-conflict {
      background: #fffbeb;
      border-color: #f59e0b;
    }

    .conflict-warning {
      font-size: 14px;
      cursor: help;
    }

    .conflict-legend {
      margin-top: 16px;
      padding: 12px;
      background: #fffbeb;
      border-radius: 8px;
      border: 1px solid #fde68a;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #92400e;
    }

    .warning-text {
      margin: 12px 0 0 0;
      color: #f59e0b;
      font-size: 13px;
      font-style: italic;
    }

    .modal-binome-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      border-radius: 0 0 16px 16px;
    }

    /* Modal Export */
    .modal-export {
      max-width: 700px;
      max-height: 90vh;
    }

    .modal-description {
      color: #64748b;
      margin: 0 0 20px 0;
      font-size: 14px;
      line-height: 1.6;
    }

    .plannings-list {
      margin: 20px 0;
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
    }

    .plannings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      margin-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
    }

    .checkbox-select-all {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #1e293b;
      cursor: pointer;
    }

    .checkbox-select-all input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #3b82f6;
      cursor: pointer;
    }

    .plannings-count {
      font-size: 13px;
      color: #64748b;
    }

    .plannings-items {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .planning-item {
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      transition: all 0.2s;
    }

    .planning-item:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      width: 100%;
    }

    .checkbox-item input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #3b82f6;
      cursor: pointer;
      flex-shrink: 0;
    }

    .planning-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .planning-dates {
      font-size: 14px;
      color: #1e293b;
    }

    .planning-status {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
    }

    .planning-date-gen {
      color: #64748b;
    }

    .badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }

    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }

    .no-plannings {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
      font-size: 14px;
    }

    .export-actions {
      display: flex;
      gap: 12px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
    }

    .export-actions .btn {
      flex: 1;
    }

    .export-actions .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Modal Génération Multiple */
    .modal-content {
      background: white;
      border-radius: 16px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .modal-generation-multiple {
      max-width: 500px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 2px solid #e2e8f0;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
    }

    .modal-body {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #1e293b;
      font-size: 14px;
    }

    .form-control {
      width: 100%;
      padding: 10px 12px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    .form-control:focus {
      outline: none;
      border-color: #3b82f6;
    }

    .info-box {
      background: #f1f5f9;
      border-left: 4px solid #3b82f6;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .info-box p {
      margin: 8px 0;
      font-size: 14px;
      color: #475569;
    }

    .info-box p:first-child {
      margin-top: 0;
    }

    .info-box p:last-child {
      margin-bottom: 0;
    }

    .semaines-count {
      color: #1e293b !important;
      font-weight: 600;
    }

    .progress-container {
      margin-top: 20px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
    }

    .progress-info {
      margin-bottom: 12px;
      font-size: 14px;
      color: #475569;
      font-weight: 500;
    }

    .progress-info p {
      margin: 0;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #2563eb);
      transition: width 0.3s ease;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px;
      border-top: 2px solid #e2e8f0;
    }

    .modal-footer .btn {
      min-width: 100px;
    }

    .modal-footer .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Vue Mensuelle */
    .view-toggle {
      display: flex;
      gap: 4px;
      margin-right: 12px;
    }

    .view-toggle .btn {
      padding: 8px 16px;
      font-size: 13px;
      background: #e2e8f0;
      color: #475569;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .view-toggle .btn:hover {
      background: #cbd5e1;
    }

    .view-toggle .btn-active {
      background: linear-gradient(135deg, #4a6fa5 0%, #5b9bd5 100%);
      color: #fff;
    }

    .vue-mensuelle-container {
      padding: 20px 0;
    }

    .mois-header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e2e8f0;
    }

    .mois-header h3 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
      text-transform: capitalize;
    }

    .mois-info {
      margin: 0;
      color: #64748b;
      font-size: 14px;
    }

    .plannings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .planning-card {
      background: #fff;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .planning-card:hover {
      border-color: #4a6fa5;
      box-shadow: 0 4px 12px rgba(74, 111, 165, 0.15);
      transform: translateY(-2px);
    }

    .planning-card.confirmed {
      border-color: #10b981;
      background: #f0fdf4;
    }

    .planning-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .planning-week {
      font-weight: 600;
      color: #1e293b;
      font-size: 16px;
    }

    .planning-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }

    .planning-card-body {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .planning-dates {
      margin: 0;
      color: #475569;
      font-size: 14px;
    }

    .planning-info {
      margin: 0;
      color: #94a3b8;
      font-size: 12px;
    }
  `]
})
export class PlanningComponent {
  private planningGenerator = inject(PlanningGeneratorService);
  private dataService = inject(DataService);
  private excelExport = inject(ExcelExportService);
  private pdfExport = inject(PdfExportService);
  private authService = inject(AuthService);
  private statistiquesService = inject(StatistiquesService);
  private notification = inject(NotificationService);

  planningActuel = signal<PlanningSemaine | null>(null);
  dateDebutSemaine = this.getLundiSemaine(new Date()).toISOString().split('T')[0];
  
  // Vue mensuelle
  vueMode: 'semaine' | 'mois' = 'semaine';
  moisSelectionne = new Date().toISOString().slice(0, 7); // Format YYYY-MM
  planningsMois = signal<PlanningSemaine[]>([]);
  
  zones = ZONES;
  canEdit = this.authService.hasPermission('canGeneratePlanning');

  // Modal binômes
  showBinomeModal = false;
  groupeEnEdition: Groupe | null = null;
  dateGroupeEdition: Date | null = null;
  periodeGroupeEdition: DemiJournee | null = null;
  selectedAgents: Agent[] = [];

  // Modal export
  showModalExport = false;
  planningsSelectionnesIds = signal<Set<string>>(new Set());

  // Computed: plannings sélectionnables (futurs uniquement)
  planningsSelectionnables = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.dataService.getPlannings().filter(p => {
      const dateDebut = new Date(p.dateDebut);
      dateDebut.setHours(0, 0, 0, 0);
      return dateDebut >= today;
    }).sort((a, b) => {
      return new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime();
    });
  });

  planningsSelectionnes = computed(() => {
    const selectedIds = this.planningsSelectionnesIds();
    return this.planningsSelectionnables().filter(p => selectedIds.has(p.id));
  });

  tousPlanningsSelectionnes = computed(() => {
    const selectionnables = this.planningsSelectionnables();
    const selectionnes = this.planningsSelectionnesIds();
    return selectionnables.length > 0 && selectionnables.every(p => selectionnes.has(p.id));
  });

  // Modal génération multiple
  showModalGenerationMultiple = false;
  dateDebutGeneration = '';
  dateFinGeneration = '';
  isGeneratingMultiple = false;
  semaineEnCours = 0;
  totalSemaines = 0;
  dateMinGeneration = this.getLundiSemaine(new Date()).toISOString().split('T')[0];

  // Use computed to reactively get agents from DataService
  allAgents = computed(() => this.dataService.agents());

  // Computed: agents disponibles pour la période
  agentsDisponibles = computed(() => {
    return this.allAgents().filter((a: Agent) => a.enService);
  });

  constructor() {
    this.initComponent();
  }
  
  private async initComponent(): Promise<void> {
    await this.dataService.waitForInit();
    this.chargerPlanningActuel();
  }

  async genererPlanningHebdo(): Promise<void> {
    try {
      // Refresh data from Supabase before generating (to get latest conges)
      await this.dataService.refreshAgents();
      await this.dataService.refreshConges();
      
      // Get the Monday of the selected week (fix: always start on Monday)
      const selectedDate = new Date(this.dateDebutSemaine);
      const dateDebut = this.getLundiSemaine(selectedDate);
      
      // Check if a planning exists for this week
      const existingPlanning = this.dataService.getPlanningByDate(dateDebut);
      if (existingPlanning) {
        // Ask for confirmation before overwriting
        const dateDebutStr = dateDebut.toLocaleDateString('fr-FR');
        const confirmed = await this.notification.confirm({
          title: 'Planning existant',
          message: `Un planning existe déjà pour la semaine du ${dateDebutStr}. Voulez-vous le remplacer ?`,
          confirmText: 'Remplacer',
          cancelText: 'Annuler',
          type: 'warning'
        });
        
        if (!confirmed) return;
        
        // Clear current planning first to force UI update
        if (this.planningActuel()?.id === existingPlanning.id) {
          this.planningActuel.set(null);
        }
        // Delete the existing planning explicitly before generating new one
        try {
          await this.dataService.deletePlanning(existingPlanning.id);
        } catch (deleteError) {
          console.warn('Error deleting existing planning:', deleteError);
        }
      }
      
      // Generate new planning (this will replace existing one for same week)
      const planning = this.planningGenerator.generatePlanningSemaine(dateDebut);
      
      // Add/update planning in database (addPlanning handles replacement of existing and returns the created planning)
      const createdPlanning = await this.dataService.addPlanning(planning);
      
      // Update the current planning signal with the planning returned from the service
      // This ensures we use the correct ID and synchronized data from Supabase
      this.planningActuel.set(createdPlanning);
      
      // Update the date input to show the actual Monday
      this.dateDebutSemaine = dateDebut.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error generating planning:', error);
      await this.notification.alert({
        title: 'Erreur',
        message: 'Erreur lors de la génération du planning. Veuillez réessayer.',
        type: 'danger'
      });
    }
  }

  async genererJour(jour: JourSemaine): Promise<void> {
    try {
      const planning = this.planningActuel();
      if (!planning) return;

      // Refresh conges before regenerating
      await this.dataService.refreshConges();

      const updatedPlanning = this.planningGenerator.regenerateJour(planning, jour);
      
      // Update in storage
      await this.dataService.updatePlanning(updatedPlanning);
      
      this.planningActuel.set(updatedPlanning);
    } catch (error) {
      console.error('Error regenerating day:', error);
      await this.notification.alert({
        title: 'Erreur',
        message: 'Erreur lors de la régénération du jour. Veuillez réessayer.',
        type: 'danger'
      });
    }
  }

  async confirmerPlanning(): Promise<void> {
    try {
      const planning = this.planningActuel();
      if (!planning || planning.isConfirmed) return;

      const confirmed = await this.notification.confirm({
        title: 'Confirmer le planning',
        message: 'Ce planning sera enregistré dans l\'historique et les statistiques. Cette action est définitive.',
        confirmText: 'Confirmer',
        cancelText: 'Annuler',
        type: 'success'
      });
      
      if (!confirmed) return;

      // Confirm and save to history
      await this.dataService.confirmPlanning(planning);
      
      // Convert to historique entries
      const historiqueEntries = this.planningGenerator.planningToHistorique(planning);
      await this.dataService.addHistoriqueEntries(historiqueEntries);

      // Reload
      this.planningActuel.set({ ...planning, isConfirmed: true, dateConfirmation: new Date() });
    } catch (error) {
      console.error('Error confirming planning:', error);
      await this.notification.alert({
        title: 'Erreur',
        message: 'Erreur lors de la confirmation du planning. Veuillez réessayer.',
        type: 'danger'
      });
    }
  }

  onDateChange(): void {
    // When date changes, load the planning for that week
    this.chargerPlanningPourDate();
  }

  chargerPlanningPourDate(): void {
    if (!this.dateDebutSemaine) return;
    
    const selectedDate = new Date(this.dateDebutSemaine);
    const dateDebut = this.getLundiSemaine(selectedDate);
    
    // Try to find existing planning for this date
    const planning = this.dataService.getPlanningByDate(dateDebut);
    
    if (planning) {
      this.planningActuel.set(planning);
      // Update last viewed planning ID
      localStorage.setItem('adammdr_last_planning_id', planning.id);
    } else {
      // No planning found for this date
      this.planningActuel.set(null);
    }
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

  getEcolesForZone(zoneId?: string): { id: string; nom: string }[] {
    if (!zoneId) return [];
    const zone = ZONES.find(z => z.id === zoneId);
    return zone?.ecoles || [];
  }

  getEcoleName(ecoleId?: string): string {
    if (!ecoleId) return '-';
    for (const zone of ZONES) {
      const ecole = zone.ecoles.find(e => e.id === ecoleId);
      if (ecole) return ecole.nom;
    }
    return '-';
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
    this.sauvegarderPlanning();
  }

  async sauvegarderPlanning(): Promise<void> {
    try {
      const planning = this.planningActuel();
      if (planning) {
        await this.dataService.updatePlanning(planning);
      }
    } catch (error) {
      console.error('Error saving planning:', error);
      // Don't show alert for auto-save, just log the error
    }
  }

  exporterExcel(): void {
    const planning = this.planningActuel();
    if (planning) {
      this.excelExport.exportPlanningToExcel(planning);
    }
  }

  exporterPdf(): void {
    const planning = this.planningActuel();
    if (planning) {
      this.pdfExport.exportPlanningToPdf(planning);
    }
  }

  imprimerPdf(): void {
    const planning = this.planningActuel();
    if (planning) {
      this.pdfExport.printPlanning(planning);
    }
  }

  formatDateShort(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatDateLong(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getMoisLabel(): string {
    const [year, month] = this.moisSelectionne.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  chargerVueMensuelle(): void {
    const [year, month] = this.moisSelectionne.split('-');
    const dateDebutMois = new Date(parseInt(year), parseInt(month) - 1, 1);
    const dateFinMois = new Date(parseInt(year), parseInt(month), 0); // Dernier jour du mois
    
    const allPlannings = this.dataService.getPlannings();
    const planningsDuMois = allPlannings.filter(p => {
      const dateDebut = new Date(p.dateDebut);
      return dateDebut >= dateDebutMois && dateDebut <= dateFinMois;
    });
    
    // Trier par date de début (plus récent en premier)
    planningsDuMois.sort((a, b) => 
      new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime()
    );
    
    this.planningsMois.set(planningsDuMois);
  }

  selectionnerPlanning(planning: PlanningSemaine): void {
    this.planningActuel.set(planning);
    this.vueMode = 'semaine';
    this.dateDebutSemaine = planning.dateDebut.toISOString().split('T')[0];
  }

  getLundiSemaine(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  // Calculer le nombre de semaines à générer
  nombreSemainesAGenerer(): number {
    if (!this.dateDebutGeneration || !this.dateFinGeneration) return 0;
    
    const debut = this.getLundiSemaine(new Date(this.dateDebutGeneration));
    const fin = this.getLundiSemaine(new Date(this.dateFinGeneration));
    
    if (fin < debut) return 0;
    
    const diffTime = fin.getTime() - debut.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const semaines = Math.floor(diffDays / 7) + 1;
    
    return semaines;
  }

  // Ouvrir le modal de génération multiple
  ouvrirModalGenerationMultiple(): void {
    const prochainLundi = this.getLundiSemaine(new Date());
    this.dateDebutGeneration = prochainLundi.toISOString().split('T')[0];
    
    // Par défaut, 5 semaines
    const dateFin = new Date(prochainLundi);
    dateFin.setDate(dateFin.getDate() + (4 * 7)); // 5 semaines = 4 semaines après
    this.dateFinGeneration = this.getLundiSemaine(dateFin).toISOString().split('T')[0];
    
    this.showModalGenerationMultiple = true;
  }

  // Fermer le modal
  fermerModalGenerationMultiple(event?: Event): void {
    if (!event || (event.target as HTMLElement).classList.contains('modal-overlay')) {
      if (!this.isGeneratingMultiple) {
        this.showModalGenerationMultiple = false;
        this.dateDebutGeneration = '';
        this.dateFinGeneration = '';
      }
    }
  }

  // Générer plusieurs plannings
  async genererPlanningsMultiple(): Promise<void> {
    if (!this.dateDebutGeneration || !this.dateFinGeneration) return;
    
    const debut = this.getLundiSemaine(new Date(this.dateDebutGeneration));
    const fin = this.getLundiSemaine(new Date(this.dateFinGeneration));
    
    if (fin < debut) {
      await this.notification.alert({
        title: 'Erreur',
        message: 'La date de fin doit être supérieure à la date de début.',
        type: 'danger'
      });
      return;
    }
    
    // Calculer toutes les semaines à générer
    const semaines: Date[] = [];
    let currentDate = new Date(debut);
    
    while (currentDate <= fin) {
      semaines.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 7); // Semaine suivante
    }
    
    if (semaines.length === 0) {
      await this.notification.alert({
        title: 'Erreur',
        message: 'Aucune semaine à générer.',
        type: 'danger'
      });
      return;
    }
    
    // Confirmation
    const confirmed = await this.notification.confirm({
      title: 'Génération multiple',
      message: `Vous allez générer ${semaines.length} planning(s). Les plannings existants pour ces semaines seront remplacés. Continuer ?`,
      confirmText: 'Générer',
      cancelText: 'Annuler',
      type: 'info'
    });
    
    if (!confirmed) return;
    
    // Rafraîchir les données une seule fois avant la génération
    await this.dataService.refreshAgents();
    await this.dataService.refreshConges();
    
    // Générer les plannings
    this.isGeneratingMultiple = true;
    this.totalSemaines = semaines.length;
    this.semaineEnCours = 0;
    
    const planningsGeneres: PlanningSemaine[] = [];
    const erreurs: { semaine: string; erreur: string }[] = [];
    
    for (let i = 0; i < semaines.length; i++) {
      this.semaineEnCours = i + 1;
      const dateLundi = semaines[i];
      
      try {
        // Vérifier si un planning existe déjà
        const existingPlanning = this.dataService.getPlanningByDate(dateLundi);
        if (existingPlanning) {
          // Supprimer l'ancien planning
          try {
            await this.dataService.deletePlanning(existingPlanning.id);
          } catch (deleteError) {
            console.warn(`Error deleting existing planning for ${dateLundi.toLocaleDateString('fr-FR')}:`, deleteError);
          }
        }
        
        // Générer le nouveau planning
        const planning = this.planningGenerator.generatePlanningSemaine(dateLundi);
        const createdPlanning = await this.dataService.addPlanning(planning);
        planningsGeneres.push(createdPlanning);
        
        // Petit délai pour éviter de surcharger la base de données
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error generating planning for ${dateLundi.toLocaleDateString('fr-FR')}:`, error);
        erreurs.push({
          semaine: dateLundi.toLocaleDateString('fr-FR'),
          erreur: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    }
    
    this.isGeneratingMultiple = false;
    
    // Afficher le résultat
    if (erreurs.length === 0) {
      await this.notification.alert({
        title: 'Succès',
        message: `${planningsGeneres.length} planning(s) généré(s) avec succès.`,
        type: 'success'
      });
      
      // Charger le premier planning généré
      if (planningsGeneres.length > 0) {
        this.planningActuel.set(planningsGeneres[0]);
        this.dateDebutSemaine = planningsGeneres[0].dateDebut.toISOString().split('T')[0];
      }
    } else {
      await this.notification.alert({
        title: 'Génération partielle',
        message: `${planningsGeneres.length} planning(s) généré(s), ${erreurs.length} erreur(s).`,
        type: 'warning'
      });
    }
    
    // Fermer le modal
    this.showModalGenerationMultiple = false;
    this.dateDebutGeneration = '';
    this.dateFinGeneration = '';
  }

  // Modal binômes methods
  ouvrirModalBinome(groupe: Groupe, date: Date, periode: string): void {
    this.groupeEnEdition = groupe;
    this.dateGroupeEdition = date;
    this.periodeGroupeEdition = periode as DemiJournee;
    this.selectedAgents = [...groupe.agents];
    this.showBinomeModal = true;
  }

  fermerModalBinome(event?: Event): void {
    if (!event || (event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.showBinomeModal = false;
      this.groupeEnEdition = null;
      this.selectedAgents = [];
    }
  }

  isAgentSelected(agentId: string): boolean {
    return this.selectedAgents.some(a => a.id === agentId);
  }

  isAgentAvailable(agentId: string): boolean {
    if (!this.dateGroupeEdition || !this.periodeGroupeEdition) return true;
    
    // Check if agent is already in another group for the same period
    const planning = this.planningActuel();
    if (!planning) return true;

    const jourPlanning = planning.jours.find((j: PlanningJour) => 
      new Date(j.date).toDateString() === new Date(this.dateGroupeEdition!).toDateString()
    );
    if (!jourPlanning) return true;

    const entry = this.periodeGroupeEdition === DemiJournee.MATIN 
      ? jourPlanning.matin 
      : jourPlanning.apresMidi;

    // Check if agent is in any other group (not the current one being edited)
    for (const groupe of entry.groupes) {
      if (groupe.id !== this.groupeEnEdition?.id) {
        if (groupe.agents.some((a: Agent) => a.id === agentId)) {
          return false;
        }
      }
    }

    return true;
  }

  toggleAgent(agent: Agent): void {
    const index = this.selectedAgents.findIndex(a => a.id === agent.id);
    if (index >= 0) {
      this.selectedAgents.splice(index, 1);
    } else if (this.selectedAgents.length < 3) {
      this.selectedAgents.push(agent);
    }
  }

  async sauvegarderBinome(): Promise<void> {
    try {
      if (!this.groupeEnEdition || this.selectedAgents.length < 2) return;

      // Update the group's agents
      this.groupeEnEdition.agents = [...this.selectedAgents];
      
      // Save the planning
      await this.sauvegarderPlanning();
      
      // Close modal
      this.fermerModalBinome();
    } catch (error) {
      console.error('Error saving binome:', error);
      await this.notification.alert({
        title: 'Erreur',
        message: 'Erreur lors de la sauvegarde du binôme. Veuillez réessayer.',
        type: 'danger'
      });
    }
  }

  // ============================================
  // CONFLICT DETECTION FUNCTIONS
  // ============================================

  /**
   * Get all conflicts for a specific group in a day
   */
  getGroupeConflits(groupe: Groupe, jourPlanning: PlanningJour, demiJournee: DemiJournee): ConflitGroupe[] {
    const conflits: ConflitGroupe[] = [];
    
    // Check for agents in same zone morning and afternoon
    const conflitZone = this.checkConflitMemeZoneJournee(groupe, jourPlanning, demiJournee);
    if (conflitZone) conflits.push(conflitZone);
    
    // Check for same pair morning and afternoon
    const conflitBinome = this.checkConflitMemeBinomeJournee(groupe, jourPlanning, demiJournee);
    if (conflitBinome) conflits.push(conflitBinome);
    
    return conflits;
  }

  /**
   * Check if an agent is in the same zone morning and afternoon
   */
  private checkConflitMemeZoneJournee(groupe: Groupe, jourPlanning: PlanningJour, demiJournee: DemiJournee): ConflitGroupe | null {
    if (!groupe.zoneId) return null;
    
    const autreEntry = demiJournee === DemiJournee.MATIN ? jourPlanning.apresMidi : jourPlanning.matin;
    const agentsConcernes: string[] = [];
    
    for (const agent of groupe.agents) {
      for (const autreGroupe of autreEntry.groupes) {
        if (autreGroupe.zoneId === groupe.zoneId && 
            autreGroupe.agents.some(a => a.id === agent.id)) {
          agentsConcernes.push(agent.nom);
          break;
        }
      }
    }
    
    if (agentsConcernes.length > 0) {
      return {
        type: 'MEME_ZONE_JOURNEE',
        description: `${agentsConcernes.join(', ')} dans la même zone matin et après-midi`,
        agentsConcernes
      };
    }
    
    return null;
  }

  /**
   * Check if the same pair works together morning and afternoon
   */
  private checkConflitMemeBinomeJournee(groupe: Groupe, jourPlanning: PlanningJour, demiJournee: DemiJournee): ConflitGroupe | null {
    const autreEntry = demiJournee === DemiJournee.MATIN ? jourPlanning.apresMidi : jourPlanning.matin;
    
    // Get all agent IDs in current group
    const currentAgentIds = new Set(groupe.agents.map(a => a.id));
    
    for (const autreGroupe of autreEntry.groupes) {
      const autreAgentIds = new Set(autreGroupe.agents.map(a => a.id));
      
      // Check if at least 2 agents are the same (forming a pair)
      const agentsEnCommun = groupe.agents.filter(a => autreAgentIds.has(a.id));
      
      if (agentsEnCommun.length >= 2) {
        return {
          type: 'MEME_BINOME_JOURNEE',
          description: `${agentsEnCommun.map(a => a.nom).join(' et ')} ensemble matin et après-midi`,
          agentsConcernes: agentsEnCommun.map(a => a.nom)
        };
      }
    }
    
    return null;
  }


  /**
   * Get conflicts for an agent in the modal selection
   */
  getAgentConflits(agentId: string): ConflitGroupe[] {
    const conflits: ConflitGroupe[] = [];
    
    if (!this.dateGroupeEdition || !this.periodeGroupeEdition || !this.groupeEnEdition) {
      return conflits;
    }
    
    const planning = this.planningActuel();
    if (!planning) return conflits;
    
    const jourPlanning = planning.jours.find((j: PlanningJour) => 
      new Date(j.date).toDateString() === new Date(this.dateGroupeEdition!).toDateString()
    );
    if (!jourPlanning) return conflits;
    
    const agent = this.allAgents().find((a: Agent) => a.id === agentId);
    if (!agent) return conflits;
    
    // Check if agent is occupied (in another group same period)
    const conflitOccupe = this.checkAgentOccupe(agentId, jourPlanning);
    if (conflitOccupe) conflits.push(conflitOccupe);
    
    // Check if agent would be in same zone morning/afternoon
    const conflitZone = this.checkAgentMemeZone(agent, jourPlanning);
    if (conflitZone) conflits.push(conflitZone);
    
    // Check for same pair morning/afternoon with selected agents
    const conflitMemePaire = this.checkAgentMemePairJournee(agent, jourPlanning);
    if (conflitMemePaire) conflits.push(conflitMemePaire);
    
    return conflits;
  }

  /**
   * Check if agent is already in another group for the same period
   */
  private checkAgentOccupe(agentId: string, jourPlanning: PlanningJour): ConflitGroupe | null {
    const entry = this.periodeGroupeEdition === DemiJournee.MATIN 
      ? jourPlanning.matin 
      : jourPlanning.apresMidi;
    
    for (const groupe of entry.groupes) {
      if (groupe.id !== this.groupeEnEdition?.id) {
        if (groupe.agents.some(a => a.id === agentId)) {
          const autresBinomes = groupe.agents.map(a => a.nom).join(', ');
          return {
            type: 'AGENT_OCCUPE',
            description: `Déjà dans le groupe: ${autresBinomes}`,
            agentsConcernes: [agentId]
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Check if agent would be in same zone morning and afternoon
   */
  private checkAgentMemeZone(agent: Agent, jourPlanning: PlanningJour): ConflitGroupe | null {
    if (!this.groupeEnEdition?.zoneId) return null;
    
    const autreEntry = this.periodeGroupeEdition === DemiJournee.MATIN 
      ? jourPlanning.apresMidi 
      : jourPlanning.matin;
    
    for (const groupe of autreEntry.groupes) {
      if (groupe.zoneId === this.groupeEnEdition.zoneId && 
          groupe.agents.some(a => a.id === agent.id)) {
        return {
          type: 'MEME_ZONE_JOURNEE',
          description: `Sera dans la même zone matin et après-midi`,
          agentsConcernes: [agent.nom]
        };
      }
    }
    
    return null;
  }

  /**
   * Check if agent would form the same pair morning and afternoon
   */
  private checkAgentMemePairJournee(agent: Agent, jourPlanning: PlanningJour): ConflitGroupe | null {
    const autreEntry = this.periodeGroupeEdition === DemiJournee.MATIN 
      ? jourPlanning.apresMidi 
      : jourPlanning.matin;
    
    // Check other selected agents in modal
    for (const autreAgent of this.selectedAgents) {
      if (autreAgent.id === agent.id) continue;
      
      // Check if this pair exists in the other period
      for (const groupe of autreEntry.groupes) {
        const hasAgent = groupe.agents.some(a => a.id === agent.id);
        const hasAutre = groupe.agents.some(a => a.id === autreAgent.id);
        
        if (hasAgent && hasAutre) {
          return {
            type: 'MEME_BINOME_JOURNEE',
            description: `${agent.nom} et ${autreAgent.nom} déjà ensemble dans l'autre période`,
            agentsConcernes: [agent.nom, autreAgent.nom]
          };
        }
      }
    }
    
    return null;
  }


  /**
   * Check if a group has any conflicts (for displaying warning in table)
   */
  hasGroupeConflits(groupe: Groupe, jourPlanning: PlanningJour, demiJournee: DemiJournee): boolean {
    return this.getGroupeConflits(groupe, jourPlanning, demiJournee).length > 0;
  }

  // Helper methods for template (to avoid passing enum directly)
  hasGroupeConflitsMatin(groupe: Groupe, jourPlanning: PlanningJour): boolean {
    return this.hasGroupeConflits(groupe, jourPlanning, DemiJournee.MATIN);
  }

  hasGroupeConflitsApresMidi(groupe: Groupe, jourPlanning: PlanningJour): boolean {
    return this.hasGroupeConflits(groupe, jourPlanning, DemiJournee.APRES_MIDI);
  }

  getGroupeConflitsTooltipMatin(groupe: Groupe, jourPlanning: PlanningJour): string {
    return this.getGroupeConflitsTooltip(groupe, jourPlanning, DemiJournee.MATIN);
  }

  getGroupeConflitsTooltipApresMidi(groupe: Groupe, jourPlanning: PlanningJour): string {
    return this.getGroupeConflitsTooltip(groupe, jourPlanning, DemiJournee.APRES_MIDI);
  }

  /**
   * Get tooltip text for group conflicts
   */
  getGroupeConflitsTooltip(groupe: Groupe, jourPlanning: PlanningJour, demiJournee: DemiJournee): string {
    const conflits = this.getGroupeConflits(groupe, jourPlanning, demiJournee);
    return conflits.map(c => c.description).join('\n');
  }

  /**
   * Check if agent has conflicts in modal
   */
  hasAgentConflits(agentId: string): boolean {
    return this.getAgentConflits(agentId).length > 0;
  }

  /**
   * Get tooltip for agent conflicts in modal
   */
  getAgentConflitsTooltip(agentId: string): string {
    const conflits = this.getAgentConflits(agentId);
    return conflits.map(c => c.description).join('\n');
  }

  /**
   * Check if any selected agent has conflicts (for legend display)
   */
  hasAnySelectedAgentConflict(): boolean {
    return this.selectedAgents.some((a: Agent) => this.hasAgentConflits(a.id));
  }

  ouvrirModalExport(): void {
    this.showModalExport = true;
    // Reset selection
    this.planningsSelectionnesIds.set(new Set());
  }

  fermerModalExport(event?: Event): void {
    if (!event || (event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.showModalExport = false;
      this.planningsSelectionnesIds.set(new Set());
    }
  }

  toggleSelectionTous(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      const allIds = new Set(this.planningsSelectionnables().map(p => p.id));
      this.planningsSelectionnesIds.set(allIds);
    } else {
      this.planningsSelectionnesIds.set(new Set());
    }
  }

  toggleSelectionPlanning(planningId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = new Set(this.planningsSelectionnesIds());
    if (checked) {
      current.add(planningId);
    } else {
      current.delete(planningId);
    }
    this.planningsSelectionnesIds.set(current);
  }

  isPlanningSelectionne(planningId: string): boolean {
    return this.planningsSelectionnesIds().has(planningId);
  }

  exporterSelectionExcel(): void {
    const plannings = this.planningsSelectionnes();
    if (plannings.length === 0) return;
    
    this.excelExport.exportPlanningsToExcel(plannings);
    this.fermerModalExport();
  }

  exporterSelectionPdf(): void {
    const plannings = this.planningsSelectionnes();
    if (plannings.length === 0) return;
    
    this.pdfExport.exportPlanningsToPdf(plannings);
    this.fermerModalExport();
  }

  formatDateRange(dateDebut: Date, dateFin: Date): string {
    const debut = new Date(dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    const fin = new Date(dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${debut} - ${fin}`;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }
}

