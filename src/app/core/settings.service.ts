
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

// =====================================================
// TYPES
// =====================================================

export type CreativeDirection =
  | 'Safe'
  | 'Balanced'
  | 'Experimental';

export type VantaTheme =
  | 'dark'
  | 'light';

export interface VantaSettings {
  name: string;
  role: string;
  creativeDirection: CreativeDirection;
  openLoop: boolean;
  preserveDNA: boolean;
  theme: VantaTheme;
}

export interface VantaPlan {
  name: string;
  credits: number;
  monthlyCredits: number;
}

export interface InstagramProfile {
  connected: boolean;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export interface SettingsResponse {
  success: boolean;
  settings: VantaSettings;
  plan: VantaPlan;
}

export interface SaveSettingsResponse {
  success: boolean;
  settings: VantaSettings;
  plan: VantaPlan;
}

export interface CreditsResponse {
  success: boolean;
  plan: VantaPlan;
}

export interface InstagramResponse {
  success: boolean;
  connected: boolean;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  profile?: InstagramProfile | null;
}

export interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

// =====================================================
// SERVICE
// =====================================================

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  private readonly apiUrl =
    `${environment.apiUrl}/api/settings`;

  private readonly requestTimeout = 10000;
  private readonly sessionTimeout = 10000;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  // ===================================================
  // AUTH HEADERS
  // ===================================================

  private async getHeaders(): Promise<HttpHeaders> {
    const session = await this.withTimeout(
      this.authService.getSession(),
      this.sessionTimeout,
      'Unable to retrieve your session. Please log in again.'
    );

    if (!session) {
      throw new Error(
        'VANTA session expired. Please log in again.'
      );
    }

    if (!session.access_token) {
      throw new Error(
        'VANTA authentication token is missing.'
      );
    }

    return new HttpHeaders({
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    });
  }

  // ===================================================
  // PROMISE TIMEOUT
  // ===================================================

  private withTimeout<T>(
    promise: Promise<T>,
    milliseconds: number,
    message: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(message));
      }, milliseconds);

      promise.then(
        value => {
          clearTimeout(timer);
          resolve(value);
        },
        error => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }

  // ===================================================
  // LOAD SETTINGS
  // ===================================================

  async load(): Promise<SettingsResponse> {
    try {
      const headers = await this.getHeaders();

      return await firstValueFrom(
        this.http.get<SettingsResponse>(
          this.apiUrl,
          { headers }
        ).pipe(
          timeout({ first: this.requestTimeout })
        )
      );
    } catch (error: unknown) {
      console.error('❌ SettingsService.load:', error);
      throw error;
    }
  }

  // ===================================================
  // SAVE SETTINGS
  // ===================================================

  async save(
    settings: VantaSettings
  ): Promise<SaveSettingsResponse> {
    try {
      const headers = await this.getHeaders();

      const payload: VantaSettings = {
        name: settings.name?.trim() || 'Riccardo',
        role: settings.role?.trim() || 'Creator',
        creativeDirection:
          settings.creativeDirection || 'Balanced',
        openLoop: Boolean(settings.openLoop),
        preserveDNA: Boolean(settings.preserveDNA),
        theme: settings.theme === 'light' ? 'light' : 'dark',
      };

      console.log('⚙️ VANTA saving settings:', payload);

      const response = await firstValueFrom(
        this.http.put<SaveSettingsResponse>(
          this.apiUrl,
          payload,
          { headers }
        ).pipe(
          timeout({ first: this.requestTimeout })
        )
      );

      console.log('✅ VANTA settings saved:', response);

      return response;
    } catch (error: unknown) {
      console.error('❌ SettingsService.save:', error);
      throw error;
    }
  }

  // ===================================================
  // LOAD CREDITS
  // ===================================================

  async loadCredits(): Promise<CreditsResponse> {
    try {
      const headers = await this.getHeaders();

      return await firstValueFrom(
        this.http.get<CreditsResponse>(
          `${this.apiUrl}/credits`,
          { headers }
        ).pipe(
          timeout({ first: this.requestTimeout })
        )
      );
    } catch (error: unknown) {
      console.error('❌ SettingsService.loadCredits:', error);
      throw error;
    }
  }

  // ===================================================
  // LOAD INSTAGRAM
  // ===================================================

  async loadInstagram(): Promise<InstagramResponse> {
    try {
      const headers = await this.getHeaders();

      return await firstValueFrom(
        this.http.get<InstagramResponse>(
          `${this.apiUrl}/instagram`,
          { headers }
        ).pipe(
          timeout({ first: this.requestTimeout })
        )
      );
    } catch (error: unknown) {
      console.error('❌ SettingsService.loadInstagram:', error);
      throw error;
    }
  }

  // ===================================================
  // ERROR MESSAGE
  // ===================================================

  getErrorMessage(
    error: unknown,
    fallback = 'Something went wrong.'
  ): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null) {
      const response = error as {
        error?: ApiErrorResponse;
        message?: string;
        name?: string;
      };

      if (response.error?.message) {
        return response.error.message;
      }

      if (response.message) {
        return response.message;
      }

      if (response.name === 'TimeoutError') {
        return 'The request timed out. Please try again.';
      }
    }

    return fallback;
  }
}
