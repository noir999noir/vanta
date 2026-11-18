import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-global-navigation',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './global-navigation.html',
  styleUrl: './global-navigation.scss'
})
export class GlobalNavigation implements OnInit {
  readonly isAuthenticated = signal(false);
  readonly authResolved = signal(false);
  readonly loggingOut = signal(false);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const session = await this.authService.getSession();
      this.isAuthenticated.set(!!session?.access_token);
    } catch (error) {
      console.error('Errore verifica sessione navigazione:', error);
      this.isAuthenticated.set(false);
    } finally {
      this.authResolved.set(true);
    }
  }

  async logout(): Promise<void> {
    if (this.loggingOut()) return;

    this.loggingOut.set(true);
    try {
      await this.authService.signOut();
      this.isAuthenticated.set(false);
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Errore durante il logout:', error);
    } finally {
      this.loggingOut.set(false);
    }
  }
}
