import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { RestaurantService } from '../../../core/services/restaurant.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { AuthModalComponent } from '../../../features/auth-modal/auth-modal.component';
import { DecimalPipe } from '@angular/common';

// Header restaurant-scopé (menu/table/ma-commande/account) — clients uniquement.
// Le staff n'apparaît plus jamais ici : il accède à ses interfaces via /:slug/ostaff,
// jamais par une navigation visible dans ce header.
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, DecimalPipe, AuthModalComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  readonly auth  = inject(AuthService);
  readonly cart  = inject(CartService);
  readonly restaurantSvc = inject(RestaurantService);
  readonly authModal = inject(AuthModalService);

  readonly slug = computed(() => this.restaurantSvc.current()?.slug ?? '');

  readonly searchQuery  = signal('');
  readonly userMenuOpen = signal(false);
  readonly cartOpen     = signal(false);

  private readonly router = inject(Router);

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(e => {
      if (!e.urlAfterRedirects.includes('/menu')) this.searchQuery.set('');
      this.userMenuOpen.set(false);
      this.cartOpen.set(false);
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.navbar__user-wrap') && !target.closest('.navbar__cart-wrap') && !target.closest('.bottom-nav-account-wrap')) {
      this.userMenuOpen.set(false);
      this.cartOpen.set(false);
    }
  }

  toggleUserMenu() { this.userMenuOpen.update(v => !v); this.cartOpen.set(false); }
  toggleCart()     { this.cartOpen.update(v => !v);     this.userMenuOpen.set(false); }

  onSearch(e: Event) {
    const q = (e.target as HTMLInputElement).value;
    this.searchQuery.set(q);
    this.router.navigate(['/', this.slug(), 'menu'], { queryParams: q ? { q } : {}, replaceUrl: true });
  }

  clearSearch() {
    this.searchQuery.set('');
    this.router.navigate(['/', this.slug(), 'menu'], { replaceUrl: true });
  }

  logout() { this.auth.logout(); this.userMenuOpen.set(false); }

  get userInitial(): string {
    return this.auth.currentUser()?.full_name?.charAt(0).toUpperCase() ?? '?';
  }

  get userFirstName(): string {
    return this.auth.currentUser()?.full_name ?? '';
  }
}
