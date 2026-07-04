import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [],
  template: ''
})
export class RegisterComponent {
  constructor() { inject(Router).navigate(['/auth'], { replaceUrl: true }); }
}
