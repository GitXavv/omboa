import { Component, HostListener, signal } from '@angular/core';

// Header desktop/mobile de la landing page globale, sur le modèle du template
// 2095_level (barre fixe qui rétrécit au scroll, liens en ancre à droite, hamburger
// mobile) — couleurs remplacées par la palette omboa. Distinct du navbar partagé :
// la landing n'a pas de contexte restaurant (pas de recherche/panier/compte ici).
@Component({
  selector: 'app-landing-header',
  standalone: true,
  imports: [],
  templateUrl: './landing-header.component.html',
  styleUrl: './landing-header.component.css'
})
export class LandingHeaderComponent {
  readonly scrolled = signal(false);
  readonly mobileMenuOpen = signal(false);

  private readonly links = [
    { href: '#how-it-works', label: 'Comment ça marche' },
    { href: '#features', label: 'Fonctionnalités' },
    { href: '#fidelite', label: 'Fidélité' },
    { href: '#faq', label: 'FAQ' },
  ];
  readonly navLinks = this.links;

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 100);
  }

  toggleMobileMenu() { this.mobileMenuOpen.update(v => !v); }
  closeMobileMenu()  { this.mobileMenuOpen.set(false); }

  scrollTo(e: Event, href: string) {
    e.preventDefault();
    this.closeMobileMenu();
    const id = href.slice(1);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
