
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';  
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

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class Settings implements OnInit {

  // UI
  loading = false;
  saving = false;
  saved = false;
  error = '';

  activeTab: SettingsTab = 'account';

  // ACCOUNT
  name = 'Riccardo';
  role = 'Creator';
  avatarUrl: string | null = null;

  // INSTAGRAM
  instagram: InstagramSettingsProfile = {
    connected: false,
    username: null,
    name: null,
    avatarUrl: null
  };

  // AI
  creativeDirection: CreativeDirection = 'Balanced';
  openLoop = true;
  preserveDNA = true;

  // APPEARANCE
  theme: VantaTheme = 'dark';

  // PLAN / CREDITS
  plan: VantaPlan = {
    name: 'Creator',
    credits: 0,
    monthlyCredits: 100
  };

  constructor(
    private cdr: ChangeDetectorRef,
    private readonly settingsService: SettingsService,
    private readonly themeService: ThemeService,
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  // INIT

  ngOnInit(): void {
    this.theme = this.themeService.getTheme();
    void this.loadSettings();
  }

  // LOAD SETTINGS

  async loadSettings(): Promise<void> {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.error = '';

    console.log('[Settings] loadSettings START');

    try {
      const response = await this.withTimeout(
        this.settingsService.load(),
        12000,
        'Settings loading timed out. Please try again.'
      );

      console.log('[Settings] settings loaded', response);
      console.log('[Settings] BEFORE applySettings');

      if (response?.settings) {
        this.applySettings(response.settings);
      }

      console.log('[Settings] AFTER applySettings');

      if (response?.plan) {
        this.applyPlan(response.plan);
      }

      console.log('[Settings] AFTER applyPlan');
      if (response?.settings) {
        this.applySettings(response.settings);
      }

      if (response?.plan) {
        this.applyPlan(response.plan);
      }

    } catch (error: unknown) {
      console.error('[Settings] LOAD ERROR', error);

      this.error = this.getErrorMessage(
        error,
        'Unable to load VANTA settings.'
      );

    } finally {
      this.loading = false;
      this.cdr.detectChanges();

      console.log('[Settings] loading FALSE');
    }

    // Load secondary data independently.
    void this.loadInstagram();
    void this.refreshCredits();
  }

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

  // APPLY SETTINGS

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

  // APPLY PLAN

  private applyPlan(plan: VantaPlan): void {
    this.plan = {
      name: plan.name || 'Creator',
      credits: Number(plan.credits ?? 0),
      monthlyCredits: Number(plan.monthlyCredits ?? 100)
    };
  }

  // CREATIVE DIRECTION

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

  // OPEN LOOP

  toggleOpenLoop(): void {
    this.openLoop = !this.openLoop;
    this.markDirty();
  }

  // PROFILE DNA

  togglePreserveDNA(): void {
    this.preserveDNA = !this.preserveDNA;
    this.markDirty();
  }

  // TABS

  setTab(tab: SettingsTab): void {
    this.activeTab = tab;
    this.error = '';
  }

  isTabActive(tab: SettingsTab): boolean {
    return this.activeTab === tab;
  }

  // DIRTY STATE

  private markDirty(): void {
    this.saved = false;
    this.error = '';
  }

  // SAVE SETTINGS

  saveChanges(): void {
    void this.saveSettings();
  }

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
      await this.withTimeout(
        this.settingsService.save(payload),
        12000,
        'Saving settings timed out. Please try again.'
      );

      this.themeService.setTheme(this.theme);
      this.saved = true;

    } catch (error: unknown) {
      console.error('[Settings] SAVE ERROR', error);

      this.error = this.getErrorMessage(
        error,
        'Unable to save your settings.'
      );

    } finally {
      this.saving = false;
    }
  }

  // INSTAGRAM

  async loadInstagram(): Promise<void> {
    try {
      const response = await this.withTimeout(
        this.settingsService.loadInstagram(),
        8000,
        'Instagram request timed out.'
      );

      if (!response) {
        return;
      }

      const profile = response.profile ?? null;

      this.instagram = {
        connected: Boolean(response.connected),
        username: response.username ?? profile?.username ?? null,
        name: response.name ?? profile?.name ?? null,
        avatarUrl: response.avatarUrl ?? profile?.avatarUrl ?? null
      };

      if (!this.avatarUrl && this.instagram.avatarUrl) {
        this.avatarUrl = this.instagram.avatarUrl;
      }

    } catch (error: unknown) {
      console.error('[Settings] Instagram error:', error);
    }
  }

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

  // AVATAR

  changeAvatar(): void {
    if (this.instagram.avatarUrl) {
      this.avatarUrl = this.instagram.avatarUrl;
      this.markDirty();
      return;
    }

    this.error =
      'Connect Instagram to use your Instagram profile image.';
  }

  // THEME

  setTheme(value: VantaTheme): void {
    if (value !== 'dark' && value !== 'light') {
      return;
    }

    this.theme = value;
    this.themeService.setTheme(value);
    this.markDirty();
  }

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

  // CREDITS

  async refreshCredits(): Promise<void> {
    try {
      const session = await this.withTimeout(
        this.authService.getSession(),
        8000,
        'Session request timed out.'
      );

      const accessToken = session?.access_token;

      if (!accessToken) {
        console.warn('[Settings] No session available for credits.');
        return;
      }

      const headers = new HttpHeaders({
        Authorization: `Bearer ${accessToken}`
      });

      const response = await firstValueFrom(
        this.http.get<CreditBalanceResponse>(
          `${environment.apiUrl}/api/billing/balance`,
          { headers }
        ).pipe(
          timeout({ first: 8000 })
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
      console.error('[Settings] Credits error:', error);
      // Credit failures must not block the Settings page.
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

  // PLAN

  get planName(): string {
    return this.plan.name;
  }

  upgradePlan(): void {
    this.error = '';
    void this.router.navigate(['/billing']);
  }

  // INSTAGRAM MANAGEMENT

  manageInstagram(): void {
    void this.router.navigate(['/dashboard']);
  }

  // DELETE WORKSPACE

  deleteWorkspace(): void {
    this.error = 'Workspace deletion is not available yet.';
  }

  // ERROR

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
