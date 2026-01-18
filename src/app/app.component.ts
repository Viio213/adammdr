import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './components/navigation/navigation.component';
import { GlobalModalComponent } from './components/shared/global-modal.component';
import { AutoValidationService } from './services/auto-validation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavigationComponent, GlobalModalComponent],
  template: `
    <div class="app-container">
      <app-navigation></app-navigation>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
      <footer class="app-footer">
        <div class="footer-content">
          <span class="footer-text">Développé par <strong>Fetchit SRL</strong></span>
          <span class="footer-separator">|</span>
          <span class="footer-version">SmartPlanner © {{ currentYear }}</span>
        </div>
      </footer>
    </div>
    
    <!-- Global notification modal -->
    <app-global-modal></app-global-modal>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
    }
    
    .main-content {
      flex: 1;
      padding: 0;
    }

    .app-footer {
      background: linear-gradient(135deg, #3d5a87 0%, #4a6fa5 100%);
      color: rgba(255, 255, 255, 0.9);
      padding: 16px 24px;
      text-align: center;
      margin-top: auto;
    }

    .footer-content {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .footer-text {
      font-size: 13px;
    }

    .footer-text strong {
      color: #b8d0ed;
      font-weight: 600;
    }

    .footer-separator {
      color: rgba(255, 255, 255, 0.4);
    }

    .footer-version {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
    }

    @media (max-width: 480px) {
      .footer-content {
        flex-direction: column;
        gap: 4px;
      }
      .footer-separator {
        display: none;
      }
    }
  `]
})
export class AppComponent {
  title = 'SmartPlanner';
  currentYear = new Date().getFullYear();
  
  // Inject auto-validation service to start it
  private autoValidation = inject(AutoValidationService);
}
