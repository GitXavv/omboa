import { Component, OnDestroy, signal, inject, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { SuperAdminAuthService } from '../../../core/services/super-admin-auth.service';

// Enveloppe /osuper/dashboard, /osuper/logs et /osuper/applications - sidebar façon
// AdminLayoutComponent (restaurant), pour ne plus avoir une page super admin "vide".
@Component({
  selector: 'app-superadmin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './superadmin-layout.component.html',
  styleUrl: './superadmin-layout.component.css'
})
export class SuperAdminLayoutComponent implements OnDestroy {
  readonly auth = inject(SuperAdminAuthService);
  private readonly router = inject(Router);

  readonly mobileOpen = signal(false);
  private sub: Subscription;

  constructor() {
    this.sub = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(() => this.mobileOpen.set(false));
  }

  ngOnDestroy() { this.sub.unsubscribe(); }

  @HostListener('document:keydown.escape')
  onEscape() { this.mobileOpen.set(false); }

  toggleMobile() { this.mobileOpen.update(v => !v); }
  closeMobile()  { this.mobileOpen.set(false); }
}
