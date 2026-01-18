import { Injectable, signal } from '@angular/core';
import { Zone, ZONES } from '../models/zone.model';

const STORAGE_KEY_ZONE_PRIORITIES = 'adammdr_zone_priorities';

/**
 * Service to manage zone priorities
 * Allows dynamic configuration of zone priorities
 */
@Injectable({
  providedIn: 'root'
})
export class ZonePriorityService {
  // Signal for reactive zone priorities
  zonePriorities = signal<Map<string, number>>(this.loadPriorities());

  constructor() {
    // Initialize with default priorities if not set
    if (this.zonePriorities().size === 0) {
      this.initializeDefaultPriorities();
    }
  }

  /**
   * Load priorities from localStorage
   */
  private loadPriorities(): Map<string, number> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ZONE_PRIORITIES);
      if (stored) {
        const data = JSON.parse(stored);
        return new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Error loading zone priorities:', error);
    }
    return new Map();
  }

  /**
   * Save priorities to localStorage
   */
  private savePriorities(): void {
    try {
      const mapObj = Object.fromEntries(this.zonePriorities());
      localStorage.setItem(STORAGE_KEY_ZONE_PRIORITIES, JSON.stringify(mapObj));
    } catch (error) {
      console.error('Error saving zone priorities:', error);
    }
  }

  /**
   * Initialize default priorities from ZONES
   */
  private initializeDefaultPriorities(): void {
    const priorities = new Map<string, number>();
    ZONES.forEach(zone => {
      priorities.set(zone.id, zone.priorite);
    });
    this.zonePriorities.set(priorities);
    this.savePriorities();
  }

  /**
   * Get priority for a zone
   */
  getPriority(zoneId: string): number {
    return this.zonePriorities().get(zoneId) ?? 999;
  }

  /**
   * Set priority for a zone
   */
  setPriority(zoneId: string, priorite: number): void {
    const priorities = new Map(this.zonePriorities());
    priorities.set(zoneId, priorite);
    this.zonePriorities.set(priorities);
    this.savePriorities();
  }

  /**
   * Get zones sorted by priority
   */
  getZonesByPriority(): Zone[] {
    const priorities = this.zonePriorities();
    return [...ZONES].sort((a, b) => {
      const priorityA = priorities.get(a.id) ?? a.priorite;
      const priorityB = priorities.get(b.id) ?? b.priorite;
      return priorityA - priorityB;
    });
  }

  /**
   * Reset to default priorities
   */
  resetToDefaults(): void {
    this.initializeDefaultPriorities();
  }

  /**
   * Get all zones with their current priorities
   */
  getZonesWithPriorities(): { zone: Zone; priorite: number }[] {
    const priorities = this.zonePriorities();
    return ZONES.map(zone => ({
      zone,
      priorite: priorities.get(zone.id) ?? zone.priorite
    }));
  }
}
