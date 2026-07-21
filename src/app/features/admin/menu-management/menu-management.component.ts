import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MenuService } from '../../../core/services/menu.service';
import { ToastService } from '../../../core/services/toast.service';
import { ImageUploadService } from '../../../core/services/image-upload.service';
import { StaffAuthService } from '../../../core/services/staff-auth.service';
import { Category, Product } from '../../../core/models';
import { DecimalPipe } from '@angular/common';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

type DeleteTarget  = { type: 'product' | 'category'; id: string; name: string };
type ConfirmAction = { title: string; message: string; onConfirm: () => void };

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [FormsModule, DecimalPipe, LoaderComponent],
  templateUrl: './menu-management.component.html',
  styleUrl: './menu-management.component.css'
})
export class MenuManagementComponent implements OnInit {
  private readonly menuSvc   = inject(MenuService);
  private readonly toast     = inject(ToastService);
  private readonly imgUpload = inject(ImageUploadService);
  private readonly staffAuth = inject(StaffAuthService);

  readonly categories  = signal<Category[]>([]);
  readonly loading     = signal(true);
  readonly saving      = signal(false);

  // Product form
  readonly showProdForm     = signal(false);
  readonly prodFormMode     = signal<'create' | 'edit'>('create');
  readonly formProduct      = signal<Partial<Product>>({});
  readonly prodImagePreview = signal<string | null>(null);
  readonly prodFile         = signal<File | null>(null);

  // Category form
  readonly showCatForm     = signal(false);
  readonly catFormMode     = signal<'create' | 'edit'>('create');
  readonly formCategory    = signal<Partial<Category>>({});
  readonly catImagePreview = signal<string | null>(null);
  readonly catFile         = signal<File | null>(null);

  // Delete confirmation
  readonly deleteTarget = signal<DeleteTarget | null>(null);

  // Generic confirmation dialog
  readonly confirmAction = signal<ConfirmAction | null>(null);

  // Flat list of all categories for product form select
  readonly allCategoriesFlat = computed(() => {
    const result: { id: string; label: string }[] = [];
    for (const cat of this.categories()) {
      result.push({ id: cat.id, label: cat.name });
      for (const sub of cat.subcategories ?? [])
        result.push({ id: sub.id, label: `- ${sub.name}` });
    }
    return result;
  });

  // Track if mousedown started on the overlay (to prevent close on text-select drag)
  private _overlayWasTarget = false;

