import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MenuService } from '../../../core/services/menu.service';
import { ToastService } from '../../../core/services/toast.service';
import { Category, Product } from '../../../core/models';
import { DecimalPipe } from '@angular/common';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe, LoaderComponent],
  templateUrl: './menu-management.component.html',
  styleUrl: './menu-management.component.scss'
})
export class MenuManagementComponent implements OnInit {
  private readonly menuSvc = inject(MenuService);
  private readonly toast   = inject(ToastService);

  readonly categories  = signal<Category[]>([]);
  readonly activeCat   = signal<string | null>(null);
  readonly loading     = signal(true);
  readonly showForm    = signal(false);
  readonly formMode    = signal<'create' | 'edit'>('create');
  readonly formProduct = signal<Partial<Product>>({});

  ngOnInit() { this.load(); }

  load() {
    this.menuSvc.getCategories().subscribe({ next: c => { this.categories.set(c); this.loading.set(false); } });
  }

  toggleAvailability(p: Product) {
    this.menuSvc.updateProduct(p.id, { is_available: !p.is_available }).subscribe({
      next: () => { this.toast.success('Disponibilité mise à jour'); this.load(); },
      error: () => this.toast.error('Erreur')
    });
  }

  openCreate(categoryId: string) {
    this.formProduct.set({ category_id: categoryId, is_available: true });
    this.formMode.set('create');
    this.showForm.set(true);
  }

  openEdit(p: Product) {
    this.formProduct.set({ ...p });
    this.formMode.set('edit');
    this.showForm.set(true);
  }

  saveProduct() {
    const p = this.formProduct();
    const obs = this.formMode() === 'create'
      ? this.menuSvc.createProduct(p)
      : this.menuSvc.updateProduct(p.id!, p);

    obs.subscribe({ next: () => { this.toast.success('Produit enregistré'); this.showForm.set(false); this.load(); }, error: () => this.toast.error('Erreur') });
  }

  deleteProduct(id: string) {
    if (!confirm('Supprimer ce produit ?')) return;
    this.menuSvc.deleteProduct(id).subscribe({ next: () => { this.toast.success('Produit supprimé'); this.load(); } });
  }
}
