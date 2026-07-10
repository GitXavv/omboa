import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { StatsService } from '../../../core/services/stats.service';
import { StaffAuthService } from '../../../core/services/staff-auth.service';
import { AdminStats } from '../../../core/models';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

const STATUS_FR: Record<string, string> = {
  pending: 'En attente', preparing: 'En préparation', ready: 'Prête',
  paid: 'Payée', served: 'Servie', released: 'Libérée', cancelled: 'Annulée'
};

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [RouterLink, DecimalPipe, DatePipe, LoaderComponent],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css'
})
export class StatsComponent implements OnInit {
  private readonly statsSvc = inject(StatsService);
  private readonly staffAuth = inject(StaffAuthService);

  readonly slug = computed(() => this.staffAuth.currentStaff()?.restaurantSlug ?? '');

  readonly stats   = signal<AdminStats | null>(null);
  readonly loading = signal(true);
  readonly refreshedAt = signal<Date | null>(null);
  readonly statusFr = STATUS_FR;

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.statsSvc.get().subscribe({
      next: s => { this.stats.set(s); this.loading.set(false); this.refreshedAt.set(new Date()); },
      error: () => this.loading.set(false)
    });
  }
}
