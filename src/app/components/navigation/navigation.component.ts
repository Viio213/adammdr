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
      background: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      padding: 16px 0;
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    
    .navbar .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .nav-brand h1 {
      margin: 0;
      font-size: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .nav-links {
      display: flex;
      list-style: none;
      gap: 24px;
      margin: 0;
      padding: 0;
    }
    
    .nav-links a {
      text-decoration: none;
      color: #555;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 6px;
      transition: all 0.3s ease;
    }
    
    .nav-links a:hover,
    .nav-links a.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    @media (max-width: 768px) {
      .navbar .container {
        flex-direction: column;
        gap: 16px;
      }
      
      .nav-links {
        flex-wrap: wrap;
        justify-content: center;
        gap: 12px;
      }
    }
  `]
})
export class NavigationComponent {
}

