import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableService } from '../../../core/services/table.service';
import { ToastService } from '../../../core/services/toast.service';
import { TableStatus } from '../../../core/models';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [RouterLink, LoaderComponent],
  templateUrl: './tables.component.html',
  styleUrl: './tables.component.css'
})
export class TablesComponent implements OnInit {
  private readonly tableSvc = inject(TableService);
  private readonly toast    = inject(ToastService);

  readonly tables    = signal<TableStatus[]>([]);
  readonly loading   = signal(true);
  readonly newNumber = signal('');

  ngOnInit() { this.load(); }
  load() { this.tableSvc.getAll().subscribe({ next: t => { this.tables.set(t); this.loading.set(false); } }); }

  addTable() {
    const n = this.newNumber().trim();
    if (!n) return;
    this.tableSvc.create(n).subscribe({ next: () => { this.toast.success('Table ajoutée'); this.newNumber.set(''); this.load(); } });
  }

  toggle(t: TableStatus) {
    this.tableSvc.update(t.id, { is_active: !t.is_active }).subscribe({ next: () => { this.toast.success('Table mise à jour'); this.load(); } });
  }

  // L'URL du QR sera https://omboa.vercel.app/table/{id}
  getQrUrl(id: string) { return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://omboa.vercel.app/table/${id}`)}`; }
}
