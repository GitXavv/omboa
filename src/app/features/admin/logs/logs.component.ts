import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { LogService } from '../../../core/services/log.service';
import { Log } from '../../../core/models';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [RouterLink, DatePipe, LowerCasePipe, LoaderComponent],
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.css'
})
export class LogsComponent implements OnInit {
  private readonly logSvc = inject(LogService);
  private readonly toast  = inject(ToastService);
  private readonly route  = inject(ActivatedRoute);

  readonly logs        = signal<Log[]>([]);
  readonly total       = signal(0);
  readonly loading     = signal(true);
  readonly page        = signal(1);
  readonly eventType   = signal('');
  readonly downloading = signal(false);
  readonly entityId    = signal<string | null>(null);

  readonly eventTypes = [
    '', 'ORDER_CREATED', 'ORDER_STATUS_CHANGED', 'QR_SCANNED',
    'PAYMENT_COMPLETED', 'USER_REGISTERED', 'USER_LOGIN',
    'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED',
    'CATEGORY_CREATED', 'CATEGORY_UPDATED', 'CATEGORY_DELETED',
    'TABLE_CREATED', 'TABLE_UPDATED', 'TABLE_DELETED',
    'LOGS_DOWNLOADED'
  ];

  readonly eventTypeLabels: Record<string, string> = {
    '':                    'Tous',
    'ORDER_CREATED':       'Commande créée',
    'ORDER_STATUS_CHANGED':'Statut commande',
    'QR_SCANNED':          'QR scanné',
    'PAYMENT_COMPLETED':   'Paiement reçu',
    'USER_REGISTERED':     'Inscription',
    'USER_LOGIN':          'Connexion',
    'PRODUCT_CREATED':     'Plat ajouté',
    'PRODUCT_UPDATED':     'Plat modifié',
    'PRODUCT_DELETED':     'Plat supprimé',
    'CATEGORY_CREATED':    'Catégorie ajoutée',
    'CATEGORY_UPDATED':    'Catégorie modifiée',
    'CATEGORY_DELETED':    'Catégorie supprimée',
    'TABLE_CREATED':       'Table ajoutée',
    'TABLE_UPDATED':       'Table modifiée',
    'TABLE_DELETED':       'Table supprimée',
    'LOGS_DOWNLOADED':     'Logs téléchargés',
  };

  ngOnInit() {
    this.entityId.set(this.route.snapshot.queryParamMap.get('entity_id'));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.logSvc.getAll({
      event_type: this.eventType() || undefined,
      entity_id: this.entityId() || undefined,
      page: this.page()
    }).subscribe({
      next: r => { this.logs.set(r.data); this.total.set(r.total); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  clearEntityFilter() {
    this.entityId.set(null);
    this.page.set(1);
    this.load();
  }

  download() {
    this.downloading.set(true);
    this.logSvc.download().subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href = url;
        a.download = `omboa-logs-${new Date().toISOString().slice(0,10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloading.set(false);
        this.toast.success('Logs téléchargés avec succès.');
      },
      error: () => { this.toast.error('Erreur lors du téléchargement.'); this.downloading.set(false); }
    });
  }

  filter(event_type: string) { this.eventType.set(event_type); this.page.set(1); this.load(); }
  nextPage() { this.page.update(p => p + 1); this.load(); }
  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
}
