import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // ── Pages publiques ──────────────────────────
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'menu',
    loadComponent: () => import('./features/menu/menu.component').then(m => m.MenuComponent)
  },

  // ── Flow QR / commande à table ───────────────
  {
    path: 'table/:tableId',
    loadComponent: () => import('./features/table/table.component').then(m => m.TableComponent)
  },

  // ── Auth ─────────────────────────────────────
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // ── Compte client ────────────────────────────
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/account.component').then(m => m.AccountComponent)
  },

  // ── Admin (owner) ────────────────────────────
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner'] },
    children: [
      {
        path: '',
        loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/admin/orders/orders.component').then(m => m.OrdersComponent)
      },
      {
        path: 'menu',
        loadComponent: () => import('./features/admin/menu-management/menu-management.component').then(m => m.MenuManagementComponent)
      },
      {
        path: 'tables',
        loadComponent: () => import('./features/admin/tables/tables.component').then(m => m.TablesComponent)
      },
      {
        path: 'logs',
        loadComponent: () => import('./features/admin/logs/logs.component').then(m => m.LogsComponent)
      }
    ]
  },

  // ── Cuisine (cook) ───────────────────────────
  {
    path: 'kitchen',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['cook', 'owner'] },
    loadComponent: () => import('./features/kitchen/kitchen.component').then(m => m.KitchenComponent)
  },

  // ── Fallback ─────────────────────────────────
  { path: '**', redirectTo: '' }
];
