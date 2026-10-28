
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
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

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  description: string;
}

interface CheckoutResponse {
  success: boolean;
  checkoutUrl: string;
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
  subscriptionLoading: string | null = null;

  errorMessage = '';
  successMessage = '';

  packages: BillingPackage[] = [
    {
      id: 'mini',
      name: 'Mini',
      price: 4.99,
      credits: 25,
      description: '5 generazioni per continuare a creare.',
    },
    {
      id: 'creator-pack',
      name: 'Creator Pack',
      price: 12.99,
      credits: 70,
      description: '14 generazioni per dare spazio alla creatività.',
    },
    {
      id: 'pro-pack',
      name: 'Pro Pack',
      price: 29.99,
      credits: 180,
      description: '36 generazioni per una produzione costante.',
    },
    {
      id: 'studio-pack',
      name: 'Studio Pack',
      price: 59.99,
      credits: 400,
      description: '80 generazioni per i tuoi progetti più intensi.',
    },
  ];


  subscriptionPlans: SubscriptionPlan[] = [
    {
      id: 'creator',
      name: 'Creator',
      price: 14.99,
      credits: 80,
      description: 'Per creare con continuità.',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 29.99,
      credits: 200,
      description: 'Per una produzione creativa costante.',
    },
    {
      id: 'studio',
      name: 'Studio',
      price: 59.99,
      credits: 500,
      description: 'Per progetti e campagne più intensi.',
    },
    {
      id: 'agency',
      name: 'Agency',
      price: 129.99,
      credits: 1200,
      description: 'Per un flusso creativo ad alto volume.',
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

      const result = await firstValueFrom(
        this.http.get<CreditBalance & { success: boolean }>(
          `${environment.apiUrl}/api/billing/balance`,
          { headers },
        ),
      );

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
    if (this.checkoutLoading || this.subscriptionLoading) return;

    this.checkoutLoading = pkg.id;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const headers = await this.authHeaders();

      if (!headers) {
        this.errorMessage = 'Accedi prima di acquistare i crediti.';
        return;
      }

      const result = await firstValueFrom(
        this.http.post<CheckoutResponse>(
          `${environment.apiUrl}/api/billing/checkout`,
          { packageId: pkg.id },
          { headers },
        ),
      );

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

  async buySubscription(plan: SubscriptionPlan): Promise<void> {
    if (this.checkoutLoading || this.subscriptionLoading) return;

    this.subscriptionLoading = plan.id;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const headers = await this.authHeaders();

      if (!headers) {
        this.errorMessage =
          'Accedi prima di sottoscrivere un piano.';
        return;
      }

      const result = await firstValueFrom(
        this.http.post<CheckoutResponse>(
          `${environment.apiUrl}/api/billing/subscription-checkout`,
          { planId: plan.id },
          { headers },
        ),
      );

      if (!result?.success || !result.checkoutUrl) {
        throw new Error('Subscription checkout URL missing');
      }

      window.location.assign(result.checkoutUrl);
    } catch (error) {
      console.error('Subscription checkout failed:', error);
      this.errorMessage =
        'Non è stato possibile avviare l’abbonamento. Riprova.';
    } finally {
      this.subscriptionLoading = null;
      this.cdr.detectChanges();
    }
  }

  private handleCheckoutReturn(): void {
    const params = new URLSearchParams(window.location.search);

    if (params.get('subscription_success') === 'true') {
      this.successMessage =
        'Pagamento ricevuto. Stiamo verificando l’abbonamento e i crediti.';

      this.cleanCheckoutQuery();
      return;
    }

    if (params.get('success') === 'true') {
      this.successMessage =
        'Pagamento ricevuto. Verifico l’accredito dei crediti...';

      this.cleanCheckoutQuery();
      void this.waitForBalanceUpdate();
      return;
    }

    if (params.get('canceled') === 'true') {
      this.errorMessage =
        'Checkout annullato. Controlla Stripe per verificare eventuali addebiti.';

      this.cleanCheckoutQuery();
    }
  }

  private cleanCheckoutQuery(): void {
    window.history.replaceState(
      {},
      '',
      window.location.pathname,
    );

    this.cdr.detectChanges();
  }

  private async waitForBalanceUpdate(): Promise<void> {
    for (let attempt = 0; attempt < 15; attempt++) {
      await this.loadBalance();

      // The existing balance alone cannot prove that this specific
      // purchase was credited. Do not claim a confirmed purchase here.
      if (attempt < 14) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    this.successMessage =
      'Checkout completato. Se i crediti non sono aggiornati, attendi qualche secondo e ricarica il saldo.';

    this.cdr.detectChanges();
  }
}
