import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CustomerAccount } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly base = `${environment.apiUrl}/customers`;
  constructor(private http: HttpClient) {}

  getAll(): Observable<CustomerAccount[]> {
    return this.http.get<CustomerAccount[]>(this.base);
  }
}
