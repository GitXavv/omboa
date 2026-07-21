import { Component, OnInit, signal, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SuperAdminService } from '../../core/services/super-admin.service';
import { ToastService } from '../../core/services/toast.service';
import { Log } from '../../core/models';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

const EVENT_LABELS: Record<string, string> = {
  '':                   'Tous',
  RESTAURANT_CREATED:  'Restaurant créé',
  RESTAURANT_UPDATED:  'Restaurant modifié',
  RESTAURANT_TOGGLED:  'Restaurant activé/désactivé',
  RESTAURANT_ARCHIVED: 'Restaurant archivé',
  STAFF_KEY_UPDATED:   'Clé staff modifiée (restaurant, sans détail)'
};

const EVENT_TYPES = ['', 'RESTAURANT_CREATED', 'RESTAURANT_UPDATED', 'RESTAURANT_TOGGLED', 'RESTAURANT_ARCHIVED', 'STAFF_KEY_UPDATED'];

@Component({
  selector: 'app-superadmin-logs',
  standalone: true,
  imports: [DatePipe, LoaderComponent],
  templateUrl: './superadmin-logs.component.html',
  styleUrl: './superadmin-logs.component.css'
})
export class SuperAdminLogsComponent implements OnInit {
  private readonly superAdminSvc = inject(SuperAdminService);
  private readonly toast = inject(ToastService);

  readonly loading     = signal(true);
  readonly logs        = signal<Log[]>([]);
  readonly total       = signal(0);
  readonly page        = signal(1);
  readonly eventType   = signal('');
  readonly downloading = signal(false);
  readonly labels      = EVENT_LABELS;
  readonly eventTypes  = EVENT_TYPES;

  ngOnInit() { this.load(); }

  private load() {
    this.loading.set(true);
    this.superAdminSvc.getLogs(this.page(), this.eventType()).subscribe({
      next: res => { this.logs.set(res.data); this.total.set(res.total); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  filter(eventType: string) { this.eventType.set(eventType); this.page.set(1); this.load(); }

  download() {
    this.downloading.set(true);
    this.superAdminSvc.downloadLogs().subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href = url;
        a.download = `omboa-superadmin-logs-${new Date().toISOString().slice(0,10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloading.set(false);
        this.toast.success('Logs téléchargés avec succès.');
      },
      error: () => { this.toast.error('Erreur lors du téléchargement.'); this.downloading.set(false); }
    });
  }

  nextPage() { this.page.update(p => p + 1); this.load(); }
  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
}
