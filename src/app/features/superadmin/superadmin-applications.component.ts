import { Component, OnInit, signal, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SuperAdminService } from '../../core/services/super-admin.service';
import { DemoRequest } from '../../core/services/demo-request.service';
import { ToastService } from '../../core/services/toast.service';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

type Tab = 'active' | 'archived';

// "Applications" = les leads soumis depuis "Réservez une démo" sur la landing.
// - Onglet "En cours" : affichage compacté (logo, nom, email, date de soumission),
//   déroulable au clic pour les détails complets (tag, adresse, couleurs) + bouton
//   Archiver.
// - Onglet "Archives" : une fois archivée, seuls nom/adresse/date de soumission/date
//   d'archivage restent visibles (email, logo, couleurs masqués - voir template).
// Lecture seule sinon : pas de workflow d'approbation, le super admin crée le restaurant
// à la main (modale "+ Nouveau restaurant" du dashboard) une fois le contact établi.
@Component({
  selector: 'app-superadmin-applications',
  standalone: true,
  imports: [DatePipe, LoaderComponent],
  templateUrl: './superadmin-applications.component.html',
  styleUrl: './superadmin-applications.component.css'
})
export class SuperAdminApplicationsComponent implements OnInit {
  private readonly superAdminSvc = inject(SuperAdminService);
  private readonly toast = inject(ToastService);

  readonly tab      = signal<Tab>('active');
  readonly loading  = signal(true);
  readonly requests = signal<DemoRequest[]>([]);
  readonly openIds  = signal<Set<string>>(new Set());

  readonly pendingArchive = signal<DemoRequest | null>(null);
  readonly archiving      = signal(false);

  ngOnInit() { this.load(); }

  switchTab(tab: Tab) {
    if (this.tab() === tab) return;
    this.tab.set(tab);
    this.openIds.set(new Set());
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.superAdminSvc.getDemoRequests(this.tab() === 'archived').subscribe({
      next: r => { this.requests.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  toggle(id: string) {
    this.openIds.update(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  isOpen(id: string) { return this.openIds().has(id); }

  requestArchive(r: DemoRequest, e: Event) {
    e.stopPropagation();
    this.pendingArchive.set(r);
  }

  cancelArchive() { this.pendingArchive.set(null); }

  confirmArchive() {
    const r = this.pendingArchive();
    if (!r) return;
    this.archiving.set(true);
    this.superAdminSvc.archiveDemoRequest(r.id).subscribe({
      next: () => {
        this.toast.success(`Réservation de ${r.name} archivée.`);
        this.archiving.set(false);
        this.pendingArchive.set(null);
        this.requests.update(list => list.filter(x => x.id !== r.id));
      },
      error: () => {
        this.toast.error("Impossible d'archiver cette réservation.");
        this.archiving.set(false);
      }
    });
  }
}
