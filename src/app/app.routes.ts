import { Routes } from '@angular/router';
import { authGuard, adminGuard, chefEquipeGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/planning',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'planning',
    loadComponent: () => import('./components/planning/planning.component').then(m => m.PlanningComponent),
    canActivate: [authGuard]
  },
  {
    path: 'staff',
    loadComponent: () => import('./components/staff/staff.component').then(m => m.StaffComponent),
    canActivate: [chefEquipeGuard]
  },
  {
    path: 'historique',
    loadComponent: () => import('./components/historique/historique.component').then(m => m.HistoriqueComponent),
    canActivate: [chefEquipeGuard]
  },
  {
    path: 'statistiques',
    loadComponent: () => import('./components/statistiques/statistiques.component').then(m => m.StatistiquesComponent),
    canActivate: [chefEquipeGuard]
  },
  {
    path: 'parametres',
    loadComponent: () => import('./components/parametres/parametres.component').then(m => m.ParametresComponent),
    canActivate: [chefEquipeGuard]
  },
  {
    path: 'utilisateurs',
    loadComponent: () => import('./components/utilisateurs/utilisateurs.component').then(m => m.UtilisateursComponent),
    canActivate: [adminGuard]
  },
  {
    path: '**',
    redirectTo: '/planning'
  }
];

