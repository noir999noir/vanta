import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';

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
  | 'security'
  | 'ai'
  | 'appearance'
  | 'plan';

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
  success = '';

  activeTab: SettingsTab = 'account';

  // ACCOUNT
  name = 'Riccardo';
  role = 'Creator';

  // SECURITY
  newPassword = '';
  confirmPassword = '';

  passwordLoading = false;
  passwordError = '';
  passwordSuccess = '';

  // AI PREFERENCES
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
    private readonly cdr: ChangeDetectorRef,
    private readonly settingsService: SettingsService,
    private readonly themeService: ThemeService,
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  // INIT

  ngOnInit(): void {
    this.theme = this.themeService.getTheme();

    // La pagina viene mostrata subito.
    this.loading = false;

    // Le impostazioni vengono caricate in background.
    void this.loadSettings();
  }

  // ACCOUNT EMAIL

  get accountEmail(): string {
    return this.authService.user()?.email ?? '';
  }

  // LOAD SETTINGS

  async loadSettings(): Promise<void> {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    try {
      const response = await this.withTimeout(
        this.settingsService.load(),
        12000
      );

      if (response?.settings) {
        this.applySettings(response.settings);
      }

      if (response?.plan) {
        this.applyPlan(response.plan);
      }

    } catch (error: unknown) {
      console.error('[Settings] Load error:', error);

      this.error = this.getErrorMessage(
        error,
        'Unable to load your settings.'
      );

    } finally {
      this.loading = false;
      this.cdr.detectChanges();

      console.log('[Settings] Loading finished');
    }

    // I crediti non devono bloccare la pagina.
    void this.refreshCredits();
  }

  // TIMEOUT

  private withTimeout<T>(
    promise: Promise<T>,
    milliseconds: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error('Settings loading timed out. Please try again.')
        );
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

  // SAVE SETTINGS

  async saveSettings(): Promise<void> {
  if (this.saving) {
    return;
  }

  this.saving = true;
  this.saved = false;
  this.error = '';
  this.success = '';

  this.cdr.detectChanges();

  const payload: VantaSettings = {
    name: this.name.trim() || 'Riccardo',
    role: this.role.trim() || 'Creator',
    creativeDirection: this.creativeDirection,
    openLoop: this.openLoop,
    preserveDNA: this.preserveDNA,
    theme: this.theme
  };

  try {
    await this.withTimeout(
      this.settingsService.save(payload),
      15000
    );

    this.themeService.setTheme(this.theme);

    this.saved = true;
    this.success = 'Settings saved successfully.';

  } catch (error: unknown) {
    console.error('[Settings] Save error:', error);

    this.error = this.getErrorMessage(
      error,
      'Unable to save your settings. Please try again.'
    );

  } finally {
    this.saving = false;
    this.cdr.detectChanges();

    console.log('[Settings] Saving finished:', this.saving);
  }
}

  // DIRTY STATE

  markDirty(): void {
    this.saved = false;
    this.success = '';
    this.error = '';
  }

  // TABS

  setTab(tab: SettingsTab): void {
    this.activeTab = tab;
    this.error = '';
    this.success = '';
  }

  // CREATIVE DIRECTION

  private normalizeCreativeDirection(
    value: string | null | undefined
  ): CreativeDirection {
    if (
      value === 'Safe' ||
      value === 'Experimental'
    ) {
      return value;
    }

    return 'Balanced';
  }

  setCreativeDirection(value: CreativeDirection): void {
    this.creativeDirection = value;
    this.markDirty();
  }

  // AI TOGGLES

  toggleOpenLoop(): void {
    this.openLoop = !this.openLoop;
    this.markDirty();
  }

  togglePreserveDNA(): void {
    this.preserveDNA = !this.preserveDNA;
    this.markDirty();
  }

  // THEME

  setTheme(value: VantaTheme): void {
    if (value !== 'dark' && value !== 'light') {
      return;
    }

    this.theme = value;

    // Applica subito il tema.
    this.themeService.setTheme(value);

    // Il salvataggio persistente avviene con Save changes.
    this.markDirty();
  }

  get isDarkTheme(): boolean {
    return this.theme === 'dark';
  }

  get isLightTheme(): boolean {
    return this.theme === 'light';
  }

  get themeLabel(): string {
    return this.theme === 'light' ? 'Light' : 'Dark';
  }

  // CHANGE PASSWORD

  async changePassword(): Promise<void> {
    this.passwordError = '';
    this.passwordSuccess = '';

    if (this.passwordLoading) {
      return;
    }

    if (!this.newPassword || !this.confirmPassword) {
      this.passwordError = 'Complete both password fields.';
      return;
    }

    if (this.newPassword.length < 8) {
      this.passwordError =
        'Your password must contain at least 8 characters.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Passwords do not match.';
      return;
    }

    this.passwordLoading = true;

    try {
      await this.authService.updatePassword(this.newPassword);

      this.newPassword = '';
      this.confirmPassword = '';

      this.passwordSuccess = 'Password updated successfully.';

    } catch (error: unknown) {
      console.error('[Settings] Password update error:', error);

      this.passwordError = this.getErrorMessage(
        error,
        'Unable to update your password. Please try again.'
      );

    } finally {
      this.passwordLoading = false;
      this.cdr.detectChanges();
    }
  }

  // REFRESH CREDITS

  async refreshCredits(): Promise<void> {
    try {
      const session = await this.authService.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        return;
      }

      const headers = new HttpHeaders({
        Authorization: `Bearer ${accessToken}`
      });

      const response = await firstValueFrom(
        this.http
          .get<CreditBalanceResponse>(
            `${environment.apiUrl}/api/billing/balance`,
            { headers }
          )
          .pipe(timeout({ first: 8000 }))
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

        this.cdr.detectChanges();
      }

    } catch (error: unknown) {
      console.error('[Settings] Credits error:', error);
    }
  }

  // PLAN GETTERS

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

  get planName(): string {
    return this.plan.name;
  }

  // ERROR MESSAGE

  private getErrorMessage(
    error: unknown,
    fallback: string
  ): string {
    return this.settingsService.getErrorMessage(error, fallback);
  }
}