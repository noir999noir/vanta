import {
  Component,
  OnInit
} from '@angular/core';

import {
  RouterOutlet
} from '@angular/router';

import {
  ThemeService
} from './core/theme.service';

@Component({
  selector: 'app-root',

  standalone: true,

  imports: [
    RouterOutlet
  ],

  template: `
    <router-outlet />
  `
})
export class App
  implements OnInit {

  constructor(
    private readonly themeService: ThemeService
  ) {}


  ngOnInit(): void {

    /*
     * ThemeService viene inizializzato
     * all'avvio dell'applicazione.
     *
     * In questo modo il tema è globale
     * indipendentemente dalla route.
     */
    this.themeService.refresh();
  }
}