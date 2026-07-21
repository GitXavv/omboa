import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableService } from '../../../core/services/table.service';
import { ToastService } from '../../../core/services/toast.service';
import { StaffAuthService } from '../../../core/services/staff-auth.service';
import { TableStatus } from '../../../core/models';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [FormsModule, LoaderComponent],
  templateUrl: './tables.component.html',
  styleUrl: './tables.component.css'
})
export class TablesComponent implements OnInit {
  private readonly tableSvc = inject(TableService);
  private readonly toast    = inject(ToastService);
  private readonly staffAuth = inject(StaffAuthService);

  readonly tables          = signal<TableStatus[]>([]);
  readonly loading         = signal(true);
  readonly newNumber       = signal('');
  readonly confirmDeleteId = signal<string | null>(null);
  readonly editId          = signal<string | null>(null);
  readonly editNumber      = signal('');

  ngOnInit() { this.load(); }

  load() {
    const restaurantId = this.staffAuth.currentStaff()?.restaurantId ?? '';
    this.tableSvc.getAll(restaurantId).subscribe({
      next: t => { this.tables.set(t); this.loading.set(false); }
    });
  }

  addTable() {
    const n = this.newNumber().trim();
    if (!n) return;
    this.tableSvc.create(n).subscribe({
      next: () => { this.toast.success('Table ajoutée'); this.newNumber.set(''); this.load(); },
      error: () => this.toast.error('Erreur lors de la création')
    });
  }

  toggleActive(t: TableStatus) {
    if (t.is_active && t.is_occupied) {
      this.toast.error('Cette table est toujours occupée. Vous ne pouvez pas la désactiver maintenant.');
      return;
    }
    this.tableSvc.update(t.id, { number: t.number, is_active: !t.is_active }).subscribe({
      next: () => { this.toast.success(t.is_active ? 'Table désactivée' : 'Table activée'); this.load(); },
      error: (e: { error?: { message?: string } }) => this.toast.error(e.error?.message ?? 'Erreur lors de la mise à jour')
    });
  }

  startEdit(t: TableStatus) {
    this.editId.set(t.id);
    this.editNumber.set(t.number);
  }

  saveEdit(t: TableStatus) {
    const n = this.editNumber().trim();
    if (!n) return;
    this.tableSvc.update(t.id, { number: n, is_active: t.is_active }).subscribe({
      next: () => { this.toast.success('Table renommée'); this.editId.set(null); this.load(); },
      error: () => this.toast.error('Erreur lors de la mise à jour')
    });
  }

  cancelEdit() { this.editId.set(null); }

  askDelete(t: TableStatus) {
    if (t.is_active) {
      this.toast.error('Il faut désactiver cette table avant de la supprimer.');
      return;
    }
    this.confirmDeleteId.set(t.id);
  }
  cancelDelete() { this.confirmDeleteId.set(null); }

  confirmDelete(id: string) {
    this.tableSvc.delete(id).subscribe({
      next: () => { this.toast.success('Table supprimée'); this.confirmDeleteId.set(null); this.load(); },
      error: (e: { error?: { message?: string } }) => {
        this.toast.error(e.error?.message ?? 'Impossible de supprimer cette table.');
        this.confirmDeleteId.set(null);
      }
    });
  }

  getQrUrl(id: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(this.getTableUrl(id))}`;
  }

  // Ouvre exactement la page qu'un client obtiendrait en scannant le QR code - aucun membre
  // du staff ne peut y passer commande (les rôles staff n'ont pas de panier client).
  getTableUrl(id: string) {
    const base = window.location.origin;
    const slug = this.staffAuth.currentStaff()?.restaurantSlug ?? '';
    return `${base}/${slug}/table/${id}`;
  }
}
