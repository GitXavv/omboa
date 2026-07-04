import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [],
  template: ''
})
export class LoginComponent {
  constructor() { inject(Router).navigate(['/auth'], { replaceUrl: true }); }
}
