import { Injectable } from '@angular/core';

// Son + notification navigateur pour les nouvelles commandes (réception/cuisine).
// Même approche que Djelica : pas de vraie push en arrière-plan (aucun Service
// Worker), ça ne fonctionne que si l'onglet/app reste ouvert(e). iOS Safari a un
// support très limité de l'API Notification hors PWA installée.
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private lastNewOrderSoundAt = 0;
  private readonly THROTTLE_MS = 5000;

  requestPermission() {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  // Nouvelle commande / commande acceptée — throttlé pour éviter le chevauchement
  // en cas d'arrivée de plusieurs commandes rapprochées.
  playNewOrderSound() {
    const now = Date.now();
    if (now - this.lastNewOrderSoundAt < this.THROTTLE_MS) return;
    this.lastNewOrderSoundAt = now;
    this.play('receptionist-bell.mp3');
  }

  // Commande prête à servir
  playReadySound() {
    this.play('restaurant-bell.mp3');
  }

  showBrowserNotification(title: string, body: string) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, icon: 'icons/commandes-logo.png' });
    } catch {
      // Certains navigateurs mobiles n'autorisent pas `new Notification()` hors PWA installée.
    }
  }

  private play(file: string) {
    try {
      const audio = new Audio(`sounds/${file}`);
      audio.play().catch(() => {});
    } catch {
      // Lecture audio bloquée (ex: pas d'interaction utilisateur préalable) — ignorer.
    }
  }
}
