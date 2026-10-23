
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import {
  InstagramService,
  InstagramProfile
} from '../../core/instagram.service';

import { environment } from '../../../environments/environment.prod';

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

  // =====================================================
  // FEATURE FLAGS
  // Riattivare Instagram impostando il valore a true.
  // =====================================================

  readonly instagramIntegrationEnabled = false;

  // =====================================================
  // LOCAL STATE
  // =====================================================

  readonly loading = signal(true);
  readonly loggingOut = signal(false);

  // =====================================================
  // PROFILE DNA
  // =====================================================

  readonly dna = signal<any>(null);

  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    public readonly instagramService: InstagramService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  // =====================================================
  // INIT
  // Non avvia chiamate Instagram durante il lancio.
  // =====================================================

  async ngOnInit(): Promise<void> {
    this.loading.set(true);

    try {
      if (this.instagramIntegrationEnabled) {
        await this.instagramService.load();

        if (this.instagramService.connected()) {
          await this.loadDNA();
        }
      }
    } catch (error) {
      console.error('Dashboard initialization error:', error);
    } finally {
      this.loading.set(false);
    }
  }

  // =====================================================
  // INSTAGRAM CONNECTION - PRESERVED
  // =====================================================

  async connectInstagram(): Promise<void> {
    if (!this.instagramIntegrationEnabled) return;

    await this.instagramService.connect();
  }

  // =====================================================
  // REFRESH INSTAGRAM - PRESERVED
  // =====================================================

  async refreshInstagram(): Promise<void> {
    if (!this.instagramIntegrationEnabled) return;

    try {
      await this.instagramService.refresh();

      if (this.instagramService.connected()) {
        await this.loadDNA();
      }
    } catch (error) {
      console.error('Instagram refresh error:', error);
    }
  }

  // =====================================================
  // LOAD PROFILE DNA - PRESERVED
  // =====================================================

  async loadDNA(): Promise<void> {
    if (!this.instagramIntegrationEnabled) return;

    try {
      const session = await this.authService.getSession();

      if (!session) {
        this.dna.set(null);
        return;
      }

      const response = await fetch(
        `${environment.apiUrl}/api/instagram/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`DNA request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data?.success) {
        this.dna.set(data.dna ?? null);
      } else {
        this.dna.set(null);
      }
    } catch (error) {
      console.error('Profile DNA error:', error);
      this.dna.set(null);
    }
  }

  // =====================================================
  // INSTAGRAM COMPATIBILITY HELPERS - PRESERVED
  // =====================================================

  connected(): boolean {
    return this.instagramIntegrationEnabled &&
      this.instagramService.connected();
  }

  profile(): InstagramProfile | null {
    return this.instagramIntegrationEnabled
      ? this.instagramService.profile()
      : null;
  }

  connecting(): boolean {
    return this.instagramIntegrationEnabled &&
      this.instagramService.connecting();
  }

  error(): string {
    return this.instagramIntegrationEnabled
      ? this.instagramService.error()
      : '';
  }

  getUsername(): string {
    return this.instagramService.getUsername();
  }

  getProfileName(): string {
    return this.instagramService.getName();
  }

  getProfileImage(): string {
    return this.instagramService.getAvatar();
  }

  // =====================================================
  // DNA HELPERS - PRESERVED
  // =====================================================

  getMood(): string {
    const mood = this.dna()?.mood;

    if (Array.isArray(mood) && mood.length) {
      return mood.slice(0, 2).join(' · ');
    }

    return '—';
  }

  getStyle(): string {
    const style = this.dna()?.visualStyle;

    if (Array.isArray(style) && style.length) {
      return style.slice(0, 2).join(' · ');
    }

    return '—';
  }

  getPalette(): string[] {
    const palette = this.dna()?.palette;
    return Array.isArray(palette) ? palette : [];
  }

  getImpactScore(): number | string {
    const score = this.dna()?.impactScore;
    return typeof score === 'number' ? score : '—';
  }

  // =====================================================
  // NAVIGATION
  // =====================================================

  goToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

  goToCreate(): void {
    void this.router.navigate(['/create']);
  }

  goToProfile(): void {
    void this.router.navigate(['/profile']);
  }

  goToFeed(): void {
    void this.router.navigate(['/feed']);
  }

  goToSettings(): void {
    void this.router.navigate(['/settings']);
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  async logout(): Promise<void> {
    if (this.loggingOut()) return;

    this.loggingOut.set(true);

    try {
      await this.authService.signOut();

      // Reset Instagram state only when the integration is enabled.
      if (this.instagramIntegrationEnabled) {
        this.instagramService.disconnect();
      }

      this.dna.set(null);

      await this.router.navigate(['/auth']);
    } catch (error) {
      console.error('Logout error:', error);
      this.loggingOut.set(false);
    }
  }
}
