import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  SettingsService,
  VantaSettings,
  VantaPlan,
  CreativeDirection,
  VantaTheme
} from '../../core/settings.service';

import { ThemeService } from '../../core/theme.service';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

// =====================================================
// TYPES
// =====================================================

type SettingsTab =
  | 'account'
  | 'instagram'
  | 'ai'
  | 'appearance'
  | 'plan';

interface InstagramSettingsProfile {
  connected: boolean;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
}

interface CreditBalanceResponse {
  success: boolean;
  balance: number;
}

// =====================================================
// COMPONENT
// =====================================================

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class Settings implements OnInit {

  // ===================================================
  // UI
  // ===================================================

  loading = false;
  saving = false;
  saved = false;
  error = '';

  activeTab: SettingsTab = 'account';

  // ===================================================
  // ACCOUNT
  // ===================================================

  name = 'Riccardo';
  role = 'Creator';
  avatarUrl: string | null = null;

  // ===================================================
  // INSTAGRAM
  // ===================================================

  instagram: InstagramSettingsProfile = {
    connected: false,
    username: null,
    name: null,
    avatarUrl: null
  };

  // ===================================================
  // AI
  // ===================================================

  creativeDirection: CreativeDirection = 'Balanced';
  openLoop = true;
  preserveDNA = true;

  // ===================================================
  // APPEARANCE
  // ===================================================

  theme: VantaTheme = 'dark';

  // ===================================================
  // PLAN / CREDITS
  // ===================================================

  plan: VantaPlan = {
    name: 'Creator',
    credits: 0,
    monthlyCredits: 100
  };

  // ===================================================
  // CONSTRUCTOR
  // ===================================================

  constructor(
    private readonly settingsService: SettingsService,
    private readonly themeService: ThemeService,
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  // ===================================================
  // INIT
  // ===================================================

  ngOnInit(): void {
    this.theme = this.themeService.getTheme();
    void this.loadSettings();
  }

  // ===================================================
  // LOAD SETTINGS
  // ===================================================

  async loadSettings(): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      const response = await this.settingsService.load();

      if (response?.settings) {
        this.applySettings(response.settings);
      }

      if (response?.plan) {
        this.applyPlan(response.plan);
      }

      await this.loadInstagram();
      await this.refreshCredits();

    } catch (error: unknown) {
      console.error('VANTA settings load error:', error);

      this.error = this.getErrorMessage(
        error,
        'Unable to load VANTA settings.'
      );

    } finally {
      this.loading = false;
    }
  }

  // ===================================================
  // APPLY SETTINGS
  // ===================================================

  private applySettings(settings: VantaSettings): void {
    this.name = settings.name || 'Riccardo';
    this.role = settings.role || 'Creator';

    this.creativeDirection =
      this.normalizeCreativeDirection(
        settings.creativeDirection
      );

    this.openLoop = settings.openLoop ?? true;
    this.preserveDNA = settings.preserveDNA ?? true;

    this.theme = settings.theme === 'light'
      ? 'light'
      : 'dark';

    this.avatarUrl = settings.avatarUrl || null;

    if (!this.avatarUrl && this.instagram.avatarUrl) {
      this.avatarUrl = this.instagram.avatarUrl;
    }

    this.themeService.setTheme(this.theme);
  }

  // ===================================================
  // APPLY PLAN
  // ===================================================

  private applyPlan(plan: VantaPlan): void {
    this.plan = {
      name: plan.name || 'Creator',
      credits: Number(plan.credits ?? 0),
      monthlyCredits: Number(plan.monthlyCredits ?? 100)
    };
  }

  // ===================================================
  // CREATIVE DIRECTION
  // ===================================================

  private normalizeCreativeDirection(
    value: string | null | undefined
  ): CreativeDirection {
    switch (value) {
      case 'Safe':
        return 'Safe';

      case 'Experimental':
        return 'Experimental';

      case 'Balanced':
      default:
        return 'Balanced';
    }
  }

  setCreativeDirection(value: CreativeDirection): void {
    this.creativeDirection = value;
    this.markDirty();
  }

  // ===================================================
  // OPEN LOOP
  // ===================================================

  toggleOpenLoop(): void {
    this.openLoop = !this.openLoop;
    this.markDirty();
  }

  // ===================================================
  // PROFILE DNA
  // ===================================================

  togglePreserveDNA(): void {
    this.preserveDNA = !this.preserveDNA;
    this.markDirty();
  }

  // ===================================================
  // TABS
  // ===================================================

  setTab(tab: SettingsTab): void {
    this.activeTab = tab;
    this.error = '';
  }

  isTabActive(tab: SettingsTab): boolean {
    return this.activeTab === tab;
  }

  // ===================================================
  // DIRTY STATE
  // ===================================================

  private markDirty(): void {
    this.saved = false;
    this.error = '';
  }

  // ===================================================
  // SAVE BUTTON
  // ===================================================

  saveChanges(): void {
    void this.saveSettings();
  }

  // ===================================================
  // SAVE SETTINGS
  // ===================================================

  async saveSettings(): Promise<void> {
    if (this.saving) {
      return;
    }

    this.saving = true;
    this.saved = false;
    this.error = '';

    const payload: VantaSettings = {
      name: this.name.trim() || 'Riccardo',
      role: this.role.trim() || 'Creator',
      creativeDirection: this.creativeDirection,
      openLoop: Boolean(this.openLoop),
      preserveDNA: Boolean(this.preserveDNA),
      theme: this.theme,
      avatarUrl: this.avatarUrl || null
    };

    try {
      await this.settingsService.save(payload);

      // Applica il tema senza ricaricare la pagina.
      this.themeService.setTheme(this.theme);

      this.saved = true;

    } catch (error: unknown) {
      console.error('VANTA settings save error:', error);

      this.error = this.getErrorMessage(
        error,
        'Unable to save your settings.'
      );

    } finally {
      this.saving = false;
    }
  }

  // ===================================================
  // INSTAGRAM
  // ===================================================

  async loadInstagram(): Promise<void> {
    try {
      const response =
        await this.settingsService.loadInstagram();

      if (!response) {
        return;
      }

      const profile = response.profile ?? null;

      this.instagram = {
        connected: Boolean(response.connected),
        username:
          response.username ?? profile?.username ?? null,
        name:
          response.name ?? profile?.name ?? null,
        avatarUrl:
          response.avatarUrl ?? profile?.avatarUrl ?? null
      };

      if (!this.avatarUrl && this.instagram.avatarUrl) {
        this.avatarUrl = this.instagram.avatarUrl;
      }

    } catch (error: unknown) {
      console.error('Instagram settings error:', error);
    }
  }

  // ===================================================
  // INSTAGRAM TEMPLATE HELPERS
  // ===================================================

  get instagramConnected(): boolean {
    return this.instagram.connected;
  }

  get instagramUsername(): string {
    return this.instagram.username || '';
  }

  get instagramStatus(): string {
    return this.instagram.connected
      ? 'Connected'
      : 'Not connected';
  }

  // ===================================================
  // AVATAR
  // ===================================================

  changeAvatar(): void {
    if (this.instagram.avatarUrl) {
      this.avatarUrl = this.instagram.avatarUrl;
      this.markDirty();
      return;
    }

    this.error =
      'Connect Instagram to use your Instagram profile image.';
  }

  // ===================================================
  // THEME
  // ===================================================

  setTheme(value: VantaTheme): void {
    if (value !== 'dark' && value !== 'light') {
      return;
    }

    this.theme = value;
    this.themeService.setTheme(value);
    this.markDirty();
  }

  // ===================================================
  // THEME HELPERS
  // ===================================================

  get isDarkTheme(): boolean {
    return this.theme === 'dark';
  }

  get isLightTheme(): boolean {
    return this.theme === 'light';
  }

  get themeLabel(): string {
    return this.theme === 'light'
      ? 'VANTA Light'
      : 'VANTA Dark';
  }

  // ===================================================
  // CREDITS
  // ===================================================

  async refreshCredits(): Promise<void> {
    try {
      const session = await this.authService.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        this.error = 'Sign in to view your available credits.';
        return;
      }

      const headers = new HttpHeaders({
        Authorization: `Bearer ${accessToken}`
      });

      const response = await firstValueFrom(
        this.http.get<CreditBalanceResponse>(
          `${environment.apiUrl}/api/billing/balance`,
          { headers }
        )
      );

      if (
        response?.success &&
        typeof response.balance === 'number' &&
        Number.isFinite(response.balance)
      ) {
        this.plan = {
          ...this.plan,
          credits: response.balance
        };
      } else {
        throw new Error('Invalid credit balance response.');
      }

    } catch (error: unknown) {
      console.error('VANTA credits refresh error:', error);
      this.error = 'Unable to load your available credits.';
    }
  }

  get credits(): number {
    return this.plan.credits;
  }

  get monthlyCredits(): number {
    return this.plan.monthlyCredits;
  }

  get creditPercentage(): number {
    if (this.plan.monthlyCredits <= 0) {
      return 0;
    }

    const percentage =
      (this.plan.credits / this.plan.monthlyCredits) * 100;

    return Math.max(
      0,
      Math.min(100, Math.round(percentage))
    );
  }

  // ===================================================
  // PLAN
  // ===================================================

  get planName(): string {
    return this.plan.name;
  }

  upgradePlan(): void {
    this.error = '';
    void this.router.navigate(['/billing']);
  }

  // ===================================================
  // INSTAGRAM MANAGEMENT
  // ===================================================

  manageInstagram(): void {
    void this.router.navigate(['/dashboard']);
  }

  // ===================================================
  // DELETE WORKSPACE
  // ===================================================

  deleteWorkspace(): void {
    // L'eliminazione non è disponibile finché
    // il relativo endpoint backend non è implementato.
    this.error = 'Workspace deletion is not available yet.';
  }

  // ===================================================
  // ERROR
  // ===================================================

  private getErrorMessage(
    error: unknown,
    fallback: string
  ): string {
    return this.settingsService.getErrorMessage(
      error,
      fallback
    );
  }
}