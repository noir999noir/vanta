import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  RouterLink
} from '@angular/router';

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


interface Visual {
  id: string;
  source_image_url?: string | null;
  generated_image_url: string;
  title?: string | null;
  concept?: string | null;
  theme?: string | null;

  mood?: string[];
  visual_style?: string[];
  palette?: string[];
  composition?: string[];
  typography?: string[];
  texture?: string[];

  source_score?: number | null;
  generated_score?: number | null;
  improvement?: number | null;

  verdict?: 'better' | 'same' | 'worse' | null;

  confidence?: number | null;

  profile_alignment?: {
    mood?: number;
    visualStyle?: number;
    palette?: number;
    composition?: number;
    identity?: number;
    texture?: number;
  };

  strengths?: string[];
  weaknesses?: string[];

  aspect_ratio?: string;
  model?: string;
  created_at?: string;
}


interface VisualsResponse {
  success: boolean;
  visuals: Visual[];
  message?: string;
}


interface FeedAnalysis {
  impactScore: number;
  visualConsistency: number;
  visualRhythm: number;
  colorIdentity: number;
  contentVariety: number;

  summaryTitle: string;
  summaryText: string;

  recommendationTitle: string;
  recommendationText: string;
}


@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './feed.html',
  styleUrl: './feed.scss'
})
export class Feed implements OnInit {

  loading = signal(true);

  refreshing = signal(false);

  error = signal('');

  media = signal<InstagramMedia[]>([]);

  profile = signal<InstagramProfile | null>(null);

  dna = signal<ProfileDNA | null>(null);

  visuals = signal<Visual[]>([]);

  activeView =
    signal<'grid' | 'preview'>('grid');

