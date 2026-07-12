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
import { ColorPickerComponent } from '../../shared/components/color-picker/color-picker.component';

interface EditRestaurantForm {
  name: string;
  logo_url: string;
  color_primary: string;
  color_secondary: string;
  address: string;
}

// Palette Omboa par défaut — mêmes valeurs que --color-primary/--color-secondary dans
// styles.css et que la constante équivalente côté API (SuperAdminController). color_primary/
// color_secondary ne sont jamais NULL en base : un nouveau restaurant part toujours avec
// ces couleurs pré-sélectionnées, modifiables via la palette avant validation.
const DEFAULT_COLOR_PRIMARY = '#C87D60';
const DEFAULT_COLOR_SECONDARY = '#6B4030';

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, DecimalPipe, DatePipe, LoaderComponent, ColorPickerComponent],
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
  readonly newRestaurant  = signal<CreateRestaurantPayload>(this.blankNewRestaurant());
  readonly creating       = signal(false);

  // Édition (nom/logo/couleurs) — jamais les clés d'accès, réservées à l'owner lui-même.
  readonly editingRestaurant = signal<Restaurant | null>(null);
  readonly editForm = signal<EditRestaurantForm>({ name: '', logo_url: '', color_primary: DEFAULT_COLOR_PRIMARY, color_secondary: DEFAULT_COLOR_SECONDARY, address: '' });
  readonly saving = signal(false);

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
    this.newRestaurant.set(this.blankNewRestaurant());
    this.showCreateForm.set(true);
  }

  private blankNewRestaurant(): CreateRestaurantPayload {
    return { name: '', slug: '', owner_key: '', color_primary: DEFAULT_COLOR_PRIMARY, color_secondary: DEFAULT_COLOR_SECONDARY, address: '' };
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

  // ── Édition (nom, logo, couleurs de marque) ───────────────────────────────
  openEditForm(r: Restaurant) {
    this.editingRestaurant.set(r);
    this.editForm.set({
      name: r.name,
      logo_url: r.logo_url ?? '',
      color_primary: r.color_primary,
      color_secondary: r.color_secondary,
      address: r.address ?? ''
    });
  }

  closeEditForm() { this.editingRestaurant.set(null); }

  submitEdit() {
    const r = this.editingRestaurant();
    const form = this.editForm();
    if (!r || !form.name.trim()) {
      this.toast.error('Le nom est requis.');
      return;
    }
    this.saving.set(true);
    this.superAdminSvc.updateRestaurant(r.id, {
      name: form.name,
      logo_url: form.logo_url || undefined,
      color_primary: form.color_primary,
      color_secondary: form.color_secondary,
      address: form.address || undefined
    }).subscribe({
      next: () => {
        this.toast.success(`${form.name} mis à jour.`);
        this.saving.set(false);
        this.editingRestaurant.set(null);
        this.load();
      },
      error: () => {
        this.toast.error('Impossible de mettre à jour ce restaurant.');
        this.saving.set(false);
      }
    });
  }
}
