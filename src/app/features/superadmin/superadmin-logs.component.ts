import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { SuperAdminService } from '../../core/services/super-admin.service';
import { Log } from '../../core/models';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

const EVENT_LABELS: Record<string, string> = {
  RESTAURANT_CREATED:  'Restaurant créé',
  RESTAURANT_UPDATED:  'Restaurant modifié',
  RESTAURANT_TOGGLED:  'Restaurant activé/désactivé',
  RESTAURANT_ARCHIVED: 'Restaurant archivé',
  STAFF_KEY_UPDATED:   'Clé staff modifiée (restaurant, sans détail)'
};

@Component({
  selector: 'app-superadmin-logs',
  standalone: true,
  imports: [RouterLink, DatePipe, LoaderComponent],
  templateUrl: './superadmin-logs.component.html',
  styleUrl: './superadmin-logs.component.css'
})
export class SuperAdminLogsComponent implements OnInit {
  private readonly superAdminSvc = inject(SuperAdminService);

  readonly loading = signal(true);
  readonly logs    = signal<Log[]>([]);
  readonly total   = signal(0);
  readonly page    = signal(1);
  readonly labels  = EVENT_LABELS;

  ngOnInit() { this.load(); }

  private load() {
    this.loading.set(true);
    this.superAdminSvc.getLogs(this.page()).subscribe({
      next: res => { this.logs.set(res.data); this.total.set(res.total); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  nextPage() { this.page.update(p => p + 1); this.load(); }
  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
}
