
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

interface SavedVisual {
  id: string;
  title?: string;
  name?: string;
  generated_image_url?: string;
  source_image_url?: string;
  created_at?: string;
  aspect_ratio?: string;
  prompt?: string;
  concept?: string;
  [key: string]: unknown;
}

interface CampaignPost {
  id?: string;
  title?: string;
  format?: string;
  caption?: string;
  hashtags?: string[] | string;
  objective?: string;
  creativePrompt?: string;
  negativePrompt?: string;
  visualDirection?: string;
  generatedImage?: string | null;
  generatedImagePath?: string | null;
  generationError?: string;
  status?: string;
  [key: string]: unknown;
}

interface SavedCampaign {
  id: string;
  title?: string;
  brief?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  posts?: CampaignPost[];
  settings?: Record<string, unknown>;
  campaign_dna?: Record<string, unknown>;
  formats?: string[];
  subject_source?: string;
  identity_mode?: string;
  aspect_ratio?: string;
  [key: string]: unknown;
}

interface VisualsResponse {
  success?: boolean;
  visuals?: SavedVisual[];
  message?: string;
}

interface CampaignsResponse {
  success?: boolean;
  campaigns?: SavedCampaign[];
  message?: string;
}

interface CampaignResponse {
  success?: boolean;
  campaign?: SavedCampaign;
  message?: string;
}

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './library.html',
  styleUrl: './library.scss'
})
export class LibraryComponent implements OnInit {
  readonly activeTab = signal<'all' | 'campaigns' | 'visuals'>('all');
  readonly loading = signal(true);
  readonly error = signal('');

  readonly visuals = signal<SavedVisual[]>([]);
  readonly campaigns = signal<SavedCampaign[]>([]);

  readonly selectedVisual = signal<SavedVisual | null>(null);
  readonly selectedCampaign = signal<SavedCampaign | null>(null);

  readonly campaignLoading = signal(false);
  readonly campaignError = signal('');

  readonly selectedPost = signal<CampaignPost | null>(null);

  readonly totalPosts = computed(() =>
    this.campaigns().reduce(
      (total, campaign) => total + (campaign.posts?.length ?? 0),
      0
    )
  );

  readonly readyPosts = computed(() =>
    this.selectedCampaign()?.posts?.filter(
      post => !!post.generatedImage
    ).length ?? 0
  );

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadLibrary();
  }

  private async getHeaders(): Promise<HttpHeaders> {
    const session = await this.authService.getSession();

    if (!session?.access_token) {
      throw new Error('Sessione scaduta. Effettua nuovamente il login.');
    }

    return new HttpHeaders({
      Authorization: `Bearer ${session.access_token}`
    });
  }

  async loadLibrary(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const headers = await this.getHeaders();

      const [visualResponse, campaignResponse] = await Promise.all([
        this.http.get<VisualsResponse>(
          `${environment.apiUrl}/api/visuals`,
          { headers }
        ).toPromise(),

        this.http.get<CampaignsResponse>(
          `${environment.apiUrl}/api/campaign-persistence`,
          { headers }
        ).toPromise()
      ]);

      this.visuals.set(
        Array.isArray(visualResponse?.visuals)
          ? visualResponse.visuals
          : []
      );

      this.campaigns.set(
        Array.isArray(campaignResponse?.campaigns)
          ? campaignResponse.campaigns
          : []
      );
    } catch (error: unknown) {
      console.error('VANTA Library loading error:', error);

      this.error.set(
        error instanceof Error
          ? error.message
          : 'Impossibile caricare la Library.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  setTab(tab: 'all' | 'campaigns' | 'visuals'): void {
    this.activeTab.set(tab);
  }

  async openCampaign(campaign: SavedCampaign): Promise<void> {
    if (this.campaignLoading()) return;

    this.selectedCampaign.set(campaign);
    this.selectedPost.set(null);
    this.campaignError.set('');
    this.campaignLoading.set(true);

    try {
      const headers = await this.getHeaders();

      const response = await this.http.get<CampaignResponse>(
        `${environment.apiUrl}/api/campaign-persistence/${campaign.id}`,
        { headers }
      ).toPromise();

      const fullCampaign = response?.campaign;

      if (!fullCampaign) {
        throw new Error(
          response?.message || 'Impossibile caricare il progetto.'
        );
      }

      this.selectedCampaign.set(fullCampaign);

      this.campaigns.update(items =>
        items.map(item =>
          item.id === fullCampaign.id ? fullCampaign : item
        )
      );
    } catch (error: unknown) {
      console.error('VANTA campaign detail error:', error);

      this.campaignError.set(
        error instanceof Error
          ? error.message
          : 'Errore durante il caricamento del progetto.'
      );
    } finally {
      this.campaignLoading.set(false);
    }
  }

  closeCampaign(): void {
    this.selectedCampaign.set(null);
    this.selectedPost.set(null);
    this.campaignError.set('');
  }

  openPost(post: CampaignPost): void {
    this.selectedPost.set(post);
  }

  closePost(): void {
    this.selectedPost.set(null);
  }

  openVisual(visual: SavedVisual): void {
    this.selectedVisual.set(visual);
  }

  closeVisual(): void {
    this.selectedVisual.set(null);
  }

  campaignTitle(campaign: SavedCampaign): string {
    return campaign.title || 'Untitled campaign';
  }

  visualTitle(visual: SavedVisual): string {
    return visual.title || visual.name || 'VANTA Visual';
  }

  campaignCover(campaign: SavedCampaign): string | null {
    return campaign.posts?.find(post => !!post.generatedImage)
      ?.generatedImage ?? null;
  }

  campaignPostImage(post: CampaignPost): string | null {
    return post.generatedImage || null;
  }

  campaignPalette(): string[] {
    const palette = this.selectedCampaign()?.campaign_dna?.['palette'];

    return Array.isArray(palette)
      ? palette.filter((color): color is string => typeof color === 'string')
      : [];
  }

  campaignConcept(): string {
    const dna = this.selectedCampaign()?.campaign_dna;
    const concept = dna?.['concept'];

    return typeof concept === 'string' ? concept : '';
  }

  campaignSetting(key: string): string {
    const value = this.selectedCampaign()?.settings?.[key];

    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }

    return '';
  }

  postStatus(post: CampaignPost): string {
    return post.status || 'pending';
  }

  trackVisual(index: number, visual: SavedVisual): string {
    return visual.id || String(index);
  }

  trackCampaign(index: number, campaign: SavedCampaign): string {
    return campaign.id || String(index);
  }

  trackPost(index: number, post: CampaignPost): string {
    return post.id || `${post.title || 'post'}-${index}`;
  }
}
