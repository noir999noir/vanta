import {
  Component,
  signal
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  Router
} from '@angular/router';

import {
  AuthService
} from '../../core/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './auth.html',
  styleUrl: './auth.scss'
})
export class Auth {

  // FORM DATA
  email = '';
  password = '';

  // AUTH MODE
  mode = signal<'login' | 'register'>('login');

  // UI STATE
  loading = signal(false);
  resetLoading = signal(false);

  error = signal('');
  success = signal('');

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  // CHANGE AUTH MODE
  setMode(mode: 'login' | 'register'): void {
    this.mode.set(mode);
    this.error.set('');
    this.success.set('');
  }

  // PASSWORD RECOVERY
  async requestPasswordReset(): Promise<void> {
    if (this.loading() || this.resetLoading()) {
      return;
    }

    this.error.set('');
    this.success.set('');

    const email = this.email.trim().toLowerCase();

    if (!email) {
      this.error.set(
        'Inserisci la tua email nel campo Email address.'
      );
      return;
    }

    if (!this.isValidEmail(email)) {
      this.error.set(
        'Inserisci un indirizzo email valido.'
      );
      return;
    }

    this.resetLoading.set(true);

    try {
      await this.authService.resetPasswordForEmail(email);

      this.success.set(
        'Se l’indirizzo è registrato, riceverai un’email con il link per reimpostare la password. Controlla anche lo spam.'
      );

    } catch (error: any) {
      console.error(
        'VANTA password recovery error:',
        error
      );

      const message = String(
        error?.message ?? ''
      ).toLowerCase();

      if (message.includes('rate limit')) {
        this.error.set(
          'Hai effettuato troppe richieste. Attendi qualche minuto e riprova.'
        );
      } else {
        this.error.set(
          'Non è stato possibile inviare il link. Riprova tra poco.'
        );
      }

    } finally {
      this.resetLoading.set(false);
    }
  }

  // LOGIN / REGISTER
  async submit(): Promise<void> {
    if (this.loading() || this.resetLoading()) {
      return;
    }

    this.error.set('');
    this.success.set('');

    const email = this.email.trim().toLowerCase();
    const password = this.password;

    if (!email || !password) {
      this.error.set(
        'Inserisci email e password.'
      );
      return;
    }

    if (!this.isValidEmail(email)) {
      this.error.set(
        'Inserisci un indirizzo email valido.'
      );
      return;
    }

    if (password.length < 6) {
      this.error.set(
        'La password deve contenere almeno 6 caratteri.'
      );
      return;
    }

    this.loading.set(true);

    try {
      // LOGIN
      if (this.mode() === 'login') {
        await this.authService.signIn(
          email,
          password
        );

        await this.router.navigate([
          '/dashboard'
        ]);

        return;
      }

      // REGISTER
      const result = await this.authService.signUp(
        email,
        password
      );

      if (result.session) {
        await this.router.navigate([
          '/dashboard'
        ]);

        return;
      }

      this.success.set(
        'Account creato. Controlla la tua email per confermare l’account.'
      );

      this.password = '';

    } catch (error: any) {
      console.error(
        'VANTA authentication error:',
        error
      );

      this.error.set(
        this.getAuthErrorMessage(error)
      );

    } finally {
      this.loading.set(false);
    }
  }

  // EMAIL VALIDATION
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // AUTH ERROR MESSAGES
  private getAuthErrorMessage(error: any): string {
    const message = String(
      error?.message ?? ''
    ).toLowerCase();

    if (message.includes('invalid login credentials')) {
      return 'Email o password non corretti.';
    }

    if (message.includes('email not confirmed')) {
      return 'Devi confermare la tua email prima di accedere.';
    }

    if (message.includes('user already registered')) {
      return 'Questa email è già registrata. Prova ad accedere.';
    }

    if (message.includes('password should be at least')) {
      return 'La password deve contenere almeno 6 caratteri.';
    }

    if (message.includes('invalid email')) {
      return 'Inserisci un indirizzo email valido.';
    }

    if (message.includes('rate limit')) {
      return 'Troppi tentativi. Attendi qualche minuto e riprova.';
    }

    return error?.message ||
      'Si è verificato un errore. Riprova.';
  }
}