import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="toast-container">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast toast--{{ t.type }}" role="alert">
          <span>{{ t.message }}</span>
          <button (click)="toast.dismiss(t.id)" style="margin-left:auto;opacity:.7;font-size:1.1rem">✕</button>
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  readonly toast = inject(ToastService);
}
