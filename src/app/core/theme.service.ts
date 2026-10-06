import {
  Injectable
} from '@angular/core';

export type VantaTheme =
  | 'dark'
  | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private readonly storageKey =
    'vanta-theme';

  private currentTheme: VantaTheme =
    'dark';


  constructor() {
    this.initialize();
  }


  /**
   * Inizializza il tema globale.
   *
   * Prima prova a leggere il tema salvato
   * localmente, così il cambio pagina/reload
   * non provoca un flash del tema precedente.
   */
  private initialize(): void {

    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined'
    ) {
      return;
    }

    const savedTheme =
      window.localStorage.getItem(
        this.storageKey
      );

    const theme =
      savedTheme === 'light'
        ? 'light'
        : 'dark';

    this.apply(theme);
  }


  /**
   * Tema attualmente applicato.
   */
  getTheme(): VantaTheme {
    return this.currentTheme;
  }


  /**
   * Imposta il tema globale VANTA.
   */
  setTheme(
    theme: VantaTheme
  ): void {

    this.apply(theme);

    if (
      typeof window !== 'undefined'
    ) {
      window.localStorage.setItem(
        this.storageKey,
        theme
      );
    }
  }


  /**
   * Applica il tema all'intera applicazione.
   */
  private apply(
    theme: VantaTheme
  ): void {

    if (
      typeof document === 'undefined'
    ) {
      return;
    }

    this.currentTheme = theme;

    const html =
      document.documentElement;

    const body =
      document.body;


    /*
     * Attributo globale.
     *
     * Questo sarà utilizzato da tutti gli
     * SCSS globali di VANTA.
     */
    html.setAttribute(
      'data-vanta-theme',
      theme
    );


    /*
     * Classi globali.
     */
    body.classList.toggle(
      'vanta-dark',
      theme === 'dark'
    );

    body.classList.toggle(
      'vanta-light',
      theme === 'light'
    );


    /*
     * Variabile CSS globale.
     */
    html.style.setProperty(
      '--vanta-theme',
      theme
    );


    /*
     * Variabili fondamentali globali.
     *
     * I componenti possono utilizzare direttamente
     * var(--vanta-bg), var(--vanta-text), ecc.
     */
    html.style.setProperty(
      '--vanta-bg',
      theme === 'dark'
        ? '#080808'
        : '#f4f4f5'
    );

    html.style.setProperty(
      '--vanta-bg-soft',
      theme === 'dark'
        ? '#0d0d0d'
        : '#ffffff'
    );

    html.style.setProperty(
      '--vanta-surface',
      theme === 'dark'
        ? '#111111'
        : '#ffffff'
    );

    html.style.setProperty(
      '--vanta-text',
      theme === 'dark'
        ? '#ffffff'
        : '#090909'
    );

    html.style.setProperty(
      '--vanta-text-soft',
      theme === 'dark'
        ? '#b0b0b0'
        : '#555555'
    );

    html.style.setProperty(
      '--vanta-text-muted',
      theme === 'dark'
        ? '#6f6f6f'
        : '#888888'
    );

    html.style.setProperty(
      '--vanta-border',
      theme === 'dark'
        ? 'rgba(255,255,255,0.09)'
        : 'rgba(0,0,0,0.09)'
    );

    html.style.setProperty(
      '--vanta-border-strong',
      theme === 'dark'
        ? 'rgba(255,255,255,0.16)'
        : 'rgba(0,0,0,0.16)'
    );

    html.style.setProperty(
      '--vanta-accent',
      '#ff1717'
    );
  }


  /**
   * Riapplica il tema attualmente memorizzato.
   */
  refresh(): void {

    if (
      typeof window === 'undefined'
    ) {
      return;
    }

    const savedTheme =
      window.localStorage.getItem(
        this.storageKey
      );

    this.apply(
      savedTheme === 'light'
        ? 'light'
        : 'dark'
    );
  }


  /**
   * Rimuove il tema locale e torna a Dark.
   *
   * Utile come fallback/reset.
   */
  reset(): void {

    if (
      typeof window !== 'undefined'
    ) {
      window.localStorage.removeItem(
        this.storageKey
      );
    }

    this.setTheme('dark');
  }
}