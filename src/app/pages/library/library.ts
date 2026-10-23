
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
  generatedImage?: string | null;
  status?: string;
}

interface SavedCampaign {
  id: string;
  title?: string;
  brief?: string;
  status?: string;
  created_at?: string;
  posts?: CampaignPost[];
  settings?: Record<string, unknown>;
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

  readonly totalPosts = computed(() =>
    this.campaigns().reduce(
      (total, campaign) => total + (campaign.posts?.length ?? 0),
      0
    )
  );

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadLibrary();
  }

  async loadLibrary(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const session = await this.authService.getSession();

      if (!session?.access_token) {
        throw new Error('Sessione scaduta. Effettua nuovamente il login.');
      }

      const headers = new HttpHeaders({
        Authorization: `Bearer ${session.access_token}`
      });

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

  openVisual(visual: SavedVisual): void {
    this.selectedVisual.set(visual);
  }

  closeVisual(): void {
    this.selectedVisual.set(null);
  }

  visualTitle(visual: SavedVisual): string {
    return visual.title || visual.name || 'Untitled visual';
  }

  campaignTitle(campaign: SavedCampaign): string {
    return campaign.title ||
      String(campaign.settings?.['campaignName'] ?? 'Untitled campaign');
  }

  campaignCover(campaign: SavedCampaign): string | null {
    return campaign.posts?.find(post =>
      typeof post.generatedImage === 'string' &&
      post.generatedImage.length > 0
    )?.generatedImage ?? null;
  }

  trackVisual(_index: number, visual: SavedVisual): string {
    return visual.id;
  }

  trackCampaign(_index: number, campaign: SavedCampaign): string {
    return campaign.id;
  }
}
