import { Component, OnInit, ViewEncapsulation, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { ThemeService } from './core/theme.service';
import { GlobalNavigation } from './shared/global-navigation/global-navigation';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GlobalNavigation],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None
})
export class App implements OnInit {
  readonly showNavigation = signal(true);

  constructor(
    private readonly themeService: ThemeService,
    private readonly router: Router
  ) {
    this.updateNavigationVisibility(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.updateNavigationVisibility(event.urlAfterRedirects));
  }

  ngOnInit(): void {
    this.themeService.refresh();
  }

  private updateNavigationVisibility(url: string): void {
    const path = url.split('?')[0].split('#')[0];

    // Billing e autenticazione mantengono layout indipendente.
    const standaloneRoutes = ['/billing', '/auth', '/reset-password'];

    this.showNavigation.set(
      !standaloneRoutes.some(route => path === route || path.startsWith(`${route}/`))
    );
  }
}
