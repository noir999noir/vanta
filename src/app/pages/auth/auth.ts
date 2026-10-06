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

  // =====================================================
  // FORM
  // =====================================================

  email = '';

  password = '';


  // =====================================================
  // MODE
  // =====================================================

  mode =
    signal<'login' | 'register'>(
      'login'
    );


  // =====================================================
  // UI STATE
  // =====================================================

  loading =
    signal(false);

  error =
    signal('');

  success =
    signal('');


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private readonly authService:
      AuthService,

    private readonly router:
      Router
  ) {}


  // =====================================================
  // CHANGE MODE
  // =====================================================

  setMode(
    mode: 'login' | 'register'
  ): void {

    this.mode.set(
      mode
    );

    this.error.set(
      ''
    );

    this.success.set(
      ''
    );

  }


  // =====================================================
  // SUBMIT
  // =====================================================

  async submit(): Promise<void> {

    if (
      this.loading()
    ) {
      return;
    }


    // ---------------------------------------------------
    // RESET MESSAGES
    // ---------------------------------------------------

    this.error.set(
      ''
    );

    this.success.set(
      ''
    );


    // ---------------------------------------------------
    // NORMALIZE INPUT
    // ---------------------------------------------------

    const email =
      this.email
        .trim()
        .toLowerCase();

    const password =
      this.password;


    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    if (
      !email ||
      !password
    ) {

      this.error.set(
        'Inserisci email e password.'
      );

      return;

    }


    if (
      !this.isValidEmail(email)
    ) {

      this.error.set(
        'Inserisci un indirizzo email valido.'
      );

      return;

    }


    if (
      password.length < 6
    ) {

      this.error.set(
        'La password deve contenere almeno 6 caratteri.'
      );

      return;

    }


    // ---------------------------------------------------
    // START
    // ---------------------------------------------------

    this.loading.set(
      true
    );


    try {

      // =================================================
      // LOGIN
      // =================================================

      if (
        this.mode() === 'login'
      ) {

        await this.authService
          .signIn(
            email,
            password
          );


        await this.router.navigate([
          '/dashboard'
        ]);

        return;

      }


      // =================================================
      // REGISTER
      // =================================================

      const result =
        await this.authService
          .signUp(
            email,
            password
          );


      // -------------------------------------------------
      // SESSION CREATED IMMEDIATELY
      // -------------------------------------------------

      if (
        result.session
      ) {

        await this.router.navigate([
          '/dashboard'
        ]);

        return;

      }


      // -------------------------------------------------
      // EMAIL CONFIRMATION REQUIRED
      // -------------------------------------------------

      this.success.set(
        'Account creato. Controlla la tua email per confermare l’account.'
      );

      this.password = '';

    } catch (error: any) {

      console.error(
        '❌ VANTA authentication error:',
        error
      );


      this.error.set(
        this.getAuthErrorMessage(
          error
        )
      );

    } finally {

      this.loading.set(
        false
      );

    }

  }


  // =====================================================
  // EMAIL VALIDATION
  // =====================================================

  private isValidEmail(
    email: string
  ): boolean {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(email);

  }


  // =====================================================
  // SUPABASE ERROR TRANSLATION
  // =====================================================

  private getAuthErrorMessage(
    error: any
  ): string {

    const message =
      String(
        error?.message ?? ''
      ).toLowerCase();


    if (
      message.includes(
        'invalid login credentials'
      )
    ) {

      return 'Email o password non corretti.';

    }


    if (
      message.includes(
        'email not confirmed'
      )
    ) {

      return 'Devi confermare la tua email prima di accedere.';

    }


    if (
      message.includes(
        'user already registered'
      )
    ) {

      return 'Questa email è già registrata. Prova ad accedere.';

    }


    if (
      message.includes(
        'password should be at least'
      )
    ) {

      return 'La password deve contenere almeno 6 caratteri.';

    }


    if (
      message.includes(
        'invalid email'
      )
    ) {

      return 'Inserisci un indirizzo email valido.';

    }


    if (
      message.includes(
        'rate limit'
      )
    ) {

      return 'Troppi tentativi. Attendi qualche minuto e riprova.';

    }


    return (
      error?.message ||
      'Si è verificato un errore. Riprova.'
    );

  }

}