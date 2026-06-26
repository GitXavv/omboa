import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loader',
  standalone: true,
  template: `
    <div class="loader-wrap" [class.loader-wrap--overlay]="overlay">
      <div class="spinner" [class]="'spinner--' + size"></div>
      @if (label) { <p class="loader-label">{{ label }}</p> }
    </div>
  `,
  styles: [`
    .loader-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 40px;
      &--overlay {
        position: fixed;
        inset: 0;
        background: rgba(251,245,236,.75);
        backdrop-filter: blur(4px);
        z-index: 9998;
        padding: 0;
      }
    }
    .loader-label { color: var(--color-text-muted); font-size: .9rem; }
  `]
})
export class LoaderComponent {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() label = '';
  @Input() overlay = false;
}
