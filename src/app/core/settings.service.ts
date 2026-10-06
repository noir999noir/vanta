import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import { firstValueFrom } from 'rxjs';

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

  creativeDirection:
    CreativeDirection;

  openLoop: boolean;

  preserveDNA: boolean;

  theme: VantaTheme;

  avatarUrl:
    string | null;

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


  // ===================================================
  // API
  // ===================================================

  private readonly apiUrl =
    `${environment.apiUrl}/api/settings`;


  // ===================================================
  // CONSTRUCTOR
  // ===================================================

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}


  // ===================================================
  // AUTH HEADERS
  // ===================================================

  private async getHeaders(): Promise<HttpHeaders> {

    const session =
      await this.authService.getSession();


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

      Authorization:
        `Bearer ${session.access_token}`,

      'Content-Type':
        'application/json'

    });

  }


  // ===================================================
  // LOAD SETTINGS
  // ===================================================

  async load(): Promise<SettingsResponse> {

    const headers =
      await this.getHeaders();


    try {

      return await firstValueFrom(

        this.http.get<SettingsResponse>(

          this.apiUrl,

          {
            headers
          }

        )

      );

    }

    catch (error) {

      console.error(
        '❌ SettingsService.load:',
        error
      );

      throw error;

    }

  }


  // ===================================================
  // SAVE SETTINGS
  // ===================================================

  async save(
    settings: VantaSettings
  ): Promise<SaveSettingsResponse> {

    const headers =
      await this.getHeaders();


    const payload: VantaSettings = {

      name:
        settings.name?.trim() ||
        'Riccardo',

      role:
        settings.role?.trim() ||
        'Creator',

      creativeDirection:
        settings.creativeDirection ||
        'Balanced',

      openLoop:
        Boolean(
          settings.openLoop
        ),

      preserveDNA:
        Boolean(
          settings.preserveDNA
        ),

      theme:
        settings.theme === 'light'
          ? 'light'
          : 'dark',

      avatarUrl:
        settings.avatarUrl ||
        null

    };


    console.log(
      '⚙️ VANTA saving settings:',
      payload
    );


    try {

      const response =
        await firstValueFrom(

          this.http.put<SaveSettingsResponse>(

            this.apiUrl,

            payload,

            {
              headers
            }

          )

        );


      console.log(
        '✅ VANTA settings saved:',
        response
      );


      return response;

    }

    catch (error) {

      console.error(
        '❌ SettingsService.save:',
        error
      );

      throw error;

    }

  }


  // ===================================================
  // LOAD CREDITS
  // ===================================================

  async loadCredits(): Promise<CreditsResponse> {

    const headers =
      await this.getHeaders();


    try {

      return await firstValueFrom(

        this.http.get<CreditsResponse>(

          `${this.apiUrl}/credits`,

          {
            headers
          }

        )

      );

    }

    catch (error) {

      console.error(
        '❌ SettingsService.loadCredits:',
        error
      );

      throw error;

    }

  }


  // ===================================================
  // LOAD INSTAGRAM
  // ===================================================

  async loadInstagram(): Promise<InstagramResponse> {

    const headers =
      await this.getHeaders();


    try {

      return await firstValueFrom(

        this.http.get<InstagramResponse>(

          `${this.apiUrl}/instagram`,

          {
            headers
          }

        )

      );

    }

    catch (error) {

      console.error(
        '❌ SettingsService.loadInstagram:',
        error
      );

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

    if (
      error instanceof Error &&
      error.message
    ) {

      return error.message;

    }


    if (
      typeof error === 'object' &&
      error !== null
    ) {

      const response =
        error as {

          error?: ApiErrorResponse;

          message?: string;

        };


      if (
        response.error?.message
      ) {

        return response.error.message;

      }


      if (
        response.message
      ) {

        return response.message;

      }

    }


    return fallback;

  }

}