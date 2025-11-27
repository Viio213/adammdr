import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/planning',
    pathMatch: 'full'
  },
  {
    path: 'planning',
    loadComponent: () => import('./components/planning/planning.component').then(m => m.PlanningComponent)
  },
  {
    path: 'staff',
    loadComponent: () => import('./components/staff/staff.component').then(m => m.StaffComponent)
  },
  {
    path: 'historique',
    loadComponent: () => import('./components/historique/historique.component').then(m => m.HistoriqueComponent)
  },
  {
    path: 'statistiques',
    loadComponent: () => import('./components/statistiques/statistiques.component').then(m => m.StatistiquesComponent)
  },
  {
    path: 'parametres',
    loadComponent: () => import('./components/parametres/parametres.component').then(m => m.ParametresComponent)
  }
];

