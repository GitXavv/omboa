import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  readonly auth  = inject(AuthService);
  readonly cart  = inject(CartService);
  readonly menuOpen = signal(false);

  toggle() { this.menuOpen.update(v => !v); }
  close()  { this.menuOpen.set(false); }
  logout() { this.auth.logout(); this.close(); }
}
