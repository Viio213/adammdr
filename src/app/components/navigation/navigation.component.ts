import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ROLE_LABELS } from '../../models/user.model';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar" *ngIf="authService.isLoggedIn()">
      <div class="container">
        <div class="nav-brand">
          <h1>SmartPlanner</h1>
        </div>
        <ul class="nav-links">
          <li><a routerLink="/planning" routerLinkActive="active">Planning</a></li>
          <li *ngIf="canAccessStaff()"><a routerLink="/staff" routerLinkActive="active">Disponibilités</a></li>
          <li><a routerLink="/conges" routerLinkActive="active">Congés</a></li>
          <li *ngIf="canViewPlanningConges()"><a routerLink="/planning-conges" routerLinkActive="active">Planning Congés</a></li>
          <li *ngIf="canAccessHistorique()"><a routerLink="/historique" routerLinkActive="active">Historique</a></li>
          <li *ngIf="canAccessStatistiques()"><a routerLink="/statistiques" routerLinkActive="active">Statistiques</a></li>
          <li *ngIf="canAccessParametres()"><a routerLink="/parametres" routerLinkActive="active">Paramètres</a></li>
          <li *ngIf="canManageUsers()"><a routerLink="/utilisateurs" routerLinkActive="active">Utilisateurs</a></li>
          <li><a routerLink="/mon-compte" routerLinkActive="active">Mon compte</a></li>
        </ul>
        <div class="nav-user">
          <div class="user-info">
            <span class="user-name">{{ getUserName() }}</span>
            <span class="user-role">{{ getUserRole() }}</span>
          </div>
          <button class="btn-logout" (click)="logout()">
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background: #4a6fa5;
      padding: 0;
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    
    .navbar .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 60px;
    }
    
    .nav-brand h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      letter-spacing: 0.5px;
    }
    
    .nav-links {
      display: flex;
      list-style: none;
      gap: 4px;
      margin: 0;
      padding: 0;
      height: 100%;
      align-items: center;
    }
    
    .nav-links a {
      text-decoration: none;
      color: rgba(255,255,255,0.85);
      font-weight: 500;
      padding: 10px 18px;
      border-radius: 6px;
      transition: all 0.2s ease;
      font-size: 14px;
    }
    
    .nav-links a:hover {
      color: #fff;
      background: rgba(255,255,255,0.15);
    }
    
    .nav-links a.active {
      color: #3d5a87;
      background: #e8f1fb;
      font-weight: 600;
    }
    
    .nav-user {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .user-name {
      color: #fff;
      font-weight: 600;
      font-size: 14px;
    }

    .user-role {
      color: rgba(255,255,255,0.7);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .btn-logout {
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.3);
      color: #fff;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-logout:hover {
      background: rgba(255,255,255,0.25);
      border-color: rgba(255,255,255,0.5);
    }

    @media (max-width: 768px) {
      .navbar .container {
        flex-direction: column;
        height: auto;
        padding: 12px 16px;
        gap: 12px;
      }
      
      .nav-links {
        width: 100%;
        flex-wrap: wrap;
        justify-content: center;
        gap: 4px;
      }
      
      .nav-links a {
        padding: 8px 14px;
        font-size: 13px;
      }

      .nav-user {
        width: 100%;
        justify-content: space-between;
        padding-top: 12px;
        border-top: 1px solid rgba(255,255,255,0.2);
      }

      .user-info {
        align-items: flex-start;
      }
    }
  `]
})
export class NavigationComponent {
  authService = inject(AuthService);

  canAccessStaff(): boolean {
    return this.authService.hasPermission('canViewStaff');
  }

  canAccessHistorique(): boolean {
    return this.authService.hasPermission('canViewHistorique');
  }

  canAccessStatistiques(): boolean {
    return this.authService.hasPermission('canViewStatistiques');
  }

  canAccessParametres(): boolean {
    return this.authService.hasPermission('canViewParametres');
  }

  canManageUsers(): boolean {
    return this.authService.hasPermission('canManageUsers');
  }

  canViewPlanningConges(): boolean {
    return this.authService.hasPermission('canViewStaff');
  }

  getUserName(): string {
    const user = this.authService.currentUser();
    return user ? `${user.prenom} ${user.nom}` : '';
  }

  getUserRole(): string {
    const user = this.authService.currentUser();
    return user ? ROLE_LABELS[user.role] : '';
  }

  logout(): void {
    this.authService.logout();
  }
}

