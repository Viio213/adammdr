import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { AuthService } from '../../services/auth.service';
import { HistoriqueEntry } from '../../models/historique.model';
import { NotificationService } from '../../services/notification.service';

interface HistoriqueJour {
  date: Date;
  jour: string;
  matin: HistoriqueEntry[];
  apresMidi: HistoriqueEntry[];
}

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="card">
        <div class="card-header">
          <h2>Historique des Plannings</h2>
          <div class="header-actions">
            <input 
              type="date" 
              [(ngModel)]="dateDebut" 
              [max]="dateFin || ''"
              class="date-input"
              placeholder="Date début"
            />
            <input 
              type="date" 
              [(ngModel)]="dateFin" 
              [min]="dateDebut || ''"
              class="date-input"
              placeholder="Date fin"
            />
            <button class="btn btn-secondary" (click)="appliquerFiltres()">
              Filtrer
            </button>
            <button class="btn btn-secondary" (click)="reinitialiserFiltres()">
              Réinitialiser
            </button>
            <button *ngIf="canEdit" class="btn btn-success" (click)="exporterHistorique()">
              Export JSON
            </button>
            <button class="btn btn-success" (click)="exporterExcel()">
              Export Excel
            </button>
            <button class="btn btn-primary" (click)="exporterPdf()">
              Export PDF
            </button>
            <button class="btn btn-info" (click)="imprimerPdf()">
              Imprimer
            </button>
          </div>
        </div>

        <div class="historique-stats">
          <div class="stat-item">
            <span class="stat-value">{{ historiqueParJour().length }}</span>
            <span class="stat-label">jours</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ historiqueFiltre().length }}</span>
            <span class="stat-label">entrées</span>
          </div>
        </div>

        <!-- Vue Planning -->
        <div class="planning-view" *ngIf="historiqueParJour().length > 0">
          <div class="table-wrapper">
            <table class="planning-table">
              <thead>
                <tr>
                  <th class="th-jour">JOUR</th>
                  <th class="th-periode">Période</th>
                  <th class="th-binomes">Binômes</th>
                  <th class="th-zone">Zone</th>
                  <th class="th-ecole">École</th>
                  <th class="th-vehicule">Véhicule</th>
                  <th class="th-mission">Mission</th>
                  <th class="th-reunion">Réunion</th>
                  <th class="th-commentaires">Commentaires</th>
                  <th *ngIf="canEdit" class="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                <ng-container *ngFor="let jour of historiqueParJour()">
                  <!-- Morning rows -->
                  <ng-container *ngFor="let entry of jour.matin; let first = first; let i = index">
                    <tr class="row-groupe" [class.row-first]="first" [class.row-editing]="entryEnEdition?.id === entry.id">
                      <!-- Day cell -->
                      <td *ngIf="first" 
                          class="td-jour" 
                          [attr.rowspan]="getJourRowspan(jour)">
                        <div class="jour-content">
                          <span class="jour-nom">{{ jour.jour }}</span>
                          <span class="jour-date">{{ formatDateShort(jour.date) }}</span>
                        </div>
                      </td>
                      
                      <!-- Matin indicator -->
                      <td *ngIf="first" 
                          class="td-periode td-matin"
                          [attr.rowspan]="jour.matin.length || 1">
                        <span class="periode-badge matin">Matin</span>
                      </td>
                      
                      <!-- Binômes -->
                      <td class="td-binomes">
                        <div class="binome-names">{{ entry.binomes }}</div>
                      </td>
                      
                      <!-- Zone -->
                      <td class="td-zone">
                        <span class="zone-badge" [class.zone-ext]="isZoneExterieur(entry.zoneId)">
                          {{ entry.zoneName || '-' }}
                        </span>
                      </td>
                      
                      <!-- École -->
                      <td class="td-ecole">
                        <span class="ecole-name">{{ entry.ecoleName || '-' }}</span>
                      </td>
                      
                      <!-- Véhicule -->
                      <td class="td-vehicule">
                        <span class="vehicule-badge" [class.vehicule-oui]="entry.vehicule">
                          {{ entry.vehicule ? 'Oui' : 'Non' }}
                        </span>
                      </td>
                      
                      <!-- Mission -->
                      <td class="td-mission">
                        <ng-container *ngIf="entryEnEdition?.id === entry.id; else readOnlyMission">
                          <input 
                            type="text" 
                            [(ngModel)]="entry.mission" 
                            class="cell-input"
                            placeholder="Mission..."
                          />
                        </ng-container>
                        <ng-template #readOnlyMission>
                          <span class="readonly-value">{{ entry.mission || '-' }}</span>
                        </ng-template>
                      </td>
                      
                      <!-- Réunion -->
                      <td class="td-reunion">
                        <ng-container *ngIf="entryEnEdition?.id === entry.id; else readOnlyReunion">
                          <input 
                            type="text" 
                            [(ngModel)]="entry.reunion" 
                            class="cell-input"
                            placeholder="Réunion..."
                          />
                        </ng-container>
                        <ng-template #readOnlyReunion>
                          <span class="readonly-value">{{ entry.reunion || '-' }}</span>
                        </ng-template>
                      </td>
                      
                      <!-- Commentaires -->
                      <td class="td-commentaires">
                        <ng-container *ngIf="entryEnEdition?.id === entry.id; else readOnlyCommentaires">
                          <input 
                            type="text" 
                            [(ngModel)]="entry.commentaires" 
                            class="cell-input"
                            placeholder="Commentaire..."
                          />
                        </ng-container>
                        <ng-template #readOnlyCommentaires>
                          <span class="readonly-value">{{ entry.commentaires || '-' }}</span>
                        </ng-template>
                      </td>
                      
                      <!-- Actions -->
                      <td *ngIf="canEdit" class="td-actions">
                        <div class="actions-btns">
                          <ng-container *ngIf="entryEnEdition?.id === entry.id; else showEditBtn">
                            <button class="btn-save" (click)="sauvegarderEntry(entry)" title="Enregistrer">
                              ✓
                            </button>
                            <button class="btn-cancel" (click)="annulerEdition()" title="Annuler">
                              ✕
                            </button>
                          </ng-container>
                          <ng-template #showEditBtn>
                            <button class="btn-edit" (click)="editerEntry(entry)" title="Modifier">
                              ✎
                            </button>
                            <button class="btn-delete" (click)="supprimerEntry(entry.id)" title="Supprimer">
                              🗑
                            </button>
                          </ng-template>
                        </div>
                      </td>
                    </tr>
                  </ng-container>
                  
                  <!-- Empty morning row if no entries -->
                  <tr *ngIf="jour.matin.length === 0" class="row-empty">
                    <td class="td-jour" [attr.rowspan]="getJourRowspan(jour)">
                      <div class="jour-content">
                        <span class="jour-nom">{{ jour.jour }}</span>
                        <span class="jour-date">{{ formatDateShort(jour.date) }}</span>
                      </div>
                    </td>
                    <td class="td-periode td-matin">
                      <span class="periode-badge matin">Matin</span>
                    </td>
                    <td [attr.colspan]="canEdit ? 8 : 7" class="td-no-data">Aucune donnée</td>
                  </tr>
                  
                  <!-- Afternoon rows -->
                  <ng-container *ngFor="let entry of jour.apresMidi; let first = first">
                    <tr class="row-groupe row-aprem" [class.row-first]="first" [class.row-editing]="entryEnEdition?.id === entry.id">
                      <!-- Après-midi indicator -->
                      <td *ngIf="first" 
                          class="td-periode td-aprem"
                          [attr.rowspan]="jour.apresMidi.length || 1">
                        <span class="periode-badge aprem">Après-midi</span>
                      </td>
                      
                      <!-- Binômes -->
                      <td class="td-binomes">
                        <div class="binome-names">{{ entry.binomes }}</div>
                      </td>
                      
                      <!-- Zone -->
                      <td class="td-zone">
                        <span class="zone-badge" [class.zone-ext]="isZoneExterieur(entry.zoneId)">
                          {{ entry.zoneName || '-' }}
                        </span>
                      </td>
                      
                      <!-- École -->
                      <td class="td-ecole">
                        <span class="ecole-name">{{ entry.ecoleName || '-' }}</span>
                      </td>
                      
                      <!-- Véhicule -->
                      <td class="td-vehicule">
                        <span class="vehicule-badge" [class.vehicule-oui]="entry.vehicule">
                          {{ entry.vehicule ? 'Oui' : 'Non' }}
                        </span>
                      </td>
                      
                      <!-- Mission -->
                      <td class="td-mission">
                        <ng-container *ngIf="entryEnEdition?.id === entry.id; else readOnlyMissionAM">
                          <input 
                            type="text" 
                            [(ngModel)]="entry.mission" 
                            class="cell-input"
                          />
                        </ng-container>
                        <ng-template #readOnlyMissionAM>
                          <span class="readonly-value">{{ entry.mission || '-' }}</span>
                        </ng-template>
                      </td>
                      
                      <!-- Réunion -->
                      <td class="td-reunion">
                        <ng-container *ngIf="entryEnEdition?.id === entry.id; else readOnlyReunionAM">
                          <input 
                            type="text" 
                            [(ngModel)]="entry.reunion" 
                            class="cell-input"
                          />
                        </ng-container>
                        <ng-template #readOnlyReunionAM>
                          <span class="readonly-value">{{ entry.reunion || '-' }}</span>
                        </ng-template>
                      </td>
                      
                      <!-- Commentaires -->
                      <td class="td-commentaires">
                        <ng-container *ngIf="entryEnEdition?.id === entry.id; else readOnlyCommentairesAM">
                          <input 
                            type="text" 
                            [(ngModel)]="entry.commentaires" 
                            class="cell-input"
                          />
                        </ng-container>
                        <ng-template #readOnlyCommentairesAM>
                          <span class="readonly-value">{{ entry.commentaires || '-' }}</span>
                        </ng-template>
                      </td>
                      
                      <!-- Actions -->
                      <td *ngIf="canEdit" class="td-actions">
                        <div class="actions-btns">
                          <ng-container *ngIf="entryEnEdition?.id === entry.id; else showEditBtnAM">
                            <button class="btn-save" (click)="sauvegarderEntry(entry)" title="Enregistrer">
                              ✓
                            </button>
                            <button class="btn-cancel" (click)="annulerEdition()" title="Annuler">
                              ✕
                            </button>
                          </ng-container>
                          <ng-template #showEditBtnAM>
                            <button class="btn-edit" (click)="editerEntry(entry)" title="Modifier">
                              ✎
                            </button>
                            <button class="btn-delete" (click)="supprimerEntry(entry.id)" title="Supprimer">
                              🗑
                            </button>
                          </ng-template>
                        </div>
                      </td>
                    </tr>
                  </ng-container>
                  
                  <!-- Empty afternoon row if no entries -->
                  <tr *ngIf="jour.apresMidi.length === 0" class="row-empty row-aprem">
                    <td class="td-periode td-aprem">
                      <span class="periode-badge aprem">Après-midi</span>
                    </td>
                    <td [attr.colspan]="canEdit ? 8 : 7" class="td-no-data">Aucune donnée</td>
                  </tr>
                </ng-container>
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Empty state -->
        <div class="empty-state" *ngIf="historiqueParJour().length === 0">
          <p class="empty-title">Aucun historique disponible</p>
          <p class="empty-subtitle">Les plannings confirmés apparaîtront ici</p>
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
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      padding: 28px;
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0;
      padding-bottom: 24px;
      border-bottom: 2px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .card-header h2 {
      font-size: 26px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }
    
    .header-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .date-input {
      padding: 10px 14px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      min-width: 150px;
      transition: all 0.2s;
    }
    
    .date-input:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
    
    .btn {
      padding: 10px 18px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
    }
    
    .btn-secondary:hover {
      background: #e2e8f0;
    }
    
    .btn-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }
    
    .btn-success:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: white;
    }
    
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
    
    .btn-info {
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      color: white;
    }

    .btn-info:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
    }
    
    .historique-stats {
      display: flex;
      gap: 24px;
      margin: 24px 0;
      padding: 20px 24px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 12px;
      border-left: 4px solid #6366f1;
    }
    
    .stat-item {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #6366f1;
    }
    
    .stat-label {
      font-size: 14px;
      color: #64748b;
    }
    
    .table-wrapper {
      overflow-x: auto;
      margin-top: 24px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .planning-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    
    .planning-table th {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      color: white;
      padding: 14px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .planning-table th:first-child {
      border-radius: 12px 0 0 0;
    }
    
    .planning-table th:last-child {
      border-radius: 0 12px 0 0;
    }
    
    .planning-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    
    .row-groupe:hover {
      background: #f8fafc;
    }
    
    .row-editing {
      background: #fef3c7 !important;
    }
    
    .row-first {
      border-top: 2px solid #e2e8f0;
    }
    
    .td-jour {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-right: 2px solid #e2e8f0;
      min-width: 100px;
    }
    
    .jour-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px;
    }
    
    .jour-nom {
      font-weight: 700;
      color: #1e293b;
      font-size: 14px;
    }
    
    .jour-date {
      font-size: 12px;
      color: #64748b;
    }
    
    .td-periode {
      text-align: center;
      min-width: 100px;
    }
    
    .periode-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .periode-badge.matin {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      color: #92400e;
    }
    
    .periode-badge.aprem {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      color: #1e40af;
    }
    
    .td-binomes {
      min-width: 150px;
    }
    
    .binome-names {
      font-weight: 600;
      color: #1e293b;
    }
    
    .td-zone {
      min-width: 80px;
    }
    
    .zone-badge {
      display: inline-block;
      padding: 4px 10px;
      background: #f1f5f9;
      border-radius: 6px;
      font-size: 13px;
      color: #475569;
    }
    
    .zone-badge.zone-ext {
      background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
      color: #166534;
    }
    
    .td-ecole {
      min-width: 120px;
    }
    
    .ecole-name {
      font-size: 13px;
      color: #475569;
    }
    
    .td-vehicule {
      text-align: center;
      min-width: 70px;
    }
    
    .vehicule-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      background: #f1f5f9;
      color: #64748b;
    }
    
    .vehicule-badge.vehicule-oui {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      color: #1e40af;
    }
    
    .cell-input {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 13px;
      transition: all 0.2s;
    }
    
    .cell-input:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
    
    .readonly-value {
      color: #64748b;
    }
    
    .td-actions {
      text-align: center;
      min-width: 80px;
    }
    
    .actions-btns {
      display: flex;
      gap: 4px;
      justify-content: center;
    }
    
    .btn-edit, .btn-delete, .btn-save, .btn-cancel {
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      padding: 6px 8px;
      border-radius: 6px;
      transition: all 0.2s;
    }
    
    .btn-edit:hover {
      background: #dbeafe;
    }
    
    .btn-delete:hover {
      background: #fee2e2;
    }
    
    .btn-save {
      color: #059669;
    }
    
    .btn-save:hover {
      background: #d1fae5;
    }
    
    .btn-cancel {
      color: #dc2626;
    }
    
    .btn-cancel:hover {
      background: #fee2e2;
    }
    
    .td-no-data {
      text-align: center;
      color: #94a3b8;
      font-style: italic;
      padding: 20px;
    }
    
    .row-aprem {
      background: #fafbfc;
    }
    
    .row-aprem:hover {
      background: #f1f5f9;
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }
    
    .empty-title {
      font-size: 20px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 8px;
    }
    
    .empty-subtitle {
      font-size: 15px;
      color: #64748b;
      margin: 0;
    }
    
    .th-jour { min-width: 100px; }
    .th-periode { min-width: 100px; }
    .th-binomes { min-width: 150px; }
    .th-zone { min-width: 80px; }
    .th-ecole { min-width: 120px; }
    .th-vehicule { min-width: 70px; text-align: center; }
    .th-mission { min-width: 100px; }
    .th-reunion { min-width: 100px; }
    .th-commentaires { min-width: 120px; }
    .th-actions { min-width: 80px; text-align: center; }
  `]
})
export class HistoriqueComponent {
  private dataService = inject(DataService);
  private excelExport = inject(ExcelExportService);
  private pdfExport = inject(PdfExportService);
  private authService = inject(AuthService);
  private notification = inject(NotificationService);

  // Use computed to reactively get historique from DataService
  historique = computed(() => this.dataService.historique());
  historiqueFiltre = signal<HistoriqueEntry[]>([]);
  dateDebut: string = '';
  dateFin: string = '';
  
  // Entry being edited
  entryEnEdition: HistoriqueEntry | null = null;
  entryBackup: HistoriqueEntry | null = null;

  canEdit = this.authService.hasPermission('canEditHistorique');

  constructor() {
    this.initComponent();
  }
  
  private async initComponent(): Promise<void> {
    await this.dataService.waitForInit();
    // Initialize filtered list from computed historique
    this.historiqueFiltre.set([...this.historique()]);
  }
  
  // Computed: historique groupé par jour
  historiqueParJour = computed((): HistoriqueJour[] => {
    const entries = this.historiqueFiltre();
    const joursMap = new Map<string, HistoriqueJour>();
    
    entries.forEach(entry => {
      const dateKey = new Date(entry.date).toISOString().split('T')[0];
      
      if (!joursMap.has(dateKey)) {
        joursMap.set(dateKey, {
          date: new Date(entry.date),
          jour: entry.jour,
          matin: [],
          apresMidi: []
        });
      }
      
      const jour = joursMap.get(dateKey)!;
      if (entry.demiJournee === 'MATIN') {
        jour.matin.push(entry);
      } else {
        jour.apresMidi.push(entry);
      }
    });
    
    // Sort by date ascending (oldest first)
    return Array.from(joursMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });
  
  getJourRowspan(jour: HistoriqueJour): number {
    const matinRows = Math.max(jour.matin.length, 1);
    const apremRows = Math.max(jour.apresMidi.length, 1);
    return matinRows + apremRows;
  }
  
  isZoneExterieur(zoneId: string | undefined): boolean {
    if (!zoneId) return false;
    return zoneId === 'zone1' || zoneId === 'zone4';
  }

  appliquerFiltres(): void {
    // Validate dates
    if (this.dateDebut && this.dateFin && this.dateDebut > this.dateFin) {
      this.notification.alert({
        title: 'Dates invalides',
        message: 'La date de fin ne peut pas être antérieure à la date de début.',
        type: 'warning'
      });
      return;
    }
    
    let filtered = [...this.historique()];

    if (this.dateDebut) {
      const dateDebutObj = new Date(this.dateDebut);
      filtered = filtered.filter(e => new Date(e.date) >= dateDebutObj);
    }

    if (this.dateFin) {
      const dateFinObj = new Date(this.dateFin);
      dateFinObj.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => new Date(e.date) <= dateFinObj);
    }

    // Sort by date ascending (oldest first)
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    this.historiqueFiltre.set(filtered);
  }

  reinitialiserFiltres(): void {
    this.dateDebut = '';
    this.dateFin = '';
    // Update filtered list when resetting filters
    this.historiqueFiltre.set([...this.historique()]);
  }
  
  editerEntry(entry: HistoriqueEntry): void {
    // Save backup for cancel
    this.entryBackup = { ...entry };
    this.entryEnEdition = entry;
  }
  
  annulerEdition(): void {
    // Restore from backup
    if (this.entryBackup && this.entryEnEdition) {
      this.entryEnEdition.mission = this.entryBackup.mission;
      this.entryEnEdition.reunion = this.entryBackup.reunion;
      this.entryEnEdition.commentaires = this.entryBackup.commentaires;
    }
    this.entryEnEdition = null;
    this.entryBackup = null;
  }

  async sauvegarderEntry(entry: HistoriqueEntry): Promise<void> {
    if (!this.canEdit) return;
    await this.dataService.updateHistoriqueEntry(entry);
    this.entryEnEdition = null;
    this.entryBackup = null;
  }

  async supprimerEntry(id: string): Promise<void> {
    if (!this.canEdit) return;
    
    const confirmed = await this.notification.confirm({
      title: 'Supprimer cette entrée ?',
      message: 'Cette action est irréversible. L\'entrée sera définitivement supprimée de l\'historique.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      type: 'danger'
    });
    
    if (confirmed) {
      await this.dataService.deleteHistoriqueEntry(id);
      // Refresh filtered list
      this.appliquerFiltres();
    }
  }

  exporterHistorique(): void {
    const data = this.dataService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exporterExcel(): void {
    this.excelExport.exportHistoriqueToExcel(this.historiqueFiltre());
  }

  exporterPdf(): void {
    this.pdfExport.exportHistoriqueToPdf(this.historiqueFiltre());
  }

  imprimerPdf(): void {
    this.pdfExport.printHistorique(this.historiqueFiltre());
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }
  
  formatDateShort(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  }
}
