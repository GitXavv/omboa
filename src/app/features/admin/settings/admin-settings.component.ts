import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminSettingsService } from '../../../core/services/admin-settings.service';
import { StaffAuthService } from '../../../core/services/staff-auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { StaffRole } from '../../../core/models';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

const ROLE_LABELS: Record<StaffRole, string> = {
  owner: 'Admin', cook: 'Cuisine', receptionist: 'Réceptionniste', exit: 'Sortie'
};

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [FormsModule, LoaderComponent],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.css'
})
export class AdminSettingsComponent implements OnInit {
  private readonly settingsSvc = inject(AdminSettingsService);
  private readonly staffAuth   = inject(StaffAuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly rolesDefined = signal<StaffRole[]>([]);
  readonly roles: StaffRole[] = ['owner', 'cook', 'receptionist', 'exit'];
  readonly labels = ROLE_LABELS;

  readonly editingRole = signal<StaffRole | null>(null);
  readonly newKey       = signal('');
  readonly saving       = signal(false);

  // Re-authentification (clé owner) requise avant de révéler le champ de changement —
  // pendingRole = le rôle qu'on s'apprête à éditer, en attente de cette vérification.
  readonly pendingRole   = signal<StaffRole | null>(null);
  readonly reauthKey     = signal('');
  readonly reauthError   = signal('');
  readonly verifying     = signal(false);

  ngOnInit() { this.load(); }

  private load() {
    this.settingsSvc.getDefinedRoles().subscribe({
      next: res => { this.rolesDefined.set(res.roles_defined); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  isDefined(role: StaffRole) { return this.rolesDefined().includes(role); }

  requestEdit(role: StaffRole) {
    this.pendingRole.set(role);
    this.reauthKey.set('');
    this.reauthError.set('');
  }

  cancelReauth() { this.pendingRole.set(null); }

  confirmReauth() {
    const role = this.pendingRole();
    if (!role || !this.reauthKey().trim()) return;

    this.verifying.set(true);
    this.reauthError.set('');
    this.staffAuth.verifyOwnerKey(this.reauthKey().trim()).subscribe({
      next: () => {
        this.verifying.set(false);
        this.pendingRole.set(null);
        this.startEdit(role);
      },
      error: err => {
        this.verifying.set(false);
        if (err?.error?.locked) {
          // 5 échecs : session perdue, retour à la page principale du restaurant —
          // le verrouillage de 10 minutes est déjà actif côté serveur pour cette IP.
          this.staffAuth.logout();
          return;
        }
        this.reauthError.set(err?.error?.message ?? 'Clé incorrecte.');
      }
    });
  }

  startEdit(role: StaffRole) {
    this.editingRole.set(role);
    this.newKey.set('');
  }

  cancelEdit() { this.editingRole.set(null); }

  submitKey() {
    const role = this.editingRole();
    if (!role || !this.newKey().trim()) return;

    this.saving.set(true);
    this.settingsSvc.updateKey(role, this.newKey().trim()).subscribe({
      next: () => {
        this.toast.success(`Clé "${this.labels[role]}" mise à jour.`);
        this.saving.set(false);
        this.editingRole.set(null);
        this.load();
      },
      error: () => {
        this.toast.error('Impossible de mettre à jour cette clé.');
        this.saving.set(false);
      }
    });
  }
}
