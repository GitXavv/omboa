import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SuperAdminAuthService } from '../../core/services/super-admin-auth.service';

@Component({
  selector: 'app-superadmin-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './superadmin-login.component.html',
  styleUrl: '../staff-login/staff-login.component.css'
})
export class SuperAdminLoginComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(SuperAdminAuthService);

  readonly key     = signal('');
  readonly loading = signal(false);
  readonly error   = signal('');
  readonly locked  = signal(false);

  // Page en plein écran (position: fixed) - on bloque le scroll du body le temps qu'elle
  // soit affichée, sinon son `padding-bottom` mobile (prévu pour la bottom-nav, absente
  // ici) laisse dépasser le fond de la page en dessous.
  ngOnInit() { document.body.style.overflow = 'hidden'; }
  ngOnDestroy() { document.body.style.overflow = ''; }

  submit() {
    if (!this.key().trim() || this.locked()) return;
    this.loading.set(true);
    this.error.set('');

    this.auth.loginWithKey(this.key().trim()).subscribe({
      next: () => this.router.navigate(['/osuper/dashboard']),
      error: err => {
        this.error.set(err?.error?.message ?? 'Clé incorrecte.');
        this.loading.set(false);
        // Trop de tentatives : on éloigne rapidement du formulaire (verrou serveur actif
        // 5 minutes, même après rechargement de la page).
        if (err?.error?.locked || err?.status === 429) {
          this.locked.set(true);
          setTimeout(() => this.router.navigate(['/']), 1800);
        }
      }
    });
  }
}
