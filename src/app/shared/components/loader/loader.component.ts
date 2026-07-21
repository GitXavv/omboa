import { Component, Input, inject, computed } from '@angular/core';
import { RestaurantService } from '../../../core/services/restaurant.service';

const OMBOA_MAIN_LOGO = '/icons/main/omboa-main-logo.png';

@Component({
  selector: 'app-loader',
  standalone: true,
  template: `
    <div class="loader-wrap" [class.loader-wrap--overlay]="overlay">
      <div class="brand-loader" [class]="'brand-loader--' + size">
        <img [src]="logoUrl()" alt="" class="brand-loader__logo">
        <span class="brand-loader__utensil"></span>
      </div>
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

    /* Logo (couleurs d'origine - le recolorier en aplat écraserait le détail des logos
       type sceau/badge) qui pulse, accompagné d'une icône couverts colorée qui bondit
       juste à côté. */
    .brand-loader {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-loader__logo {
      width: 44px;
      height: 44px;
      object-fit: contain;
      animation: brand-loader-pulse 1.3s ease-in-out infinite;
    }
    .brand-loader__utensil {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      background-color: var(--color-primary);
      mask-image: url('/icons/fork-and-spoon.png');
      -webkit-mask-image: url('/icons/fork-and-spoon.png');
      mask-repeat: no-repeat;
      mask-position: center;
      mask-size: contain;
      -webkit-mask-repeat: no-repeat;
      -webkit-mask-position: center;
      -webkit-mask-size: contain;
      animation: brand-loader-bounce 1.3s ease-in-out infinite;
      animation-delay: .15s;
    }

    .brand-loader--sm .brand-loader__logo    { width: 26px; height: 26px; }
    .brand-loader--sm .brand-loader__utensil { width: 13px; height: 13px; }
    .brand-loader--lg .brand-loader__logo    { width: 62px; height: 62px; }
    .brand-loader--lg .brand-loader__utensil { width: 28px; height: 28px; }

    @keyframes brand-loader-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50%      { transform: scale(1.08); opacity: .7; }
    }
    @keyframes brand-loader-bounce {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-7px); }
    }
  `]
})
export class LoaderComponent {
  private readonly restaurantSvc = inject(RestaurantService);

  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() label = '';
  @Input() overlay = false;

  readonly logoUrl = computed(() => this.restaurantSvc.current() ? this.restaurantSvc.logoUrl() : OMBOA_MAIN_LOGO);
}
