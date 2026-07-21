import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';
import { restaurantResolver } from './core/guards/restaurant.resolver';

export const routes: Routes = [
  // ── Landing page globale (pas de contexte restaurant) ────────
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent)
  },

  // ── Pages "En savoir plus" (liées depuis la landing) ─────────
  {
    path: 'fidelite',
    loadComponent: () => import('./features/fidelite/fidelite.component').then(m => m.FideliteComponent)
  },

  // ── Super admin (page cachée /osuper) ────────────────────────
  {
    path: 'osuper',
    pathMatch: 'full',
    loadComponent: () => import('./features/superadmin/superadmin-login.component').then(m => m.SuperAdminLoginComponent)
  },
  {
    path: 'osuper',
    canActivate: [superAdminGuard],
    loadComponent: () => import('./features/superadmin/superadmin-layout/superadmin-layout.component').then(m => m.SuperAdminLayoutComponent),
    children: [
      { path: 'dashboard',     loadComponent: () => import('./features/superadmin/superadmin-dashboard.component').then(m => m.SuperAdminDashboardComponent) },
      { path: 'logs',          loadComponent: () => import('./features/superadmin/superadmin-logs.component').then(m => m.SuperAdminLogsComponent) },
      { path: 'applications',  loadComponent: () => import('./features/superadmin/superadmin-applications.component').then(m => m.SuperAdminApplicationsComponent) }
    ]
  },

  // ── Tout le reste vit sous /:restaurantSlug/* ────────────────
  {
    path: ':restaurantSlug',
    resolve: { restaurant: restaurantResolver },
    children: [
      {
        path: 'menu',
        loadComponent: () => import('./features/menu/menu.component').then(m => m.MenuComponent)
      },
      {
        path: 'table/:tableId',
        loadComponent: () => import('./features/table/table.component').then(m => m.TableComponent)
      },
      {
        path: 'ma-commande',
        loadComponent: () => import('./features/ma-commande/ma-commande.component').then(m => m.MaCommandeComponent)
      },
      {
        path: 'connexion',
        loadComponent: () => import('./features/auth-page/auth-page.component').then(m => m.AuthPageComponent)
      },
      {
        path: 'account',
        canActivate: [authGuard],
        loadComponent: () => import('./features/account/account.component').then(m => m.AccountComponent)
      },

      // ── Connexion staff (page cachée /:restaurantSlug/ostaff) ──
      {
        path: 'ostaff',
        loadComponent: () => import('./features/staff-login/staff-login.component').then(m => m.StaffLoginComponent)
      },

      // ── Admin (owner) ─────────────────────────────────────────
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['owner'] },
        loadComponent: () => import('./features/admin/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
        children: [
          { path: '',       loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.DashboardComponent) },
          { path: 'orders', loadComponent: () => import('./features/admin/orders/orders.component').then(m => m.OrdersComponent) },
          { path: 'menu',   loadComponent: () => import('./features/admin/menu-management/menu-management.component').then(m => m.MenuManagementComponent) },
          { path: 'tables', loadComponent: () => import('./features/admin/tables/tables.component').then(m => m.TablesComponent) },
          { path: 'logs',   loadComponent: () => import('./features/admin/logs/logs.component').then(m => m.LogsComponent) },
          { path: 'stats',  loadComponent: () => import('./features/admin/stats/stats.component').then(m => m.StatsComponent) },
          { path: 'customers', loadComponent: () => import('./features/admin/customers/customers.component').then(m => m.CustomersComponent) },
          { path: 'settings', loadComponent: () => import('./features/admin/settings/admin-settings.component').then(m => m.AdminSettingsComponent) },

          // Vues admin en lecture seule (sidebar toujours visible) - mêmes composants
          // que les routes staff top-level ci-dessous ; chaque composant se met lui-même
          // en lecture seule via auth.isOwner() (aucune action possible pour l'owner).
          { path: 'kitchen',   loadComponent: () => import('./features/kitchen/kitchen.component').then(m => m.KitchenComponent) },
          { path: 'reception', loadComponent: () => import('./features/reception/reception-dashboard.component').then(m => m.ReceptionDashboardComponent) },
          { path: 'exit',      loadComponent: () => import('./features/exit/dashboard/exit-dashboard.component').then(m => m.ExitDashboardComponent) }
        ]
      },

      // ── Cuisine (cook) ──────────────────────────────────────────
      {
        path: 'kitchen',
        canActivate: [roleGuard],
        data: { roles: ['cook'] },
        loadComponent: () => import('./features/kitchen/kitchen.component').then(m => m.KitchenComponent)
      },

      // ── Réception (front-of-house) ───────────────────────────────
      {
        path: 'reception',
        canActivate: [roleGuard],
        data: { roles: ['receptionist'] },
        loadComponent: () => import('./features/reception/reception-dashboard.component').then(m => m.ReceptionDashboardComponent)
      },

      // ── Sortie (recherche par code + libération de table) ────────
      {
        path: 'exit',
        canActivate: [roleGuard],
        data: { roles: ['exit'] },
        loadComponent: () => import('./features/exit/dashboard/exit-dashboard.component').then(m => m.ExitDashboardComponent)
      },
      {
        path: 'exit/order/:code',
        canActivate: [roleGuard],
        data: { roles: ['exit'] },
        loadComponent: () => import('./features/exit/order-detail/exit-order-detail.component').then(m => m.ExitOrderDetailComponent)
      },

      // Par défaut, un restaurant sans sous-chemin va vers son menu
      { path: '', redirectTo: 'menu', pathMatch: 'full' }
    ]
  },

  // ── Fallback ─────────────────────────────────
  { path: '**', redirectTo: '' }
];
