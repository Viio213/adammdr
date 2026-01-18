import { Routes } from '@angular/router';
import { authGuard, adminGuard, chefEquipeGuard, permissionGuard } from './guards/auth.guard';

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
    canActivate: [authGuard] // All authenticated users except UTILISATEUR can access (checked in component)
  },
  {
    path: 'historique',
    loadComponent: () => import('./components/historique/historique.component').then(m => m.HistoriqueComponent),
    canActivate: [chefEquipeGuard]
  },
  {
    path: 'statistiques',
    loadComponent: () => import('./components/statistiques/statistiques.component').then(m => m.StatistiquesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'parametres',
    loadComponent: () => import('./components/parametres/parametres.component').then(m => m.ParametresComponent),
    canActivate: [chefEquipeGuard]
  },
  {
    path: 'conges',
    loadComponent: () => import('./components/conges/conges.component').then(m => m.CongesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'planning-conges',
    loadComponent: () => import('./components/conges/planning-conges.component').then(m => m.PlanningCongesComponent),
    canActivate: [permissionGuard('canViewPlanningConges')]
  },
  {
    path: 'utilisateurs',
    loadComponent: () => import('./components/utilisateurs/utilisateurs.component').then(m => m.UtilisateursComponent),
    canActivate: [permissionGuard('canManageUsers')]
  },
  {
    path: 'permissions',
    loadComponent: () => import('./components/permissions/permissions.component').then(m => m.PermissionsComponent),
    canActivate: [permissionGuard('canManagePermissions')]
  },
  {
    path: 'mon-compte',
    loadComponent: () => import('./components/mon-compte/mon-compte.component').then(m => m.MonCompteComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: '/planning'
  }
];