  analysis =
    signal<FeedAnalysis | null>(null);


  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    public readonly instagramService: InstagramService
  ) {}


  async ngOnInit(): Promise<void> {

    this.loading.set(true);
    this.error.set('');

    try {

      await this.instagramService.load();


      if (
        !this.instagramService.connected()
      ) {

        this.error.set(
          'Connect Instagram before opening your Feed.'
        );

        return;

      }


      await Promise.all([
        this.loadInstagramFeed(),
        this.loadDNA(),
        this.loadVisuals()
      ]);


      this.buildAnalysis();

    } catch (error) {

      console.error(
        '❌ Feed initialization error:',
        error
      );

      this.error.set(
        'Unable to load your VANTA Feed.'
      );

    } finally {

      this.loading.set(false);

    }

  }


  /* =========================================================
     AUTH HEADERS
  ========================================================= */

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


  /* =========================================================
     INSTAGRAM
  ========================================================= */

  private async loadInstagramFeed():
    Promise<void> {

    const headers =
      await this.getHeaders();

    if (!headers) {

      this.error.set(
        'Your VANTA session has expired.'
      );

      return;

    }


    return new Promise(resolve => {

      this.http
        .get<InstagramDataResponse>(
          `${environment.apiUrl}/api/instagram/data`,
          { headers }
        )
        .subscribe({

          next: response => {

            if (
              !response.success ||
              !response.connected
            ) {

              this.error.set(
                response.message ||
                'Instagram is not connected.'
              );

              resolve();
              return;

            }


            this.profile.set(
              response.profile ?? null
            );

            this.media.set(
              response.media ?? []
            );

            resolve();

          },

          error: error => {

            console.error(
              '❌ Instagram feed error:',
              error
            );

            this.error.set(
              error?.error?.message ||
              'Unable to load Instagram content.'
            );

            resolve();

          }

        });

    });

  }


  /* =========================================================
     PROFILE DNA
  ========================================================= */

  private async loadDNA():
    Promise<void> {

    const headers =
      await this.getHeaders();

    if (!headers) {
      return;
    }


    return new Promise(resolve => {

      this.http
        .get<any>(
          `${environment.apiUrl}/api/instagram/dna`,
          { headers }
        )
        .subscribe({

          next: response => {

            if (
              response?.success &&
              response?.dna
            ) {

              this.dna.set(
                response.dna
              );

            }

            resolve();

          },

          error: error => {

            console.warn(
              '⚠️ Profile DNA unavailable:',
              error
            );

            resolve();

          }

        });

    });

  }


  /* =========================================================
     VANTA VISUALS
  ========================================================= */

  private async loadVisuals():
    Promise<void> {

    const headers =
      await this.getHeaders();

    if (!headers) {
      return;
    }


    return new Promise(resolve => {

      this.http
        .get<VisualsResponse>(
          `${environment.apiUrl}/api/visuals`,
          { headers }
        )
        .subscribe({

          next: response => {

            this.visuals.set(
              response?.visuals ?? []
            );

            resolve();

          },

          error: error => {

            console.warn(
              '⚠️ VANTA visuals unavailable:',
              error
            );

            this.visuals.set([]);

            resolve();

          }

        });

    });

  }


  /* =========================================================
     REFRESH
  ========================================================= */

  async refreshFeed(): Promise<void> {

    if (this.refreshing()) {
      return;
    }


    this.refreshing.set(true);
    this.error.set('');


    try {

      await this.instagramService.refresh();


      if (
        !this.instagramService.connected()
      ) {

        this.error.set(
          'Instagram is no longer connected.'
        );

        return;

      }


      await Promise.all([
        this.loadInstagramFeed(),
        this.loadDNA(),
        this.loadVisuals()
      ]);


      this.buildAnalysis();

    } catch (error) {

      console.error(
        '❌ Feed refresh error:',
        error
      );

      this.error.set(
        'Unable to refresh your Feed.'
      );

    } finally {

      this.refreshing.set(false);

    }

  }


  /* =========================================================
     ANALYSIS
  ========================================================= */

  private buildAnalysis(): void {

    const currentDNA =
      this.dna();

    const savedVisuals =
      this.visuals();

    const posts =
      this.media();


    /*
     * Profile DNA is the source of truth.
     */

    const impactScore =
      currentDNA?.impactScore ?? 0;


    /*
     * Visual consistency
     *
     * Uses actual VANTA visual/profile
     * alignment when available.
     */

    let visualConsistency =
      impactScore;


    if (
      savedVisuals.length > 0
    ) {

      const alignmentScores =
        savedVisuals
          .map(visual =>
            this.getVisualAlignmentScore(
              visual
            )
          )
          .filter(
            score => score > 0
          );


      if (
        alignmentScores.length > 0
      ) {

        visualConsistency =
          Math.round(
            alignmentScores.reduce(
              (sum, score) =>
                sum + score,
              0
            ) /
            alignmentScores.length
          );

      }

    }


    /*
     * Visual rhythm
     *
     * Based on content diversity.
     */

    const imageCount =
      posts.filter(
        post =>
          post.media_type === 'IMAGE'
      ).length;

    const videoCount =
      posts.filter(
        post =>
          post.media_type === 'VIDEO'
      ).length;


    let visualRhythm =
      50;


    if (
      imageCount > 0 ||
      videoCount > 0
    ) {

      const total =
        imageCount + videoCount;

      const diversity =
        Math.min(
          1,
          imageCount > 0 &&
          videoCount > 0
            ? 1
            : 0.55
        );


      visualRhythm =
        Math.round(
          55 +
          Math.min(
            30,
            total * 2
          ) *
          diversity
        );

    }


    /*
     * Color identity
     *
     * Driven by actual Profile DNA.
     */

    const palette =
      currentDNA?.palette ?? [];


    const colorIdentity =
      palette.length > 0
        ? Math.min(
            100,
            60 +
            palette.length * 6
          )
        : 0;


    /*
     * Content variety
     */

    const contentVariety =
      posts.length === 0
        ? 0
        : Math.min(
            100,
            55 +
            Math.min(
              35,
              posts.length * 3
            )
          );


    let summaryTitle =
      'Your visual system is ready.';

    let summaryText =
      'VANTA is using your Profile DNA and saved generations to understand the visual language of your profile.';


    if (
      impactScore >= 80
    ) {

      summaryTitle =
        'Your profile has a strong visual identity.';

      summaryText =
        'Your current Profile DNA already defines a recognizable visual direction. VANTA can now extend that identity into new content.';

    } else if (
      impactScore >= 60
    ) {

      summaryTitle =
        'Your profile has a clear visual direction.';

      summaryText =
        'The identity is recognizable, but there is room to increase consistency, contrast and visual impact across future content.';

    } else if (
      impactScore > 0
    ) {

      summaryTitle =
        'Your visual identity has room to grow.';

      summaryText =
        'VANTA detected a developing visual language. Use Create to establish stronger recurring elements across your next visuals.';

    }


    let recommendationTitle =
      'Create your next visual.';

    let recommendationText =
      'Upload a source image in Create and let VANTA extend your Profile DNA while preserving the original subject.';


    if (
      savedVisuals.length > 0
    ) {

      const latest =
        savedVisuals[0];


      if (
        latest.generated_score &&
        latest.generated_score >
        (latest.source_score ?? 0)
      ) {

        recommendationTitle =
          'Keep building from what works.';

        recommendationText =
          'Your latest VANTA generation improved the source impact. Continue using this visual direction to build consistency.';

      } else {

        recommendationTitle =
          'Push the next visual further.';

        recommendationText =
          'Your saved generations give VANTA additional visual evidence to refine future creative directions.';

      }

    }


    this.analysis.set({

      impactScore,

      visualConsistency,

      visualRhythm,

      colorIdentity,

      contentVariety,

      summaryTitle,

      summaryText,

      recommendationTitle,

      recommendationText

    });

  }


  /* =========================================================
     VISUAL ALIGNMENT
  ========================================================= */

  private getVisualAlignmentScore(
    visual: Visual
  ): number {

    const alignment =
      visual.profile_alignment;


    if (!alignment) {
      return 0;
    }


    const values = [
      alignment.mood,
      alignment.visualStyle,
      alignment.palette,
      alignment.composition,
      alignment.identity,
      alignment.texture
    ]
      .filter(
        value =>
          typeof value === 'number'
      ) as number[];


    if (
      values.length === 0
    ) {
      return 0;
    }


    return Math.round(
      values.reduce(
        (sum, value) =>
          sum + value,
        0
      ) /
      values.length
    );

  }


  /* =========================================================
     VIEW
  ========================================================= */

  setView(
    view: 'grid' | 'preview'
  ): void {

    this.activeView.set(
      view
    );

  }


  /* =========================================================
     GETTERS
  ========================================================= */

  getUsername(): string {

    return (
      this.profile()?.username ||
      this.instagramService.getUsername() ||
      'Instagram'
    );

  }


  getImpactScore(): number {

    return (
      this.analysis()?.impactScore ??
      this.dna()?.impactScore ??
      0
    );

  }


  getVisualConsistency(): number {

    return (
      this.analysis()?.visualConsistency ??
      0
    );

  }


  getVisualRhythm(): number {

    return (
      this.analysis()?.visualRhythm ??
      0
    );

  }


  getColorIdentity(): number {

    return (
      this.analysis()?.colorIdentity ??
      0
    );

  }


  getContentVariety(): number {

    return (
      this.analysis()?.contentVariety ??
      0
    );

  }


  getSummaryTitle(): string {

    return (
      this.analysis()?.summaryTitle ||
      'Your feed is ready.'
    );

  }


  getSummaryText(): string {

    return (
      this.analysis()?.summaryText ||
      ''
    );

  }


  getRecommendationTitle(): string {

    return (
      this.analysis()?.recommendationTitle ||
      'Create something new.'
    );

  }


  getRecommendationText(): string {

    return (
      this.analysis()?.recommendationText ||
      ''
    );

  }


  /* =========================================================
     MEDIA
  ========================================================= */

  getMediaImage(
    post: InstagramMedia
  ): string {

    if (
      post.media_type === 'VIDEO'
    ) {

      return (
        post.thumbnail_url ||
        post.media_url ||
        ''
      );

    }


    return (
      post.media_url ||
      ''
    );

  }


  getMediaType(
    post: InstagramMedia
  ): string {

    return (
      post.media_type ||
      'IMAGE'
    );

  }


  trackByMediaId(
    _index: number,
    post: InstagramMedia
  ): string {

    return post.id;

  }


  trackByVisualId(
    _index: number,
    visual: Visual
  ): string {

    return visual.id;

  }


  /* =========================================================
     VANTA VISUAL HELPERS
  ========================================================= */

  getVisualScore(
    visual: Visual
  ): number {

    return (
      visual.generated_score ??
      0
    );

  }


  getVisualImprovement(
    visual: Visual
  ): number {

    return (
      visual.improvement ??
      0
    );

  }


  getVisualVerdict(
    visual: Visual
  ): string {

    if (
      visual.verdict === 'better'
    ) {

      return 'IMPROVED';

    }

    if (
      visual.verdict === 'worse'
    ) {

      return 'WEAKER';

    }

    return 'ANALYZED';

  }


  getLatestVisual():
    Visual | null {

    return (
      this.visuals()[0] ??
      null
    );

  }


  getCurrentScore():
    number {

    return (
      this.getLatestVisual()?.source_score ??
      this.getImpactScore()
    );

  }


  getVantaScore():
    number {

    return (
      this.getLatestVisual()?.generated_score ??
      0
    );

  }


  getVantaImprovement():
    number {

    const visual =
      this.getLatestVisual();


    if (
      visual?.improvement !== null &&
      visual?.improvement !== undefined
    ) {

      return visual.improvement;

    }


    return (
      this.getVantaScore() -
      this.getCurrentScore()
    );

  }


  getVantaImprovementLabel(): string {

    const improvement =
      this.getVantaImprovement();


    if (
      improvement > 0
    ) {

      return `+${improvement} IMPACT`;

    }


    if (
      improvement < 0
    ) {

      return `${improvement} IMPACT`;

    }


    return 'NO CHANGE';

  }


  getVisualMood(
    visual: Visual
  ): string {

    return (
      visual.mood?.slice(0, 2).join(' · ') ||
      'VANTA'
    );

  }


  getDNAValue(
    values: string[] | undefined
  ): string {

    if (
      !values?.length
    ) {

      return '—';

    }

    return values
      .slice(0, 3)
      .join(' · ');

  }

}