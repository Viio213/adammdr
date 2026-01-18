import { Injectable, inject } from '@angular/core';
import { DataService } from './data.service';
import { PlanningGeneratorService } from './planning-generator.service';
import { NotificationService } from './notification.service';

/**
 * Service for automatic planning validation
 * Validates all unconfirmed plannings every Saturday at 17:00
 */
@Injectable({
  providedIn: 'root'
})
export class AutoValidationService {
  private dataService = inject(DataService);
  private planningGenerator = inject(PlanningGeneratorService);
  private notification = inject(NotificationService);
  
  private checkInterval: any = null;
  private lastCheckDate: Date | null = null;

  constructor() {
    this.startAutoValidation();
  }

  /**
   * Start the automatic validation process
   * Checks every minute if it's Saturday 17:00
   */
  startAutoValidation(): void {
    // Check immediately on startup
    this.checkAndValidate();

    // Then check every minute
    this.checkInterval = setInterval(() => {
      this.checkAndValidate();
    }, 60000); // Check every minute
  }

  /**
   * Stop the automatic validation process
   */
  stopAutoValidation(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check if it's Saturday 17:00 and validate plannings if needed
   */
  private async checkAndValidate(): Promise<void> {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Check if it's Saturday between 17:00 and 17:59
    if (dayOfWeek === 6 && hour === 17) {
      // Check if we already validated today
      const today = now.toDateString();
      if (this.lastCheckDate?.toDateString() === today) {
        return; // Already validated today
      }

      // Validate all unconfirmed plannings
      await this.validateUnconfirmedPlannings();
      this.lastCheckDate = now;
    }
  }

  /**
   * Validate only the planning for the upcoming week (next Monday)
   * This runs every Saturday at 17:00 to validate the week starting next Monday
   */
  private async validateUnconfirmedPlannings(): Promise<void> {
    try {
      const allPlannings = this.dataService.getPlannings();
      
      // Calculate next Monday (the week to validate)
      const now = new Date();
      const nextMonday = this.getNextMonday(now);
      
      // Find the planning for next week (starting on next Monday)
      const planningForNextWeek = allPlannings.find(p => {
        const planningDate = new Date(p.dateDebut);
        const planningDateStr = planningDate.toISOString().split('T')[0];
        const nextMondayStr = nextMonday.toISOString().split('T')[0];
        return planningDateStr === nextMondayStr && !p.isConfirmed;
      });

      if (!planningForNextWeek) {
        console.log(`No unconfirmed planning found for next week (${nextMonday.toLocaleDateString('fr-FR')})`);
        return; // No planning to validate for next week
      }

      try {
        // Confirm and save to history
        await this.dataService.confirmPlanning(planningForNextWeek);
        
        // Convert to historique entries
        const historiqueEntries = this.planningGenerator.planningToHistorique(planningForNextWeek);
        await this.dataService.addHistoriqueEntries(historiqueEntries);

        console.log(`Planning for week ${nextMonday.toLocaleDateString('fr-FR')} automatically validated on ${new Date().toISOString()}`);
      } catch (error) {
        console.error(`Error validating planning for next week:`, error);
      }

      // Refresh plannings to get updated data
      await this.dataService.refreshPlannings();
    } catch (error) {
      console.error('Error in auto-validation:', error);
    }
  }

  /**
   * Get the next Monday from a given date
   */
  private getNextMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday, 6 = Saturday
    const daysUntilMonday = day === 0 ? 1 : (8 - day); // If Sunday, next Monday is tomorrow. Otherwise, calculate days until next Monday
    d.setDate(d.getDate() + daysUntilMonday);
    // Set to start of day
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Manually trigger validation (for testing)
   */
  async manualValidate(): Promise<void> {
    await this.validateUnconfirmedPlannings();
  }
}
