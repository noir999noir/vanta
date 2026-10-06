import {
  Injectable,
  signal
} from '@angular/core';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import {
  AuthService
} from './auth.service';

import { environment } from '../../environments/environment';
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

  private readonly apiUrl =
    environment.apiUrl;


  // =====================================================
  // GLOBAL STATE
  // =====================================================

  readonly connected =
    signal(false);

  readonly profile =
    signal<InstagramProfile | null>(
      null
    );

  readonly loading =
    signal(false);

  readonly connecting =
    signal(false);

  readonly error =
    signal('');


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

  private async getHeaders():
    Promise<HttpHeaders | null> {

    const session =
      await this.authService.getSession();

    if (!session) {
      return null;
    }

    return new HttpHeaders({
      Authorization:
        `Bearer ${session.access_token}`
    });
  }


  // =====================================================
  // LOAD INSTAGRAM STATE
  // =====================================================

  async load(): Promise<void> {

    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');


    try {

      const headers =
        await this.getHeaders();


      // -------------------------------------------------
      // NO VANTA SESSION
      // -------------------------------------------------

      if (!headers) {

        this.connected.set(false);
        this.profile.set(null);

        return;
      }


      // -------------------------------------------------
      // GET INSTAGRAM DATA
      // -------------------------------------------------

      this.http
        .get<InstagramDataResponse>(
          `${this.apiUrl}/api/instagram/data`,
          {
            headers
          }
        )
        .subscribe({

          next: (response) => {

            if (
              response.success &&
              response.connected &&
              response.profile
            ) {

              this.connected.set(true);

              this.profile.set(
                response.profile
              );

            } else {

              this.connected.set(false);

              this.profile.set(null);
            }


            this.loading.set(false);
          },


          error: (error) => {

            console.error(
              '❌ InstagramService load error:',
              error
            );


            // 401 = nessun collegamento Instagram
            if (
              error?.status === 401
            ) {

              this.connected.set(false);
              this.profile.set(null);

              this.loading.set(false);

              return;
            }


            this.error.set(
              'Unable to load Instagram connection.'
            );

            this.connected.set(false);

            this.loading.set(false);
          }
        });

    } catch (error) {

      console.error(
        '❌ InstagramService session error:',
        error
      );

      this.connected.set(false);
      this.profile.set(null);

      this.error.set(
        'Unable to verify Instagram connection.'
      );

      this.loading.set(false);
    }
  }


  // =====================================================
  // REFRESH
  // =====================================================

  async refresh(): Promise<void> {

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

      const headers =
        await this.getHeaders();


      // -------------------------------------------------
      // NO VANTA SESSION
      // -------------------------------------------------

      if (!headers) {

        this.error.set(
          'Please log in to VANTA first.'
        );

        this.connecting.set(false);

        return;
      }


      // -------------------------------------------------
      // START OAUTH
      // -------------------------------------------------

      this.http
        .post<InstagramStartResponse>(
          `${this.apiUrl}/api/auth/instagram/start`,
          {},
          {
            headers
          }
        )
        .subscribe({

          next: (response) => {

            if (
              response.success &&
              response.authUrl
            ) {

              window.location.href =
                response.authUrl;

              return;
            }


            this.error.set(
              response.message ||
              'Unable to start Instagram connection.'
            );

            this.connecting.set(false);
          },


          error: (error) => {

            console.error(
              '❌ InstagramService connect error:',
              error
            );


            this.error.set(
              error?.error?.message ||
              'Unable to connect Instagram.'
            );

            this.connecting.set(false);
          }
        });

    } catch (error) {

      console.error(
        '❌ InstagramService connection error:',
        error
      );


      this.error.set(
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
      this.profile()
        ?.username ||
      'Instagram'
    );
  }


  getName(): string {

    return (
      this.profile()
        ?.name ||
      this.getUsername()
    );
  }


  getAvatar(): string {

    return (
      this.profile()
        ?.profile_picture_url ||
      ''
    );
  }
}