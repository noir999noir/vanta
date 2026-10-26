import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export type ImageJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ImageJobSourceType = 'create' | 'campaign';

export type ImageSubjectSource = 'photo' | 'product' | 'invent';

export type ImageIdentityMode = 'preserve' | 'reinterpret';

export interface ImageGenerationJob {
  id: string;
  status: ImageJobStatus;
  creation_id: string;
  source_type: ImageJobSourceType;
  campaign_id: string | null;
  post_id: string | null;
  generatedImage: string | null;
  generated_image_path?: string | null;
  model: string | null;
  error_message: string | null;
  credits_charged: number;
  refund_status: string | null;
  attempts: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface CreateImageJobPayload {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;

  sourceImage?: string;
  sourceImages?: string[];

  subjectSource: ImageSubjectSource;
  identityMode: ImageIdentityMode;

  sourceType: ImageJobSourceType;

  campaignId?: string;
  postId?: string;

  idempotencyKey?: string;
}

export interface CreateImageJobResponse {
  success: boolean;
  jobId: string;
  status: ImageJobStatus;
  creationId: string;
  creditsCharged?: number;
  balance?: number;
  message?: string;
}

export interface ImageJobResponse {
  success: boolean;
  job?: ImageGenerationJob;
  message?: string;
}

export interface ImageJobsResponse {
  success: boolean;
  jobs: ImageGenerationJob[];
  message?: string;
}

export interface CancelImageJobResponse {
  success: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageGenerationJobsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly baseUrl =
    `${environment.apiUrl}/api/image/jobs`;

  private async getHeaders(): Promise<HttpHeaders> {
    const session = await this.authService.getSession();

    if (!session?.access_token) {
      throw new Error(
        'Sessione scaduta. Effettua nuovamente il login.'
      );
    }

    return new HttpHeaders({
      Authorization: `Bearer ${session.access_token}`
    });
  }

  async createJob(
    payload: CreateImageJobPayload
  ): Promise<CreateImageJobResponse> {
    const idempotencyKey =
      payload.idempotencyKey ??
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const response = await firstValueFrom(
      this.http.post<CreateImageJobResponse>(
        this.baseUrl,
        {
          ...payload,
          idempotencyKey
        },
        {
          headers: await this.getHeaders()
        }
      )
    );

    if (!response.success || !response.jobId) {
      throw new Error(
        response.message ??
        'Il server non ha restituito un ID di generazione valido.'
      );
    }

    return response;
  }

  async getJob(
    jobId: string
  ): Promise<ImageGenerationJob> {
    if (!jobId.trim()) {
      throw new Error('ID del job mancante.');
    }

    const response = await firstValueFrom(
      this.http.get<ImageJobResponse>(
        `${this.baseUrl}/${encodeURIComponent(jobId)}`,
        {
          headers: await this.getHeaders()
        }
      )
    );

    if (!response.success || !response.job) {
      throw new Error(
        response.message ??
        'Impossibile recuperare lo stato della generazione.'
      );
    }

    return response.job;
  }

  async listJobs(
    limit = 50
  ): Promise<ImageGenerationJob[]> {
    const params = new HttpParams().set(
      'limit',
      String(Math.max(1, Math.min(100, limit)))
    );

    const response = await firstValueFrom(
      this.http.get<ImageJobsResponse>(
        this.baseUrl,
        {
          headers: await this.getHeaders(),
          params
        }
      )
    );

    if (!response.success) {
      throw new Error(
        response.message ??
        'Impossibile recuperare le generazioni.'
      );
    }

    return Array.isArray(response.jobs)
      ? response.jobs
      : [];
  }

  async cancelJob(jobId: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<CancelImageJobResponse>(
        `${this.baseUrl}/${encodeURIComponent(jobId)}/cancel`,
        {},
        {
          headers: await this.getHeaders()
        }
      )
    );

    if (!response.success) {
      throw new Error(
        response.message ??
        'Impossibile annullare la generazione.'
      );
    }
  }

  async waitForResult(
    jobId: string,
    onUpdate?: (job: ImageGenerationJob) => void,
    intervalMs = 2500,
    timeoutMs = 15 * 60 * 1000
  ): Promise<ImageGenerationJob> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const job = await this.getJob(jobId);

      onUpdate?.(job);

      if (
        job.status === 'completed' ||
        job.status === 'failed' ||
        job.status === 'cancelled'
      ) {
        return job;
      }

      await new Promise<void>(resolve => {
        setTimeout(resolve, intervalMs);
      });
    }

    throw new Error(
      'La generazione è ancora in corso. Riapri la campagna per verificarne lo stato.'
    );
  }
}