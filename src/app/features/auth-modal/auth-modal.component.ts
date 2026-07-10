import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { ToastService } from '../../core/services/toast.service';

// Modale de connexion/inscription client, ouverte depuis le header restaurant-scopé
// (plus jamais une route dédiée — le staff n'utilise de toute façon plus jamais ce flux).
@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.css'
})
export class AuthModalComponent {
  readonly modal = inject(AuthModalService);
  private readonly auth   = inject(AuthService);
  private readonly restaurantSvc = inject(RestaurantService);
  private readonly toast  = inject(ToastService);

  readonly loginPhone    = signal('');
  readonly loginPassword = signal('');
  readonly loginLoading  = signal(false);
  readonly loginError    = signal('');

  readonly fullName        = signal('');
  readonly regPhone        = signal('');
  readonly regPassword     = signal('');
  readonly registerLoading = signal(false);
  readonly registerError   = signal('');

  close() { this.modal.close(); }

  onOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) this.close();
  }

  submitLogin() {
    const slug = this.restaurantSvc.current()?.slug;
    if (!slug || !this.loginPhone() || !this.loginPassword()) {
      this.loginError.set('Veuillez remplir tous les champs.');
      return;
    }
    this.loginLoading.set(true);
    this.loginError.set('');

    this.auth.login(this.loginPhone(), this.loginPassword(), slug).subscribe({
      next: () => {
        this.toast.success('Bienvenue !');
        this.close();
      },
      error: () => {
        this.loginError.set('Numéro de téléphone ou mot de passe incorrect.');
        this.loginLoading.set(false);
      }
    });
  }

  submitRegister() {
    const slug = this.restaurantSvc.current()?.slug;
    if (!slug || !this.fullName() || !this.regPhone() || !this.regPassword()) {
      this.registerError.set('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    this.registerLoading.set(true);
    this.registerError.set('');

    this.auth.register(this.regPhone(), this.regPassword(), this.fullName(), slug).subscribe({
      next: () => {
        this.toast.success('Compte créé avec succès !');
        this.close();
      },
      error: (err) => {
        this.registerError.set(err?.error?.message ?? 'Impossible de créer le compte. Réessayez.');
        this.registerLoading.set(false);
      }
    });
  }
}
