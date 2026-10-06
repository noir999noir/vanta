import {
  Injectable,
  signal
} from '@angular/core';

import {
  AuthChangeEvent,
  Session,
  User
} from '@supabase/supabase-js';

import {
  SupabaseService
} from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // =====================================================
  // GLOBAL AUTH STATE
  // =====================================================

  readonly user =
    signal<User | null>(null);

  readonly session =
    signal<Session | null>(null);

  readonly loading =
    signal(true);


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private readonly supabaseService:
      SupabaseService
  ) {

    void this.init();

  }


  // =====================================================
  // INITIALIZE AUTH
  // =====================================================

  private async init(): Promise<void> {

    try {

      const session =
        await this.supabaseService
          .getSession();

      this.session.set(
        session
      );

      this.user.set(
        session?.user ?? null
      );


      // -------------------------------------------------
      // LISTEN FOR AUTH CHANGES
      // -------------------------------------------------

      this.supabaseService
        .getClient()
        .auth
        .onAuthStateChange(
          (
            _event: AuthChangeEvent,
            session: Session | null
          ) => {

            this.session.set(
              session
            );

            this.user.set(
              session?.user ?? null
            );

          }
        );

    } catch (error) {

      console.error(
        '❌ VANTA Auth initialization error:',
        error
      );

      this.session.set(
        null
      );

      this.user.set(
        null
      );

    } finally {

      this.loading.set(
        false
      );

    }

  }


  // =====================================================
  // REGISTER
  // =====================================================

  async signUp(
    email: string,
    password: string
  ) {

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    const {
      data,
      error
    } = await this.supabaseService
      .getClient()
      .auth
      .signUp({
        email: normalizedEmail,
        password
      });

    if (error) {
      throw error;
    }

    // ---------------------------------------------------
    // Supabase may return a session immediately
    // or require email confirmation.
    // ---------------------------------------------------

    this.session.set(
      data.session
    );

    this.user.set(
      data.user
    );

    return data;

  }


  // =====================================================
  // LOGIN
  // =====================================================

  async signIn(
    email: string,
    password: string
  ) {

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    const {
      data,
      error
    } = await this.supabaseService
      .getClient()
      .auth
      .signInWithPassword({
        email: normalizedEmail,
        password
      });

    if (error) {
      throw error;
    }

    this.session.set(
      data.session
    );

    this.user.set(
      data.user
    );

    return data;

  }


  // =====================================================
  // LOGOUT
  // =====================================================

  async signOut(): Promise<void> {

    const {
      error
    } = await this.supabaseService
      .getClient()
      .auth
      .signOut();

    if (error) {
      throw error;
    }

    this.session.set(
      null
    );

    this.user.set(
      null
    );

  }


  // =====================================================
  // CURRENT USER
  // =====================================================

  async getUser(): Promise<User | null> {

    return this.supabaseService
      .getUser();

  }


  // =====================================================
  // CURRENT SESSION
  // =====================================================

  async getSession(): Promise<Session | null> {

    const session =
      await this.supabaseService
        .getSession();

    // Keep local state synchronized.
    this.session.set(
      session
    );

    this.user.set(
      session?.user ?? null
    );

    return session;

  }


  // =====================================================
  // AUTHENTICATED?
  // =====================================================

  isAuthenticated(): boolean {

    return !!this.user();

  }

}