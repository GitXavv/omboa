import { Component, OnInit, signal, inject, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { forkJoin, firstValueFrom } from 'rxjs';
import { SuperAdminService, CreateRestaurantPayload } from '../../core/services/super-admin.service';
import { SuperAdminAuthService } from '../../core/services/super-admin-auth.service';
import { ImageUploadService } from '../../core/services/image-upload.service';
import { ToastService } from '../../core/services/toast.service';
import { Restaurant, SuperAdminStats } from '../../core/models';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { ColorPickerComponent } from '../../shared/components/color-picker/color-picker.component';
import { slugify } from '../../core/utils/slug';
import { restaurantLogoUrl } from '../../core/utils/logo';

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
  private readonly imgUpload = inject(ImageUploadService);

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

  // Logo : import direct (comme le formulaire "Réservez une démo"), avec préchargement
  // du logo actuel en aperçu — logoFile reste null tant qu'aucune nouvelle image n'est
  // choisie, auquel cas on garde le logo_url existant inchangé.
  readonly editLogoFile    = signal<File | null>(null);
  readonly editLogoPreview = signal<string | null>(null);

  // Menu contextuel "⋮" (Modifier / Archiver) — un seul ouvert à la fois.
  readonly openCardMenu = signal<string | null>(null);

  // Désactivation (toggle) — avertissement puis re-authentification par la clé super admin.
  // La réactivation, elle, est immédiate (action sûre, réversible) : pas de popup.
  readonly deactivateTarget   = signal<Restaurant | null>(null);
  readonly deactivateKeyPopup = signal(false);
  readonly deactivateKey      = signal('');
  readonly deactivateError    = signal('');
  readonly deactivating       = signal(false);

  // Archivage — avertissement seul, pas de re-authentification.
  readonly archiveTarget = signal<Restaurant | null>(null);
  readonly archiving     = signal(false);

  readonly logoUrl = restaurantLogoUrl;

  readonly filteredRestaurants = () => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.restaurants();
    return this.restaurants().filter(r => r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q));
  };

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.restaurant-card__menu-wrap')) this.openCardMenu.set(null);
  }

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

  onNameChange(name: string) {
    this.newRestaurant.update(r => ({ ...r, name, slug: slugify(name) }));
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

  toggleCardMenu(id: string) {
    this.openCardMenu.update(cur => cur === id ? null : id);
  }

  // ── Activer / désactiver ────────────────────────────────────────────────
  onToggleActive(r: Restaurant) {
    if (!r.is_active) {
      // Réactivation : action sûre et réversible, immédiate.
      this.superAdminSvc.updateRestaurant(r.id, { is_active: true }).subscribe({
        next: () => { this.toast.success(`${r.name} activé.`); this.load(); },
        error: () => this.toast.error('Impossible d\'activer ce restaurant.')
      });
      return;
    }
    this.deactivateTarget.set(r);
  }

  cancelDeactivateWarning() { this.deactivateTarget.set(null); }

  proceedToDeactivateKey() {
    this.deactivateKeyPopup.set(true);
    this.deactivateKey.set('');
    this.deactivateError.set('');
  }

  cancelDeactivateKey() {
    this.deactivateKeyPopup.set(false);
    this.deactivateTarget.set(null);
  }

  confirmDeactivateKey() {
    const r = this.deactivateTarget();
    if (!r || !this.deactivateKey().trim()) return;

    this.deactivating.set(true);
    this.deactivateError.set('');
    this.auth.verifyKey(this.deactivateKey().trim()).subscribe({
      next: () => {
        this.superAdminSvc.updateRestaurant(r.id, { is_active: false }).subscribe({
          next: () => {
            this.toast.success(`${r.name} désactivé.`);
            this.deactivating.set(false);
            this.deactivateKeyPopup.set(false);
            this.deactivateTarget.set(null);
            this.load();
          },
          error: () => {
            this.toast.error('Impossible de désactiver ce restaurant.');
            this.deactivating.set(false);
          }
        });
      },
      error: err => {
        this.deactivating.set(false);
        if (err?.error?.locked) {
          // 5 échecs : session perdue, le verrouillage de 10 minutes est déjà actif
          // côté serveur pour cette IP — retour à la connexion super admin.
          this.auth.logout();
          return;
        }
        this.deactivateError.set(err?.error?.message ?? 'Clé incorrecte.');
      }
    });
  }

  // ── Archiver ─────────────────────────────────────────────────────────────
  requestArchive(r: Restaurant) {
    this.openCardMenu.set(null);
    this.archiveTarget.set(r);
  }

  cancelArchive() { this.archiveTarget.set(null); }

  confirmArchive() {
    const r = this.archiveTarget();
    if (!r) return;
    this.archiving.set(true);
    this.superAdminSvc.updateRestaurant(r.id, { archived: true }).subscribe({
      next: () => {
        this.toast.success(`${r.name} archivé.`);
        this.archiving.set(false);
        this.archiveTarget.set(null);
        this.load();
      },
      error: () => {
        this.toast.error('Impossible d\'archiver ce restaurant.');
        this.archiving.set(false);
      }
    });
  }

  // ── Édition (nom, logo, couleurs de marque) ───────────────────────────────
  openEditForm(r: Restaurant) {
    this.openCardMenu.set(null);
    this.editingRestaurant.set(r);
    this.editForm.set({
      name: r.name,
      logo_url: r.logo_url ?? '',
      color_primary: r.color_primary,
      color_secondary: r.color_secondary,
      address: r.address ?? ''
    });
    this.editLogoFile.set(null);
    this.editLogoPreview.set(r.logo_url ?? null);
  }

  closeEditForm() { this.editingRestaurant.set(null); }

  async onEditLogoFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('Fichier trop volumineux (maximum 5 Mo).');
      return;
    }
    this.editLogoFile.set(file);
    this.editLogoPreview.set(await this.imgUpload.readAsDataUrl(file));
  }

  async submitEdit() {
    const r = this.editingRestaurant();
    const form = this.editForm();
    if (!r || !form.name.trim()) {
      this.toast.error('Le nom est requis.');
      return;
    }
    this.saving.set(true);
    try {
      let logoUrl = form.logo_url || undefined;
      const file = this.editLogoFile();
      if (file) logoUrl = await firstValueFrom(this.superAdminSvc.uploadLogo(r.id, file));

      await firstValueFrom(this.superAdminSvc.updateRestaurant(r.id, {
        name: form.name,
        logo_url: logoUrl,
        color_primary: form.color_primary,
        color_secondary: form.color_secondary,
        address: form.address || undefined
      }));

      this.toast.success(`${form.name} mis à jour.`);
      this.editingRestaurant.set(null);
      this.load();
    } catch {
      this.toast.error('Impossible de mettre à jour ce restaurant.');
    } finally {
      this.saving.set(false);
    }
  }
}
