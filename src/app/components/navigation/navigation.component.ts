import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="container">
        <div class="nav-brand">
          <h1>Planning ADAMMDR</h1>
        </div>
        <ul class="nav-links">
          <li><a routerLink="/planning" routerLinkActive="active">Planning</a></li>
          <li><a routerLink="/staff" routerLinkActive="active">Staff</a></li>
          <li><a routerLink="/historique" routerLinkActive="active">Historique</a></li>
          <li><a routerLink="/statistiques" routerLinkActive="active">Statistiques</a></li>
          <li><a routerLink="/parametres" routerLinkActive="active">Paramètres</a></li>
        </ul>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background: #2d5016;
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
      color: rgba(255,255,255,0.8);
      font-weight: 500;
      padding: 10px 18px;
      border-radius: 6px;
      transition: all 0.2s ease;
      font-size: 14px;
    }
    
    .nav-links a:hover {
      color: #fff;
      background: rgba(255,255,255,0.1);
    }
    
    .nav-links a.active {
      color: #2d5016;
      background: #c5e1a5;
      font-weight: 600;
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
    }
  `]
})
export class NavigationComponent {
}