  constructor() {
    // Scroll lock when any modal is open
    effect(() => {
      const open = this.showProdForm() || this.showCatForm()
        || !!this.deleteTarget() || !!this.confirmAction();
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  ngOnInit() { this.load(); }

  load() {
    const restaurantId = this.staffAuth.currentStaff()?.restaurantId ?? '';
    this.menuSvc.getCategoriesAdmin(restaurantId).subscribe({
      next: c => { this.categories.set(c); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  // ── Modal overlay close fix ───────────────────────────────────────────────

  onOverlayMousedown(e: MouseEvent) {
    this._overlayWasTarget = e.target === e.currentTarget;
  }

  maybeClose(which: 'prod' | 'cat' | 'delete' | 'confirm') {
    if (!this._overlayWasTarget) return;
    if (which === 'prod')    this.showProdForm.set(false);
    if (which === 'cat')     this.showCatForm.set(false);
    if (which === 'delete')  this.deleteTarget.set(null);
    if (which === 'confirm') this.confirmAction.set(null);
  }

  // ── Generic confirm ───────────────────────────────────────────────────────

  private askConfirm(title: string, message: string, onConfirm: () => void) {
    this.confirmAction.set({ title, message, onConfirm });
  }

  runConfirm() {
    const action = this.confirmAction();
    if (!action) return;
    this.confirmAction.set(null);
    action.onConfirm();
  }

  // ── Products ──────────────────────────────────────────────────────────────

  toggleAvailability(p: Product) {
    const next = !p.is_available;
    this.askConfirm(
      next ? 'Réactiver ce plat' : 'Désactiver ce plat',
      next
        ? `Réactiver "${p.name}" ? Il sera à nouveau visible dans le menu.`
        : `Désactiver "${p.name}" ? Il disparaîtra du menu clients.`,
      () => this.menuSvc.updateProduct(p.id, { is_available: next }).subscribe({
        next: () => { this.toast.success('Disponibilité mise à jour'); this.load(); },
        error: () => this.toast.error('Erreur lors de la mise à jour')
      })
    );
  }

  toggleTrend(p: Product) {
    const next = !p.trend;
    this.askConfirm(
      next ? 'Mettre en avant ce plat' : 'Retirer de la sélection',
      next
        ? `"${p.name}" sera mis en avant au menu dans la section "Notre sélection" visible par tous les clients. Continuer ?`
        : `"${p.name}" ne sera plus mis en avant au menu. Continuer ?`,
      () => this.menuSvc.updateProduct(p.id, { trend: next }).subscribe({
        next: () => { this.toast.success(next ? 'Ajouté à "Notre sélection"' : 'Retiré de "Notre sélection"'); this.load(); },
        error: () => this.toast.error('Erreur lors de la mise à jour')
      })
    );
  }

  openCreateProduct(categoryId: string) {
    this.formProduct.set({ category_id: categoryId, is_available: true, display_order: 0, trend: false });
    this.prodImagePreview.set(null);
    this.prodFile.set(null);
    this.prodFormMode.set('create');
    this.showProdForm.set(true);
  }

  openEditProduct(p: Product) {
    this.formProduct.set({ ...p });
    this.prodImagePreview.set(p.image_url ?? null);
    this.prodFile.set(null);
    this.prodFormMode.set('edit');
    this.showProdForm.set(true);
  }

  async onProdFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.prodFile.set(file);
    const preview = await this.imgUpload.readAsDataUrl(file);
    this.prodImagePreview.set(preview);
  }

  saveProduct() {
    const p = this.formProduct();
    if (!p.name?.trim() || p.price == null) { this.toast.error('Nom et prix requis.'); return; }
    const label = this.prodFormMode() === 'create' ? 'Ajouter ce plat' : 'Modifier ce plat';
    const msg   = this.prodFormMode() === 'create'
      ? `Ajouter "${p.name}" au menu ?`
      : `Enregistrer les modifications de "${p.name}" ?`;
    this.askConfirm(label, msg, () => this.doSaveProduct());
  }

  private async doSaveProduct() {
    const p = this.formProduct();
    this.saving.set(true);
    const file = this.prodFile();
    if (file) {
      try {
        const url = await firstValueFrom(this.imgUpload.upload(file, 'products'));
        this.formProduct.update(fp => ({ ...fp, image_url: url }));
      } catch {
        this.toast.error("Erreur lors de l'upload de l'image.");
        this.saving.set(false);
        return;
      }
    }
    const updated = this.formProduct();
    const obs = this.prodFormMode() === 'create'
      ? this.menuSvc.createProduct(updated)
      : this.menuSvc.updateProduct(updated.id!, updated);
    obs.subscribe({
      next: () => { this.toast.success('Produit enregistré'); this.showProdForm.set(false); this.load(); this.saving.set(false); },
      error: () => { this.toast.error("Erreur lors de l'enregistrement"); this.saving.set(false); }
    });
  }

  // ── Categories ────────────────────────────────────────────────────────────

  openCreateCategory(parentId: string | null = null) {
    this.formCategory.set({ parent_id: parentId, is_active: true, display_order: 0 });
    this.catImagePreview.set(null);
    this.catFile.set(null);
    this.catFormMode.set('create');
    this.showCatForm.set(true);
  }

  openEditCategory(cat: Category) {
    this.formCategory.set({ ...cat });
    this.catImagePreview.set(cat.image_url ?? null);
    this.catFile.set(null);
    this.catFormMode.set('edit');
    this.showCatForm.set(true);
  }

  async onCatFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.catFile.set(file);
    const preview = await this.imgUpload.readAsDataUrl(file);
    this.catImagePreview.set(preview);
  }

  saveCategory() {
    const c = this.formCategory();
    if (!c.name?.trim()) { this.toast.error('Le nom est requis.'); return; }
    const label = this.catFormMode() === 'create' ? 'Créer la catégorie' : 'Modifier la catégorie';
    const msg   = this.catFormMode() === 'create'
      ? `Créer la catégorie "${c.name}" ?`
      : `Enregistrer les modifications de "${c.name}" ?`;
    this.askConfirm(label, msg, () => this.doSaveCategory());
  }

  private async doSaveCategory() {
    const c = this.formCategory();
    this.saving.set(true);
    const file = this.catFile();
    if (file) {
      try {
        const url = await firstValueFrom(this.imgUpload.upload(file, 'categories'));
        this.formCategory.update(fc => ({ ...fc, image_url: url }));
      } catch {
        this.toast.error("Erreur lors de l'upload de l'image.");
        this.saving.set(false);
        return;
      }
    }
    const updated = this.formCategory();
    const obs = this.catFormMode() === 'create'
      ? this.menuSvc.createCategory(updated)
      : this.menuSvc.updateCategory(updated.id!, updated);
    obs.subscribe({
      next: () => { this.toast.success('Catégorie enregistrée'); this.showCatForm.set(false); this.load(); this.saving.set(false); },
      error: () => { this.toast.error("Erreur lors de l'enregistrement"); this.saving.set(false); }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  askDelete(type: 'product' | 'category', id: string, name: string) {
    this.deleteTarget.set({ type, id, name });
  }

  confirmDelete() {
    const d = this.deleteTarget();
    if (!d) return;
    const obs = d.type === 'product'
      ? this.menuSvc.deleteProduct(d.id)
      : this.menuSvc.deleteCategory(d.id);
    obs.subscribe({
      next: () => { this.toast.success('Supprimé avec succès'); this.deleteTarget.set(null); this.load(); },
      error: (e: { error?: { message?: string } }) => {
        this.toast.error(e.error?.message ?? 'Impossible de supprimer cet élément.');
        this.deleteTarget.set(null);
      }
    });
  }
}
