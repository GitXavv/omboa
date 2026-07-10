import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminSettingsService } from '../../../core/services/admin-settings.service';
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
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly rolesDefined = signal<StaffRole[]>([]);
  readonly roles: StaffRole[] = ['owner', 'cook', 'receptionist', 'exit'];
  readonly labels = ROLE_LABELS;

  readonly editingRole = signal<StaffRole | null>(null);
  readonly newKey       = signal('');
  readonly saving       = signal(false);

  ngOnInit() { this.load(); }

  private load() {
    this.settingsSvc.getDefinedRoles().subscribe({
      next: res => { this.rolesDefined.set(res.roles_defined); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  isDefined(role: StaffRole) { return this.rolesDefined().includes(role); }

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
