import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx';
import { DataService } from './data.service';
import { PlanningSemaine } from '../models/planning.model';
import { HistoriqueEntry } from '../models/historique.model';
import { DemiJournee, JOURS_SEMAINE } from '../models/agent.model';

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

    // Header row (uppercase for visibility)
    data.push(['JOUR', 'BINÔMES', 'ZONES', 'ECOLE', 'MISSION', 'VOITURE', 'COMMENTAIRES']);

    // Only active days (Monday to Friday)
    const joursActifs = JOURS_SEMAINE.slice(0, 5);

    for (const jour of joursActifs) {
      for (const demiJournee of [DemiJournee.MATIN, DemiJournee.APRES_MIDI]) {
        const entry = planning.entries.find(e => e.jour === jour && e.demiJournee === demiJournee);
        
        const demiJourneeLabel = demiJournee === DemiJournee.MATIN ? 'Matin' : 'Après-midi';
        
        if (entry && entry.groupes.length > 0) {
          entry.groupes.forEach((groupe, index) => {
            const binomes = groupe.agents.map(a => a.nom).join(', ');
            data.push([
              index === 0 ? `${jour} - ${demiJourneeLabel}` : '',
              binomes,
              groupe.zone || '',
              groupe.reunion || '',
              groupe.mission || '',
              groupe.voiture || '',
              groupe.commentaires || ''
            ]);
          });
        } else {
          data.push([
            `${jour} - ${demiJourneeLabel}`,
            '(Aucun binôme)',
            '', '', '', '', ''
          ]);
        }
      }
      // Add empty row between days for readability
      data.push(['', '', '', '', '', '', '']);
    }

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 22 },  // JOUR
      { wch: 28 },  // BINÔMES
      { wch: 12 },  // ZONES
      { wch: 12 },  // ECOLE
      { wch: 20 },  // MISSION
      { wch: 12 },  // VOITURE
      { wch: 28 }   // COMMENTAIRES
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    const dateDebut = this.formatDateForFilename(planning.dateDebut);
    XLSX.utils.book_append_sheet(wb, ws, 'Planning');

    // Download file
    XLSX.writeFile(wb, `Planning_${dateDebut}.xlsx`);
  }

  /**
   * Export historique to Excel
   */
  exportHistoriqueToExcel(historique?: HistoriqueEntry[]): void {
    const data = historique || this.dataService.getHistorique();
    
    const rows: any[] = [];

    // Header row
    rows.push(['DATE', 'JOUR', 'DEMI-JOURNÉE', 'BINÔMES', 'ZONE', 'ECOLE', 'MISSION', 'VOITURE', 'COMMENTAIRES']);

    // Data rows
    data.forEach(entry => {
      rows.push([
        this.formatDate(entry.date),
        entry.jour,
        entry.demiJournee === 'MATIN' ? 'Matin' : 'Après-midi',
        entry.binomes,
        entry.zone || '',
        entry.reunion || '',
        entry.mission || '',
        entry.voiture || '',
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
      { wch: 10 },  // Zone
      { wch: 12 },  // Ecole
      { wch: 18 },  // Mission
      { wch: 12 },  // Voiture
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
    rows.push(['Nom', 'Statut', 'Zones Habituelles', 'Indications Spéciales', 'Disponibilités']);

    // Data rows
    agents.forEach(agent => {
      const disponibilites = agent.disponibilites
        .filter(d => d.disponible)
        .map(d => `${d.jour} ${d.demiJournee === 'MATIN' ? 'Matin' : 'AM'}`)
        .join(', ');

      rows.push([
        agent.nom,
        agent.actif ? 'Actif' : 'Inactif',
        agent.zonesHabituelles?.join(', ') || '',
        agent.indicationsSpeciales || '',
        disponibilites
      ]);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 20 },  // Nom
      { wch: 10 },  // Statut
      { wch: 20 },  // Zones
      { wch: 25 },  // Indications
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
      ['Nom', 'Statut', 'Zones Habituelles', 'Indications Spéciales']
    ];
    agents.forEach(agent => {
      agentsData.push([
        agent.nom,
        agent.actif ? 'Actif' : 'Inactif',
        agent.zonesHabituelles?.join(', ') || '',
        agent.indicationsSpeciales || ''
      ]);
    });
    const wsAgents = XLSX.utils.aoa_to_sheet(agentsData);
    wsAgents['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsAgents, 'Agents');

    // Historique sheet
    const historique = this.dataService.getHistorique();
    const historiqueData = [
      ['Date', 'Jour', 'Demi-journée', 'Binômes', 'Zone', 'Mission', 'Commentaires']
    ];
    historique.forEach(entry => {
      historiqueData.push([
        this.formatDate(entry.date),
        entry.jour,
        entry.demiJournee === 'MATIN' ? 'Matin' : 'Après-midi',
        entry.binomes,
        entry.zone || '',
        entry.mission || '',
        entry.commentaires || ''
      ]);
    });
    const wsHistorique = XLSX.utils.aoa_to_sheet(historiqueData);
    wsHistorique['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsHistorique, 'Historique');

    // Download file
    XLSX.writeFile(wb, `ADAMMDR_Export_${this.formatDateForFilename(new Date())}.xlsx`);
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }

  private formatDateForFilename(date: Date): string {
    return new Date(date).toISOString().split('T')[0];
  }
}

