import { Injectable } from '@angular/core';
import { PlanningSemaine } from '../models/planning.model';
import { HistoriqueEntry } from '../models/historique.model';
import { StatistiqueBinome, StatistiqueAgent, StatistiqueZone } from '../models/statistiques.model';

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {

  /**
   * Export planning to PDF
   */
  exportPlanningToPdf(planning: PlanningSemaine): void {
    const content = this.generatePlanningHtml(planning);
    this.generatePdf(content, `planning-${this.formatDateFile(planning.dateDebut)}.pdf`);
  }

  /**
   * Print planning
   */
  printPlanning(planning: PlanningSemaine): void {
    const content = this.generatePlanningHtml(planning);
    this.printContent(content);
  }

  /**
   * Export multiple plannings to PDF
   */
  exportPlanningsToPdf(plannings: PlanningSemaine[]): void {
    if (plannings.length === 0) return;

    if (plannings.length === 1) {
      // Single planning: use existing method
      this.exportPlanningToPdf(plannings[0]);
      return;
    }

    // Multiple plannings: combine into one PDF
    const contents = plannings.map(p => this.generatePlanningHtml(p));
    const combinedContent = contents.join('<div style="page-break-after: always;"></div>');
    
    const dateDebut = this.formatDateFile(plannings[0].dateDebut);
    const dateFin = this.formatDateFile(plannings[plannings.length - 1].dateFin);
    const filename = `plannings-${dateDebut}_${dateFin}.pdf`;
    
    this.generatePdf(combinedContent, filename);
  }

  /**
   * Export historique to PDF
   */
  exportHistoriqueToPdf(historique: HistoriqueEntry[]): void {
    const content = this.generateHistoriqueHtml(historique);
    this.generatePdf(content, `historique-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  /**
   * Print historique
   */
  printHistorique(historique: HistoriqueEntry[]): void {
    const content = this.generateHistoriqueHtml(historique);
    this.printContent(content);
  }

  /**
   * Export statistics to PDF
   */
  exportStatistiquesToPdf(
    binomes: StatistiqueBinome[], 
    agents: StatistiqueAgent[], 
    zones: StatistiqueZone[]
  ): void {
    const content = this.generateStatistiquesHtml(binomes, agents, zones);
    this.generatePdf(content, `statistiques-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  /**
   * Print statistics
   */
  printStatistiques(
    binomes: StatistiqueBinome[], 
    agents: StatistiqueAgent[], 
    zones: StatistiqueZone[]
  ): void {
    const content = this.generateStatistiquesHtml(binomes, agents, zones);
    this.printContent(content);
  }

  /**
   * Generate PDF from HTML content
   */
  private generatePdf(content: string, filename: string): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Veuillez autoriser les popups pour exporter en PDF');
      return;
    }

    printWindow.document.write(this.wrapInHtmlDocument(content));
    printWindow.document.close();

    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }

  /**
   * Print content directly
   */
  private printContent(content: string): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Veuillez autoriser les popups pour imprimer');
      return;
    }

    printWindow.document.write(this.wrapInHtmlDocument(content));
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  }

  /**
   * Generate planning HTML
   */
  private generatePlanningHtml(planning: PlanningSemaine): string {
    const dateDebut = this.formatDate(planning.dateDebut);
    const dateFin = this.formatDate(planning.dateFin);

    let html = `
      <div class="header">
        <h1>SmartPlanner - Planning de la Semaine</h1>
        <p class="subtitle">Du ${dateDebut} au ${dateFin}</p>
        ${planning.isConfirmed ? '<p class="status">Planning confirmé</p>' : ''}
      </div>
      <table>
        <thead>
          <tr>
            <th>Jour</th>
            <th>Période</th>
            <th>Binômes</th>
            <th>Zone</th>
            <th>Véhicule</th>
            <th>Mission</th>
            <th>Réunion</th>
            <th>Commentaires</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const jour of planning.jours) {
      // Morning groups
      for (let i = 0; i < Math.max(jour.matin.groupes.length, 1); i++) {
        const groupe = jour.matin.groupes[i];
        html += `
          <tr>
            ${i === 0 ? `<td class="jour-cell" rowspan="${Math.max(jour.matin.groupes.length, 1) + Math.max(jour.apresMidi.groupes.length, 1)}">${jour.jour}<br/><small>${this.formatDate(jour.date)}</small></td>` : ''}
            ${i === 0 ? `<td class="periode-cell matin" rowspan="${Math.max(jour.matin.groupes.length, 1)}">Matin</td>` : ''}
            <td>${groupe ? groupe.agents.map(a => a.nom).join(' / ') : '-'}</td>
            <td>${groupe?.zoneId ? this.getZoneName(groupe.zoneId) : '-'}</td>
            <td>${groupe?.vehicule ? 'OUI' : 'NON'}</td>
            <td>${groupe?.mission || '-'}</td>
            <td>${groupe?.reunion || '-'}</td>
            <td>${groupe?.commentaires || '-'}</td>
          </tr>
        `;
      }

      // Afternoon groups
      for (let i = 0; i < Math.max(jour.apresMidi.groupes.length, 1); i++) {
        const groupe = jour.apresMidi.groupes[i];
        html += `
          <tr>
            ${i === 0 ? `<td class="periode-cell aprem" rowspan="${Math.max(jour.apresMidi.groupes.length, 1)}">Après-midi</td>` : ''}
            <td>${groupe ? groupe.agents.map(a => a.nom).join(' / ') : '-'}</td>
            <td>${groupe?.zoneId ? this.getZoneName(groupe.zoneId) : '-'}</td>
            <td>${groupe?.vehicule ? 'OUI' : 'NON'}</td>
            <td>${groupe?.mission || '-'}</td>
            <td>${groupe?.reunion || '-'}</td>
            <td>${groupe?.commentaires || '-'}</td>
          </tr>
        `;
      }
    }

    html += `
        </tbody>
      </table>
    `;

    return html;
  }

  /**
   * Generate historique HTML
   */
  private generateHistoriqueHtml(historique: HistoriqueEntry[]): string {
    let html = `
      <div class="header">
        <h1>SmartPlanner - Historique des Plannings</h1>
        <p class="subtitle">Exporté le ${new Date().toLocaleDateString('fr-FR')}</p>
        <p class="count">${historique.length} entrée(s)</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Jour</th>
            <th>Période</th>
            <th>Binômes</th>
            <th>Zone</th>
            <th>Véhicule</th>
            <th>Mission</th>
            <th>Réunion</th>
            <th>Commentaires</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const entry of historique) {
      html += `
        <tr>
          <td>${this.formatDate(entry.date)}</td>
          <td>${entry.jour}</td>
          <td>${entry.demiJournee === 'MATIN' ? 'Matin' : 'Après-midi'}</td>
          <td><strong>${entry.binomes}</strong></td>
          <td>${entry.zoneName || '-'}</td>
          <td>${entry.vehicule ? 'OUI' : 'NON'}</td>
          <td>${entry.mission || '-'}</td>
          <td>${entry.reunion || '-'}</td>
          <td>${entry.commentaires || '-'}</td>
        </tr>
      `;
    }

    html += `
        </tbody>
      </table>
    `;

    return html;
  }

  /**
   * Generate statistics HTML
   */
  private generateStatistiquesHtml(
    binomes: StatistiqueBinome[], 
    agents: StatistiqueAgent[], 
    zones: StatistiqueZone[]
  ): string {
    let html = `
      <div class="header">
        <h1>SmartPlanner - Statistiques</h1>
        <p class="subtitle">Exporté le ${new Date().toLocaleDateString('fr-FR')}</p>
      </div>

      <h2>Paires d'agents les plus fréquentes</h2>
      <table>
        <thead>
          <tr>
            <th>Agent 1</th>
            <th>Agent 2</th>
            <th>Occurrences</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const stat of binomes.slice(0, 10)) {
      html += `
        <tr>
          <td>${stat.agent1}</td>
          <td>${stat.agent2}</td>
          <td>${stat.nombreOccurrences}</td>
        </tr>
      `;
    }

    html += `
        </tbody>
      </table>

      <h2>Détails par Agent</h2>
      <table>
        <thead>
          <tr>
            <th>Agent</th>
            <th>Total</th>
            <th>Matin</th>
            <th>Après-midi</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const agent of agents) {
      html += `
        <tr>
          <td>${agent.nom}</td>
          <td>${agent.nombreTotal}</td>
          <td>${agent.nombreMatin}</td>
          <td>${agent.nombreApresMidi}</td>
        </tr>
      `;
    }

    html += `
        </tbody>
      </table>

      <h2>Répartition par Zone</h2>
      <table>
        <thead>
          <tr>
            <th>Zone</th>
            <th>Occurrences</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const zone of zones) {
      html += `
        <tr>
          <td>${zone.zoneName}</td>
          <td>${zone.nombreOccurrences}</td>
          <td>${zone.isExterieur ? 'Extérieur' : 'Intérieur'}</td>
        </tr>
      `;
    }

    html += `
        </tbody>
      </table>
    `;

    return html;
  }

  /**
   * Wrap content in full HTML document
   */
  private wrapInHtmlDocument(content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SmartPlanner - Export</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #4a6fa5;
          }
          .header h1 {
            color: #4a6fa5;
            font-size: 24px;
            margin-bottom: 8px;
          }
          .header .subtitle {
            font-size: 14px;
            color: #666;
          }
          .header .status {
            margin-top: 8px;
            font-weight: 600;
          }
          .header .count {
            color: #666;
            margin-top: 8px;
          }
          h2 {
            color: #4a6fa5;
            font-size: 16px;
            margin: 20px 0 10px 0;
            padding-bottom: 5px;
            border-bottom: 1px solid #e0e0e0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 8px 10px;
            text-align: left;
            border: 1px solid #ddd;
          }
          th {
            background: #4a6fa5;
            color: white;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
          }
          tbody tr:nth-child(even) {
            background: #f9f9f9;
          }
          .jour-cell {
            background: #7da0d4;
            color: #1e3a5f;
            font-weight: 700;
            vertical-align: top;
          }
          .periode-cell {
            font-weight: 600;
            vertical-align: middle;
          }
          .periode-cell.matin {
            background: #e8f1fb;
            color: #3d5a87;
          }
          .periode-cell.aprem {
            background: #d4e4f7;
            color: #3d5a87;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #999;
            border-top: 1px solid #e0e0e0;
            padding-top: 20px;
          }
          @media print {
            body {
              padding: 10px;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
          }
        </style>
      </head>
      <body>
        ${content}
        <div class="footer">
          Développé par Fetchit SRL - SmartPlanner © ${new Date().getFullYear()}
        </div>
      </body>
      </html>
    `;
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private formatDateFile(date: Date): string {
    return new Date(date).toISOString().split('T')[0];
  }

  private getZoneName(zoneId: string): string {
    const zoneNames: { [key: string]: string } = {
      'zone1': 'Z1 - Saint-Servais',
      'zone2': 'Z2 - Centre Ouest',
      'zone3': 'Z3 - Centre Est',
      'zone4': 'Z4 - Jambes'
    };
    return zoneNames[zoneId] || zoneId;
  }
}

