import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import {
  AuthService
} from '../../core/auth.service';

import {
  InstagramService,
  InstagramProfile
} from '../../core/instagram.service';
import { environment } from '../../../environments/environment';


interface InstagramMedia {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
}


interface ProfileDNA {
  mood: string[];
  visualStyle: string[];
  palette: string[];
  composition: string[];
  typography: string[];
  texture: string[];
  identity: string[];
  recommendations: string[];
  impactScore: number;
}


interface InstagramDataResponse {
  success: boolean;
  connected: boolean;
  profile?: InstagramProfile | null;
  media?: InstagramMedia[];
  message?: string;
}


interface AnalyzeResponse {
  success: boolean;
  connected?: boolean;
  profile: InstagramProfile;
  media: InstagramMedia[];
  dna: ProfileDNA;
  analyzed_at: string;
  message?: string;
}


@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile implements OnInit {

  // =====================================================
  // GLOBAL INSTAGRAM STATE
  // =====================================================


  // =====================================================
  // PROFILE
  // =====================================================

  profile =
    signal<InstagramProfile | null>(null);


  // =====================================================
  // PROFILE DNA
  // =====================================================

  dna =
    signal<ProfileDNA | null>(null);


  // =====================================================
  // ANALYZED MEDIA
  // =====================================================

  media =
    signal<InstagramMedia[]>([]);


  // =====================================================
  // UI STATE
  // =====================================================

  loading =
    signal(true);

  analyzing =
    signal(false);

  error =
    signal('');


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    public readonly instagramService: InstagramService
  ) {}


  // =====================================================
  // INIT
  // =====================================================

  async ngOnInit(): Promise<void> {

    this.loading.set(true);
    this.error.set('');


    try {

      // -------------------------------------------------
      // LOAD GLOBAL INSTAGRAM STATE
      // -------------------------------------------------

      await this.instagramService.load();


      // -------------------------------------------------
      // CHECK CONNECTION
      // -------------------------------------------------

      if (!this.instagramService.connected()) {

        this.profile.set(null);
        this.media.set([]);

        return;
      }


      // -------------------------------------------------
      // USE GLOBAL PROFILE
      // -------------------------------------------------

      this.profile.set(
        this.instagramService.profile()
      );


      // -------------------------------------------------
      // LOAD MEDIA
      // -------------------------------------------------

      await this.loadInstagramMedia();

    } catch (error) {

      console.error(
        '❌ Profile initialization error:',
        error
      );

      this.error.set(
        'Unable to load your Instagram profile.'
      );

    } finally {

      this.loading.set(false);
    }
  }


  // =====================================================
  // LOAD INSTAGRAM MEDIA
  // =====================================================

  private async loadInstagramMedia(): Promise<void> {

    const session =
      await this.authService.getSession();


    if (!session) {

      this.media.set([]);

      return;
    }


    const headers =
      new HttpHeaders({
        Authorization:
          `Bearer ${session.access_token}`
      });


    this.http
      .get<InstagramDataResponse>(
        `${environment.apiUrl}/api/instagram/data`,
        {
          headers
        }
      )
      .subscribe({

        next: (response) => {

          console.log(
            '📸 Instagram media:',
            response.media
          );


          this.media.set(
            response.media ?? []
          );
        },


        error: (error) => {

          console.error(
            '❌ Instagram media error:',
            error
          );


          this.media.set([]);
        }

      });
  }


  // =====================================================
  // ANALYZE PROFILE
  // =====================================================

  async analyzeProfile(): Promise<void> {

    if (this.analyzing()) {

      return;
    }


    // ---------------------------------------------------
    // CHECK INSTAGRAM
    // ---------------------------------------------------

    if (!this.instagramService.connected()) {

      this.error.set(
        'Connect Instagram before analyzing your profile.'
      );

      return;
    }


    this.analyzing.set(true);
    this.error.set('');


    console.log(
      '🚀 Starting VANTA analysis...'
    );


    try {

      // -------------------------------------------------
      // GET VANTA SESSION
      // -------------------------------------------------

      const session =
        await this.authService.getSession();


      if (!session) {

        throw new Error(
          'VANTA session expired.'
        );
      }


      // -------------------------------------------------
      // AUTH HEADERS
      // -------------------------------------------------

      const headers =
        new HttpHeaders({
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${session.access_token}`
        });


      // -------------------------------------------------
      // ANALYZE
      // -------------------------------------------------

      this.http
        .post<AnalyzeResponse>(
          `${environment.apiUrl}/api/instagram/analyze`,
          {},
          {
            headers
          }
        )
        .subscribe({

          next: (response) => {

            console.log(
              '🔥 VANTA ANALYSIS RESPONSE:',
              response
            );


            console.log(
              '🧬 DNA RECEIVED:',
              response.dna
            );


            console.log(
              '📸 MEDIA ANALYZED:',
              response.media
            );


            // ---------------------------------------------
            // PROFILE
            // ---------------------------------------------

            this.profile.set(
              response.profile
            );


            // ---------------------------------------------
            // MEDIA
            // ---------------------------------------------

            this.media.set(
              response.media ?? []
            );


            // ---------------------------------------------
            // DNA
            // ---------------------------------------------

            this.dna.set(
              response.dna
            );


            // ---------------------------------------------
            // REFRESH GLOBAL INSTAGRAM STATE
            // ---------------------------------------------

            this.instagramService.refresh();


            // ---------------------------------------------
            // FINISH
            // ---------------------------------------------

            this.analyzing.set(false);


            console.log(
              '✅ PROFILE SIGNAL UPDATED:',
              this.profile()
            );


            console.log(
              '✅ MEDIA SIGNAL UPDATED:',
              this.media()
            );


            console.log(
              '✅ DNA SIGNAL UPDATED:',
              this.dna()
            );
          },


          error: (error) => {

            console.error(
              '❌ VANTA analysis error:',
              error
            );


            this.error.set(
              error?.error?.message ||
              'Unable to analyze your Instagram profile.'
            );


            this.analyzing.set(false);
          }

        });

    } catch (error: any) {

      console.error(
        '❌ VANTA analysis session error:',
        error
      );


      this.error.set(
        error?.message ||
        'Unable to analyze your Instagram profile.'
      );


      this.analyzing.set(false);
    }
  }
}