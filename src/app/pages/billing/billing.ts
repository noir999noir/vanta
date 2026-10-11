
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';

interface CreditBalance {
  userId: string;
  balance: number;
}

interface BillingPackage {
  id: string;
  name: string;
  price: number;
  credits: number;
  description: string;
}

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './billing.html',
  styleUrl: './billing.scss',
})
export class BillingComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  balance = 0;
  loadingBalance = true;
  checkoutLoading: string | null = null;
  errorMessage = '';
  successMessage = '';

  packages: BillingPackage[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 5,
      credits: 100,
      description: 'Per iniziare a creare.',
    },
    {
      id: 'creator',
      name: 'Creator',
      price: 12,
      credits: 300,
      description: 'Per dare spazio alla creatività.',
    },
  ];

  ngOnInit(): void {
    this.handleCheckoutReturn();
    void this.loadBalance();
  }

  private async getAccessToken(): Promise<string | null> {
    try {
      const session = await this.authService.getSession();
      return session?.access_token ?? null;
    } catch {
      return null;
    }
  }

  private async authHeaders(): Promise<HttpHeaders | null> {
    const token = await this.getAccessToken();

    return token
      ? new HttpHeaders({
          Authorization: `Bearer ${token}`,
        })
      : null;
  }

  async loadBalance(): Promise<void> {
    this.loadingBalance = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const headers = await this.authHeaders();

      if (!headers) {
        this.errorMessage = 'Accedi per visualizzare i tuoi crediti.';
        return;
      }

      const result = await this.http
        .get<CreditBalance & { success: boolean }>(
          `${environment.apiUrl}/api/billing/balance`,
          { headers },
        )
        .toPromise();

      if (
        result?.success &&
        typeof result.balance === 'number' &&
        Number.isFinite(result.balance)
      ) {
        this.balance = result.balance;
      } else {
        throw new Error('Invalid balance response');
      }
    } catch (error) {
      console.error('Billing balance loading failed:', error);
      this.errorMessage = 'Impossibile caricare il saldo. Riprova.';
    } finally {
      this.loadingBalance = false;
      this.cdr.detectChanges();
    }
  }

  async buyPackage(pkg: BillingPackage): Promise<void> {
    if (this.checkoutLoading) return;

    this.checkoutLoading = pkg.id;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const headers = await this.authHeaders();

      if (!headers) {
        this.errorMessage = 'Accedi prima di acquistare i crediti.';
        return;
      }

      const result = await this.http
        .post<{ success: boolean; checkoutUrl: string }>(
          `${environment.apiUrl}/api/billing/checkout`,
          { packageId: pkg.id },
          { headers },
        )
        .toPromise();

      if (!result?.success || !result.checkoutUrl) {
        throw new Error('Checkout URL missing');
      }

      window.location.assign(result.checkoutUrl);
    } catch (error) {
      console.error('Stripe checkout failed:', error);
      this.errorMessage =
        'Non è stato possibile avviare il pagamento.';
    } finally {
      this.checkoutLoading = null;
      this.cdr.detectChanges();
    }
  }

  private handleCheckoutReturn(): void {
    const params = new URLSearchParams(window.location.search);

    if (params.get('success') === 'true') {
      this.successMessage =
        'Pagamento ricevuto. Verifico l’accredito dei crediti...';

      window.history.replaceState(
        {},
        '',
        window.location.pathname,
      );

      void this.waitForBalanceUpdate();
      return;
    }

    if (params.get('canceled') === 'true') {
      this.errorMessage =
        'Pagamento annullato. Non è stato effettuato alcun addebito.';

      window.history.replaceState(
        {},
        '',
        window.location.pathname,
      );

      this.cdr.detectChanges();
    }
  }

  private async waitForBalanceUpdate(): Promise<void> {
    // Il webhook potrebbe impiegare alcuni secondi.
    for (let attempt = 0; attempt < 15; attempt++) {
      await this.loadBalance();

      // Non assumiamo che un saldo maggiore di zero dimostri
      // che il nuovo acquisto sia stato accreditato.
      // Verifichiamo il saldo soltanto come aggiornamento UI.
      if (this.balance > 0) {
        this.successMessage =
          'Saldo caricato correttamente. I tuoi crediti sono disponibili!';
        this.cdr.detectChanges();
        return;
      }

      if (attempt < 14) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    this.successMessage =
      'Pagamento ricevuto. L’accredito è ancora in elaborazione: aggiorna il saldo tra poco.';

    this.cdr.detectChanges();
  }
}
