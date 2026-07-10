import { Injectable, signal } from '@angular/core';

export type AuthModalTab = 'login' | 'register';

// Le formulaire client (login/inscription) n'est plus une route dédiée — c'est une
// modale accessible depuis n'importe quelle page restaurant-scopée (menu, table,
// ma-commande…), ouverte via ce service et rendue par le navbar.
@Injectable({ providedIn: 'root' })
export class AuthModalService {
  readonly isOpen = signal(false);
  readonly activeTab = signal<AuthModalTab>('login');

  open(tab: AuthModalTab = 'login') {
    this.activeTab.set(tab);
    this.isOpen.set(true);
  }

  close() { this.isOpen.set(false); }
}
