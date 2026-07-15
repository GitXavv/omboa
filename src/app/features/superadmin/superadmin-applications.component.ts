import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { SuperAdminService } from '../../core/services/super-admin.service';
import { DemoRequest } from '../../core/services/demo-request.service';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

// "Applications" = les leads soumis depuis "Réservez une démo" sur la landing — affichage
// compacté (logo, nom, email, date de soumission), déroulable au clic pour les détails
// complets (tag, adresse, couleurs). Lecture seule : pas de workflow d'approbation, le
// super admin crée le restaurant à la main (modale "+ Nouveau restaurant" du dashboard)
// une fois le contact établi avec le restaurateur.
@Component({
  selector: 'app-superadmin-applications',
  standalone: true,
  imports: [RouterLink, DatePipe, LoaderComponent],
  templateUrl: './superadmin-applications.component.html',
  styleUrl: './superadmin-applications.component.css'
})
export class SuperAdminApplicationsComponent implements OnInit {
  private readonly superAdminSvc = inject(SuperAdminService);

  readonly loading  = signal(true);
  readonly requests = signal<DemoRequest[]>([]);
  readonly openIds  = signal<Set<string>>(new Set());

  ngOnInit() {
    this.superAdminSvc.getDemoRequests().subscribe({
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
}
