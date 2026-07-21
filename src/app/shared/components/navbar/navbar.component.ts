import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { RestaurantService } from '../../../core/services/restaurant.service';
import { DecimalPipe } from '@angular/common';

// Header restaurant-scopé (menu/table/ma-commande/account) - clients uniquement.
// Le staff n'apparaît plus jamais ici : il accède à ses interfaces via /:slug/ostaff,
// jamais par une navigation visible dans ce header.
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, DecimalPipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  readonly auth  = inject(AuthService);
  readonly cart  = inject(CartService);
  readonly restaurantSvc = inject(RestaurantService);

  readonly slug = computed(() => this.restaurantSvc.current()?.slug ?? '');

  readonly searchQuery  = signal('');
  readonly userMenuOpen = signal(false);
  readonly cartOpen     = signal(false);

  // Pulsation du bouton "Ma commande" quand TableComponent y ajoute un plat.
  readonly commandePulse = signal(false);
  private commandePulseTimer?: ReturnType<typeof setTimeout>;

  private readonly router = inject(Router);

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(e => {
      if (!e.urlAfterRedirects.includes('/menu')) this.searchQuery.set('');
      this.userMenuOpen.set(false);
      this.cartOpen.set(false);
    });

    this.cart.pulseRequested$.subscribe(() => {
      clearTimeout(this.commandePulseTimer);
      this.commandePulse.set(false);
      // Un tick pour permettre à Angular de retirer puis remettre la classe (redéclenche l'animation CSS)
      requestAnimationFrame(() => {
        this.commandePulse.set(true);
        this.commandePulseTimer = setTimeout(() => this.commandePulse.set(false), 700);
      });
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

  // Client à table : "Menu" revient à l'écran menu de la table (jamais la page menu
  // visiteur - TableComponent gère lui-même son affichage panier/suivi/menu en interne).
  onMenuClick(event: Event) {
    const tableId = this.cart.tableId();
    if (!tableId) return; // visiteur neutre : routerLink navigue normalement vers /menu
    event.preventDefault();
    if (this.router.url.split('?')[0].includes('/table/')) {
      this.cart.requestViewMenu();
    } else {
      this.router.navigate(['/', this.slug(), 'table', tableId]);
    }
  }

  // Bouton "Ma commande" du header - table uniquement (cart.tableId() actif). TableComponent
  // gère lui-même son affichage panier/suivi en interne (pas une route séparée) : si on y est
  // déjà, on le lui demande via CartService ; sinon on y navigue d'abord (son propre ngOnInit
  // résout ensuite le bon écran - panier, suivi, ou menu).
  goToOrder() {
    const tableId = this.cart.tableId();
    if (!tableId) return;
    if (this.router.url.split('?')[0].includes('/table/')) {
      this.cart.requestViewCart();
    } else {
      this.router.navigate(['/', this.slug(), 'table', tableId]);
    }
  }

  get userInitial(): string {
    return this.auth.currentUser()?.full_name?.charAt(0).toUpperCase() ?? '?';
  }

  get userFirstName(): string {
    return this.auth.currentUser()?.full_name ?? '';
  }
}
