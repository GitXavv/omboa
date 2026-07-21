import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ToastService } from '../../core/services/toast.service';

// Connexion/inscription client - une vraie page routée (plus une modale flottante) :
// header + bottom nav restent visibles et utilisables, le scroll fonctionne normalement,
// et naviguer ailleurs pendant qu'elle est affichée ne laisse jamais rien bloqué en overlay.
@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.css'
})
export class AuthPageComponent {
  private readonly auth = inject(AuthService);
  private readonly restaurantSvc = inject(RestaurantService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly loginPhone    = signal('');
  readonly loginPassword = signal('');
  readonly loginLoading  = signal(false);
  readonly loginError    = signal('');

  readonly fullName        = signal('');
  readonly regPhone        = signal('');
  readonly regPassword     = signal('');
  readonly registerLoading = signal(false);
  readonly registerError   = signal('');

  private goToMenu() {
    const slug = this.restaurantSvc.current()?.slug;
    this.router.navigate(['/', slug, 'menu']);
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
        this.goToMenu();
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
        this.goToMenu();
      },
      error: (err) => {
        this.registerError.set(err?.error?.message ?? 'Impossible de créer le compte. Réessayez.');
        this.registerLoading.set(false);
      }
    });
  }
}
