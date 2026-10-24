
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment.prod';

interface CreditBalanceResponse {
  success: boolean;
  balance?: number;
}

interface VantaVisual {
  id: string;
  title?: string | null;
  generated_image_url?: string | null;
  created_at?: string | null;
}

interface VisualsResponse {
  success: boolean;
  visuals?: VantaVisual[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {

  readonly currentYear = new Date().getFullYear();

  readonly loading = signal(true);
  readonly loggingOut = signal(false);

  readonly credits = signal<number | null>(null);
  readonly creditsLoading = signal(true);
  readonly creditsError = signal(false);

  readonly visuals = signal<VantaVisual[]>([]);
  readonly visualsLoading = signal(true);
  readonly visualsError = signal(false);

  constructor(
    private readonly authService: AuthService,
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.loading.set(true);

    try {
      await Promise.all([
        this.loadCredits(),
        this.loadVisuals()
      ]);
    } finally {
      this.loading.set(false);
    }
  }

  private async getAuthHeaders(): Promise<HttpHeaders> {
    const session = await this.authService.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) {
      throw new Error('Sessione non valida. Effettua nuovamente il login.');
    }

    return new HttpHeaders({
      Authorization: `Bearer ${accessToken}`
    });
  }

  async loadCredits(): Promise<void> {
    this.creditsLoading.set(true);
    this.creditsError.set(false);

    try {
      const headers = await this.getAuthHeaders();

      const response = await firstValueFrom(
        this.http.get<CreditBalanceResponse>(
          `${environment.apiUrl}/api/billing/balance`,
          { headers }
        )
      );

      if (
        response.success &&
        typeof response.balance === 'number'
      ) {
        this.credits.set(response.balance);
      } else {
        throw new Error('Risposta saldo non valida.');
      }
    } catch (error) {
      console.error('Errore caricamento crediti:', error);
      this.credits.set(null);
      this.creditsError.set(true);
    } finally {
      this.creditsLoading.set(false);
    }
  }

  async loadVisuals(): Promise<void> {
    this.visualsLoading.set(true);
    this.visualsError.set(false);

    try {
      const headers = await this.getAuthHeaders();

      const response = await firstValueFrom(
        this.http.get<VisualsResponse>(
          `${environment.apiUrl}/api/visuals`,
          { headers }
        )
      );

      if (!response.success || !Array.isArray(response.visuals)) {
        throw new Error('Risposta Library non valida.');
      }

      const recentVisuals = response.visuals
        .filter(
          (visual): visual is VantaVisual & {
            generated_image_url: string;
          } =>
            typeof visual.generated_image_url === 'string' &&
            visual.generated_image_url.trim().length > 0
        )
        .sort((a, b) => {
          const dateA = a.created_at
            ? new Date(a.created_at).getTime()
            : 0;

          const dateB = b.created_at
            ? new Date(b.created_at).getTime()
            : 0;

          return dateB - dateA;
        })
        .slice(0, 6);

      this.visuals.set(recentVisuals);
    } catch (error) {
      console.error('Errore caricamento visual:', error);
      this.visuals.set([]);
      this.visualsError.set(true);
    } finally {
      this.visualsLoading.set(false);
    }
  }

  visualCount(): number {
    return this.visuals().length;
  }

  trackVisual(index: number, visual: VantaVisual): string {
    return visual.id || String(index);
  }

  async refreshDashboard(): Promise<void> {
    await Promise.all([
      this.loadCredits(),
      this.loadVisuals()
    ]);
  }

  async logout(): Promise<void> {
    if (this.loggingOut()) {
      return;
    }

    this.loggingOut.set(true);

    try {
      await this.authService.signOut();
      await this.router.navigate(['/auth']);
    } catch (error) {
      console.error('Errore durante il logout:', error);
    } finally {
      this.loggingOut.set(false);
    }
  }
}
