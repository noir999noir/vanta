
import {
  Injectable,
  signal
} from '@angular/core';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import {
  firstValueFrom
} from 'rxjs';

import {
  AuthService
} from './auth.service';

import {
  environment
} from '../../environments/environment.prod';

export interface InstagramProfile {
  id?: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
}

export interface InstagramDataResponse {
  success: boolean;
  connected: boolean;
  profile?: InstagramProfile | null;
  media?: unknown[];
  message?: string;
}

export interface InstagramStartResponse {
  success: boolean;
  authUrl?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InstagramService {

  // =====================================================
  // API
  // =====================================================

  private readonly apiUrl = environment.apiUrl;

  // =====================================================
  // GLOBAL STATE
  // =====================================================

  readonly connected = signal(false);

  readonly profile = signal<InstagramProfile | null>(null);

  readonly loading = signal(false);

  readonly connecting = signal(false);

  readonly error = signal('');

  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  // =====================================================
  // GET AUTH HEADERS
  // =====================================================

  private async getHeaders(): Promise<HttpHeaders | null> {
    const session = await this.authService.getSession();

    if (!session?.access_token) {
      return null;
    }

    return new HttpHeaders({
      Authorization: `Bearer ${session.access_token}`
    });
  }

  // =====================================================
  // LOAD INSTAGRAM STATE
  // =====================================================

  async load(): Promise<void> {
    // Non avviare una seconda richiesta se una è già in corso.
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const headers = await this.getHeaders();

      if (!headers) {
        this.connected.set(false);
        this.profile.set(null);
        return;
      }

      const response = await firstValueFrom(
        this.http.get<InstagramDataResponse>(
          `${this.apiUrl}/api/instagram/data`,
          { headers }
        )
      );

      if (
        response?.success &&
        response.connected &&
        response.profile
      ) {
        this.connected.set(true);
        this.profile.set(response.profile);
      } else {
        this.connected.set(false);
        this.profile.set(null);

        if (response?.message) {
          this.error.set(response.message);
        }
      }

    } catch (error: any) {
      console.error(
        '❌ InstagramService load error:',
        error
      );

      this.connected.set(false);
      this.profile.set(null);

      this.error.set(
        error?.error?.message ||
        'Unable to load Instagram connection.'
      );

    } finally {
      this.loading.set(false);
    }
  }

  // =====================================================
  // REFRESH
  // =====================================================

  async refresh(): Promise<void> {
    // Consenti un nuovo caricamento anche dopo uno precedente.
    this.loading.set(false);

    await this.load();
  }

  // =====================================================
  // CONNECT INSTAGRAM
  // =====================================================

  async connect(): Promise<void> {
    if (this.connecting()) {
      return;
    }

    this.connecting.set(true);
    this.error.set('');

    try {
      const headers = await this.getHeaders();

      if (!headers) {
        this.error.set(
          'Please log in to VANTA first.'
        );

        this.connecting.set(false);
        return;
      }

      const response = await firstValueFrom(
        this.http.post<InstagramStartResponse>(
          `${this.apiUrl}/api/auth/instagram/start`,
          {},
          { headers }
        )
      );

      if (!response?.success || !response.authUrl) {
        throw new Error(
          response?.message ||
          'Unable to start Instagram connection.'
        );
      }

      // Controlla che il server abbia restituito un URL valido.
      const authUrl = new URL(response.authUrl);

      if (
        authUrl.protocol !== 'https:' ||
        authUrl.hostname !== 'www.instagram.com'
      ) {
        throw new Error(
          'The Instagram authorization URL is invalid.'
        );
      }

      // Il browser deve navigare alla pagina di autorizzazione.
      // Instagram ritornerà all'URL callback configurato sul backend.
      window.location.assign(authUrl.toString());

    } catch (error: any) {
      console.error(
        '❌ InstagramService connect error:',
        error
      );

      this.error.set(
        error?.error?.message ||
        error?.message ||
        'Unable to connect Instagram.'
      );

      this.connecting.set(false);
    }
  }

  // =====================================================
  // DISCONNECT
  // =====================================================

  disconnect(): void {
    this.connected.set(false);
    this.profile.set(null);
    this.error.set('');
  }

  // =====================================================
  // HELPERS
  // =====================================================

  getUsername(): string {
    return (
      this.profile()?.username ||
      'Instagram'
    );
  }

  getName(): string {
    return (
      this.profile()?.name ||
      this.getUsername()
    );
  }

  getAvatar(): string {
    return (
      this.profile()?.profile_picture_url ||
      ''
    );
  }
}
