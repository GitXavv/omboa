import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { SuperAdminService, CreateRestaurantPayload } from '../../core/services/super-admin.service';
import { SuperAdminAuthService } from '../../core/services/super-admin-auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Restaurant, SuperAdminStats } from '../../core/models';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, DecimalPipe, DatePipe, LoaderComponent],
  templateUrl: './superadmin-dashboard.component.html',
  styleUrl: './superadmin-dashboard.component.css'
})
export class SuperAdminDashboardComponent implements OnInit {
  private readonly superAdminSvc = inject(SuperAdminService);
  readonly auth = inject(SuperAdminAuthService);
  private readonly toast = inject(ToastService);

  readonly loading     = signal(true);
  readonly restaurants  = signal<Restaurant[]>([]);
  readonly stats        = signal<SuperAdminStats | null>(null);
  readonly search        = signal('');

  readonly showCreateForm = signal(false);
  readonly newRestaurant  = signal<CreateRestaurantPayload>({ name: '', slug: '', owner_key: '' });
  readonly creating       = signal(false);

  readonly filteredRestaurants = () => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.restaurants();
    return this.restaurants().filter(r => r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q));
  };

  ngOnInit() { this.load(); }

  private load() {
    forkJoin({
      restaurants: this.superAdminSvc.getRestaurants(),
      stats: this.superAdminSvc.getStats()
    }).subscribe({
      next: ({ restaurants, stats }) => {
        this.restaurants.set(restaurants);
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  slugify(name: string) {
    const stripped = name.toLowerCase().trim().normalize('NFD')
      .split('').filter(ch => (ch.codePointAt(0) ?? 0) < 0x0300 || (ch.codePointAt(0) ?? 0) > 0x036f).join('');
    return stripped.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  onNameChange(name: string) {
    this.newRestaurant.update(r => ({ ...r, name, slug: this.slugify(name) }));
  }

  openCreateForm() {
    this.newRestaurant.set({ name: '', slug: '', owner_key: '' });
    this.showCreateForm.set(true);
  }

  closeCreateForm() { this.showCreateForm.set(false); }

  submitCreate() {
    const r = this.newRestaurant();
    if (!r.name.trim() || !r.slug.trim() || !r.owner_key.trim()) {
      this.toast.error('Nom, slug et clé admin sont requis.');
      return;
    }
    this.creating.set(true);
    this.superAdminSvc.createRestaurant(r).subscribe({
      next: () => {
        this.toast.success(`Restaurant "${r.name}" créé.`);
        this.creating.set(false);
        this.showCreateForm.set(false);
        this.load();
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Impossible de créer le restaurant.');
        this.creating.set(false);
      }
    });
  }

  toggleActive(r: Restaurant) {
    this.superAdminSvc.updateRestaurant(r.id, { is_active: !r.is_active }).subscribe({
      next: () => { this.toast.success(`${r.name} ${!r.is_active ? 'activé' : 'désactivé'}.`); this.load(); },
      error: () => this.toast.error('Impossible de modifier ce restaurant.')
    });
  }

  archive(r: Restaurant) {
    this.superAdminSvc.updateRestaurant(r.id, { archived: true }).subscribe({
      next: () => { this.toast.success(`${r.name} archivé.`); this.load(); },
      error: () => this.toast.error('Impossible d\'archiver ce restaurant.')
    });
  }
}
