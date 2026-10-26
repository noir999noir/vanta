import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPassword implements OnInit {

  password = '';
  confirmPassword = '';

  loading = signal(false);
  checkingSession = signal(true);
  validSession = signal(false);
  error = signal('');
  success = signal('');

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const session = await this.authService.getSession();

      this.validSession.set(!!session);
    } catch (error) {
      console.error('VANTA password recovery error:', error);
      this.validSession.set(false);
    } finally {
      this.checkingSession.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.error.set('');
    this.success.set('');

    if (!this.validSession()) {
      this.error.set(
        'Sessione di recupero non valida o scaduta. Richiedi un nuovo link.'
      );
      return;
    }

    if (this.password.length < 6) {
      this.error.set(
        'La password deve contenere almeno 6 caratteri.'
      );
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error.set('Le password non coincidono.');
      return;
    }

    this.loading.set(true);

    try {
      await this.authService.updatePassword(this.password);

      this.password = '';
      this.confirmPassword = '';

      this.success.set(
        'Password aggiornata correttamente. Ora puoi accedere a VANTA.'
      );

      this.validSession.set(false);
    } catch (error: any) {
      console.error('VANTA password update error:', error);

      const message = String(error?.message ?? '').toLowerCase();

      if (
        message.includes('expired') ||
        message.includes('invalid') ||
        message.includes('session')
      ) {
        this.error.set(
          'Il link è scaduto o non è più valido. Richiedi un nuovo link di recupero.'
        );
      } else {
        this.error.set(
          error?.message || 'Impossibile aggiornare la password. Riprova.'
        );
      }
    } finally {
      this.loading.set(false);
    }
  }

  async backToLogin(): Promise<void> {
    await this.router.navigate(['/auth']);
  }
}