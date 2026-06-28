import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogService } from '../../../core/services/log.service';
import { Log } from '../../../core/models';
import { DatePipe } from '@angular/common';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [RouterLink, DatePipe, LoaderComponent],
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.css'
})
export class LogsComponent implements OnInit {
  private readonly logSvc = inject(LogService);
  private readonly toast  = inject(ToastService);

  readonly logs       = signal<Log[]>([]);
  readonly total      = signal(0);
  readonly loading    = signal(true);
  readonly page       = signal(1);
  readonly eventType  = signal('');
  readonly downloading = signal(false);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.logSvc.getAll({ event_type: this.eventType() || undefined, page: this.page() }).subscribe({
      next: r => { this.logs.set(r.data); this.total.set(r.total); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
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
