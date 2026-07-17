import { Component, OnInit, signal, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { CustomerService } from '../../../core/services/customer.service';
import { CustomerAccount } from '../../../core/models';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [DatePipe, DecimalPipe, LoaderComponent],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.css'
})
export class CustomersComponent implements OnInit {
  private readonly customerSvc = inject(CustomerService);

  readonly customers = signal<CustomerAccount[]>([]);
  readonly loading    = signal(true);

  ngOnInit() {
    this.customerSvc.getAll().subscribe({
      next: c => { this.customers.set(c); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
