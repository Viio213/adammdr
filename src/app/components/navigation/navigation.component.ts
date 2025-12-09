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
      background: linear-gradient(135deg, #4a6fa5 0%, #5b9bd5 100%);
      padding: 0;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .navbar .container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 0 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 64px;
      gap: 20px;
    }
    
    .nav-brand {
      flex-shrink: 0;
    }
    
    .nav-brand h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    
    .nav-links {
      display: flex;
      list-style: none;
      gap: 2px;
      margin: 0;
      padding: 0;
      height: 100%;
      align-items: center;
      flex: 1;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    
    .nav-links::-webkit-scrollbar {
      display: none;
    }
    
    .nav-links li {
      flex-shrink: 0;
    }
    
    .nav-links a {
      text-decoration: none;
      color: rgba(255,255,255,0.9);
      font-weight: 500;
      padding: 8px 12px;
      border-radius: 6px;
      transition: all 0.2s ease;
      font-size: 13px;
      white-space: nowrap;
      display: inline-block;
    }
    
    .nav-links a:hover {
      color: #fff;
      background: rgba(255,255,255,0.2);
    }
    
    .nav-links a.active {
      color: #1e293b;
      background: #fff;
      font-weight: 600;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .nav-user {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
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
      font-size: 13px;
      white-space: nowrap;
    }

    .user-role {
      color: rgba(255,255,255,0.75);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .btn-logout {
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      color: #fff;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .btn-logout:hover {
      background: rgba(255,255,255,0.3);
      border-color: rgba(255,255,255,0.5);
      transform: translateY(-1px);
    }

    @media (max-width: 1200px) {
      .nav-links a {
        padding: 8px 10px;
        font-size: 12px;
      }
      
      .user-name {
        font-size: 12px;
      }
      
      .btn-logout {
        padding: 6px 12px;
        font-size: 11px;
      }
    }

    @media (max-width: 768px) {
      .navbar .container {
        flex-wrap: wrap;
        height: auto;
        padding: 12px 16px;
        gap: 12px;
      }
      
      .nav-brand {
        width: 100%;
      }
      
      .nav-links {
        width: 100%;
        flex-wrap: wrap;
        justify-content: flex-start;
        gap: 4px;
        max-height: none;
        overflow: visible;
      }
      
      .nav-links a {
        padding: 6px 10px;
        font-size: 12px;
      }

      .nav-user {
        width: 100%;
        justify-content: space-between;
        padding-top: 8px;
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

