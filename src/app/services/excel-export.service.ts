import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx';
import { DataService } from './data.service';
import { PlanningSemaine } from '../models/planning.model';
import { HistoriqueEntry } from '../models/historique.model';
import { DemiJournee, JOURS_TRAVAIL } from '../models/agent.model';
import { ZONES } from '../models/zone.model';

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {
  private dataService = inject(DataService);

  /**
   * Export current planning to Excel
   */
  exportPlanningToExcel(planning: PlanningSemaine): void {
    const data: any[] = [];

    // Header row
    data.push(['JOUR', 'PÉRIODE', 'BINÔMES', 'ZONES', 'VÉHICULE', 'MISSION', 'RÉUNION', 'COMMENTAIRES']);

    // Use the new jours structure
    for (const jourPlanning of planning.jours) {
      // Morning groups
      if (jourPlanning.matin.groupes.length > 0) {
        jourPlanning.matin.groupes.forEach((groupe, index) => {
          const binomes = groupe.agents.map(a => a.nom).join(' / ');
          const zone = groupe.zoneId ? ZONES.find(z => z.id === groupe.zoneId) : null;
          data.push([
            index === 0 ? jourPlanning.jour : '',
            index === 0 ? 'Matin' : '',
            binomes,
            zone ? zone.nom : '',
            groupe.vehicule ? 'OUI' : 'NON',
            groupe.mission || '',
            groupe.reunion || '',
            groupe.commentaires || ''
          ]);
        });
      } else {
        data.push([jourPlanning.jour, 'Matin', '(Aucun)', '', '', '', '', '']);
      }

      // Afternoon groups
      if (jourPlanning.apresMidi.groupes.length > 0) {
        jourPlanning.apresMidi.groupes.forEach((groupe, index) => {
          const binomes = groupe.agents.map(a => a.nom).join(' / ');
          const zone = groupe.zoneId ? ZONES.find(z => z.id === groupe.zoneId) : null;
          data.push([
            '',
            index === 0 ? 'Après-midi' : '',
            binomes,
            zone ? zone.nom : '',
            groupe.vehicule ? 'OUI' : 'NON',
            groupe.mission || '',
            groupe.reunion || '',
            groupe.commentaires || ''
          ]);
        });
      } else {
        data.push(['', 'Après-midi', '(Aucun)', '', '', '', '', '']);
      }

      // Empty row between days
      data.push(['', '', '', '', '', '', '', '']);
    }

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 },  // JOUR
      { wch: 12 },  // PÉRIODE
      { wch: 20 },  // BINÔMES
      { wch: 25 },  // ZONES
      { wch: 10 },  // VÉHICULE
      { wch: 18 },  // MISSION
      { wch: 18 },  // RÉUNION
      { wch: 25 }   // COMMENTAIRES
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    const dateDebut = this.formatDateForFilename(planning.dateDebut);
    XLSX.utils.book_append_sheet(wb, ws, 'Planning');

    // Download file
    XLSX.writeFile(wb, `Planning_${dateDebut}.xlsx`);
  }

  /**
   * Export multiple plannings to Excel (one sheet per planning)
   */
  exportPlanningsToExcel(plannings: PlanningSemaine[]): void {
    if (plannings.length === 0) return;

    const wb = XLSX.utils.book_new();

    plannings.forEach((planning, index) => {
      const data: any[] = [];

      // Header row
      data.push(['JOUR', 'PÉRIODE', 'BINÔMES', 'ZONES', 'ÉCOLE', 'VÉHICULE', 'MISSION', 'RÉUNION', 'COMMENTAIRES']);

      // Use the new jours structure
      for (const jourPlanning of planning.jours) {
        // Morning groups
        if (jourPlanning.matin.groupes.length > 0) {
          jourPlanning.matin.groupes.forEach((groupe, idx) => {
            const binomes = groupe.agents.map(a => a.nom).join(' / ');
            const zone = groupe.zoneId ? ZONES.find(z => z.id === groupe.zoneId) : null;
            const ecole = groupe.ecoleId ? zone?.ecoles.find(e => e.id === groupe.ecoleId) : null;
            data.push([
              idx === 0 ? jourPlanning.jour : '',
              idx === 0 ? 'Matin' : '',
              binomes,
              zone ? zone.nom : '',
              ecole ? ecole.nom : '',
              groupe.vehicule ? 'OUI' : 'NON',
              groupe.mission || '',
              groupe.reunion || '',
              groupe.commentaires || ''
            ]);
          });
        } else {
          data.push([jourPlanning.jour, 'Matin', '(Aucun)', '', '', '', '', '', '']);
        }

        // Afternoon groups
        if (jourPlanning.apresMidi.groupes.length > 0) {
          jourPlanning.apresMidi.groupes.forEach((groupe, idx) => {
            const binomes = groupe.agents.map(a => a.nom).join(' / ');
            const zone = groupe.zoneId ? ZONES.find(z => z.id === groupe.zoneId) : null;
            const ecole = groupe.ecoleId ? zone?.ecoles.find(e => e.id === groupe.ecoleId) : null;
            data.push([
              idx === 0 ? '' : '',
              idx === 0 ? 'Après-midi' : '',
              binomes,
              zone ? zone.nom : '',
              ecole ? ecole.nom : '',
              groupe.vehicule ? 'OUI' : 'NON',
              groupe.mission || '',
              groupe.reunion || '',
              groupe.commentaires || ''
            ]);
          });
        } else {
          data.push(['', 'Après-midi', '(Aucun)', '', '', '', '', '', '']);
        }
      }

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(data);

      // Set column widths
      ws['!cols'] = [
        { wch: 12 }, // JOUR
        { wch: 12 }, // PÉRIODE
        { wch: 20 }, // BINÔMES
        { wch: 15 }, // ZONES
        { wch: 12 }, // ÉCOLE
        { wch: 10 }, // VÉHICULE
        { wch: 20 }, // MISSION
        { wch: 15 }, // RÉUNION
        { wch: 25 }  // COMMENTAIRES
      ];

      // Sheet name (limit to 31 chars for Excel)
      const dateDebut = this.formatDateForFilename(planning.dateDebut);
      const sheetName = `Planning_${dateDebut}`.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // Download file
    const dateDebut = this.formatDateForFilename(plannings[0].dateDebut);
    const dateFin = this.formatDateForFilename(plannings[plannings.length - 1].dateFin);
    const filename = plannings.length === 1 
      ? `Planning_${dateDebut}.xlsx`
      : `Plannings_${dateDebut}_${dateFin}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  /**
   * Export historique to Excel
   */
  exportHistoriqueToExcel(historique?: HistoriqueEntry[]): void {
    const data = historique || this.dataService.getHistorique();
    
    const rows: any[] = [];

    // Header row
    rows.push(['DATE', 'JOUR', 'DEMI-JOURNÉE', 'BINÔMES', 'ZONE', 'VÉHICULE', 'MISSION', 'RÉUNION', 'COMMENTAIRES']);

    // Data rows
    data.forEach(entry => {
      rows.push([
        this.formatDate(entry.date),
        entry.jour,
        entry.demiJournee === 'MATIN' ? 'Matin' : 'Après-midi',
        entry.binomes,
        entry.zoneName || '',
        entry.vehicule ? 'OUI' : 'NON',
        entry.mission || '',
        entry.reunion || '',
        entry.commentaires || ''
      ]);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 },  // Date
      { wch: 12 },  // Jour
      { wch: 14 },  // Demi-journée
      { wch: 28 },  // Binômes
      { wch: 20 },  // Zone
      { wch: 10 },  // Véhicule
      { wch: 18 },  // Mission
      { wch: 18 },  // Réunion
      { wch: 25 }   // Commentaires
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historique');

    // Download file
    const today = this.formatDateForFilename(new Date());
    XLSX.writeFile(wb, `Historique_${today}.xlsx`);
  }

  /**
   * Export agents to Excel
   */
  exportAgentsToExcel(): void {
    const agents = this.dataService.getAgents();
    const rows: any[] = [];

    // Header row
    rows.push(['Nom', 'Type Contrat', 'Statut', 'Indications Spéciales', 'Disponibilités']);

    // Data rows
    agents.forEach(agent => {
      const disponibilites = agent.disponibilites
        .filter(d => d.disponible)
        .map(d => `${d.jour} ${d.demiJournee === 'MATIN' ? 'Matin' : 'AM'}`)
        .join(', ');

      rows.push([
        agent.nom,
        agent.typeContrat || 'TEMPS_PLEIN',
        agent.enService ? 'En service' : 'Hors service',
        agent.indicationsSpeciales || '',
        disponibilites
      ]);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 },  // Nom
      { wch: 15 },  // Type Contrat
      { wch: 10 },  // Statut
      { wch: 30 },  // Indications
      { wch: 50 }   // Disponibilités
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Agents');

    // Download file
    XLSX.writeFile(wb, `Agents_${this.formatDateForFilename(new Date())}.xlsx`);
  }

  /**
   * Export all data to Excel (multiple sheets)
   */
  exportAllToExcel(): void {
    const wb = XLSX.utils.book_new();

    // Agents sheet
    const agents = this.dataService.getAgents();
    const agentsData = [
      ['Nom', 'Type Contrat', 'Statut', 'Indications Spéciales']
    ];
    agents.forEach(agent => {
      agentsData.push([
        agent.nom,
        agent.typeContrat || 'TEMPS_PLEIN',
        agent.enService ? 'En service' : 'Hors service',
        agent.indicationsSpeciales || ''
      ]);
    });
    const wsAgents = XLSX.utils.aoa_to_sheet(agentsData);
    wsAgents['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsAgents, 'Agents');

    // Historique sheet
    const historique = this.dataService.getHistorique();
    const historiqueData = [
      ['Date', 'Jour', 'Demi-journée', 'Binômes', 'Zone', 'Véhicule', 'Mission', 'Commentaires']
    ];
    historique.forEach(entry => {
      historiqueData.push([
        this.formatDate(entry.date),
        entry.jour,
        entry.demiJournee === 'MATIN' ? 'Matin' : 'Après-midi',
        entry.binomes,
        entry.zoneName || '',
        entry.vehicule ? 'OUI' : 'NON',
        entry.mission || '',
        entry.commentaires || ''
      ]);
    });
    const wsHistorique = XLSX.utils.aoa_to_sheet(historiqueData);
    wsHistorique['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 18 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsHistorique, 'Historique');

    // Download file
    XLSX.writeFile(wb, `planner_Export_${this.formatDateForFilename(new Date())}.xlsx`);
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }

  private formatDateForFilename(date: Date): string {
    return new Date(date).toISOString().split('T')[0];
  }
}

