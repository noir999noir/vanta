
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

type SubjectSource = 'photo' | 'product' | 'invent';
type IdentityMode = 'preserve' | 'reinterpret';
type PostStatus = 'pending' | 'generating' | 'ready' | 'error';
type CampaignFormat = 'Reel' | 'Post' | 'Carousel';

interface SubjectReference {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  size: number;
}

interface CampaignPost {
  id: string;
  title: string;
  format: string;
  objective: string;
  visualDirection: string;
  creativePrompt: string;
  negativePrompt: string;
  caption: string;
  hashtags: string[];
  generatedImage: string | null;
  status: PostStatus;
  generationError: string;
}

interface CampaignPostPayload {
  index?: unknown;
  title?: unknown;
  role?: unknown;
  format?: unknown;
  subject?: unknown;
  visualDirection?: unknown;
  hook?: unknown;
  caption?: unknown;
  prompt?: unknown;
  palette?: unknown;
  status?: unknown;
}

interface CampaignPlanPayload {
  title?: unknown;
  logline?: unknown;
  artDirection?: unknown;
  mood?: unknown;
  palette?: unknown;
  visualRules?: unknown;
  posts?: CampaignPostPayload[];
}

interface CampaignPlanResponse {
  success?: boolean;
  campaign?: CampaignPlanPayload;
  message?: string;
}

interface ImageGenerationResponse {
  success?: boolean;
  generatedImage?: string;
  image?: string;
  message?: string;
}

interface ApiError {
  message?: string;
  error?: string | { message?: string };
}

@Component({
  selector: 'app-campaign-studio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './campaign-studio.html',
  styleUrl: './campaign-studio.scss'
})
export class CampaignStudioComponent {
  private readonly imageCreditCost = 5;
  private readonly maxReferences = 5;
  private readonly maxReferenceSize = 4 * 1024 * 1024;

  readonly subjectSource = signal<SubjectSource>('invent');
  readonly identityMode = signal<IdentityMode>('reinterpret');

  readonly campaignName = signal('');
  readonly campaignBrief = signal('');

  readonly contentCount = signal<number>(3);
  readonly aspectRatio = signal('4:5');

  readonly availableFormats: readonly CampaignFormat[] = [
    'Reel',
    'Post',
    'Carousel'
  ];

  readonly formats = signal<CampaignFormat[]>(['Post']);

  readonly references = signal<SubjectReference[]>([]);

  readonly campaignTitle = signal('');
  readonly campaignConcept = signal('');
  readonly visualIdentity = signal('');
  readonly palette = signal<string[]>([]);

  readonly posts = signal<CampaignPost[]>([]);
  readonly selectedPostId = signal<string | null>(null);

  readonly isPlanning = signal(false);
  readonly isGeneratingAll = signal(false);

  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly selectedPost = computed<CampaignPost | null>(() => {
    const id = this.selectedPostId();

    if (!id) {
      return null;
    }

    return this.posts().find(
      (post: CampaignPost) => post.id === id
    ) ?? null;
  });

  readonly pendingPosts = computed<CampaignPost[]>(() =>
    this.posts().filter(
      (post: CampaignPost) =>
        post.status === 'pending' || post.status === 'error'
    )
  );

  readonly creditsRequired = computed<number>(
    () => this.pendingPosts().length * this.imageCreditCost
  );

  readonly canGenerateAll = computed<boolean>(
    () =>
      this.posts().length > 0 &&
      !this.isPlanning() &&
      !this.isGeneratingAll() &&
      this.pendingPosts().length > 0
  );

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  setSubjectSource(value: SubjectSource): void {
    this.subjectSource.set(value);
    this.errorMessage.set('');
  }

  setIdentityMode(value: IdentityMode): void {
    this.identityMode.set(value);
  }

  setContentCount(value: number | string): void {
    const count = Number(value);

    if ([3, 6, 9].includes(count)) {
      this.contentCount.set(count);
    }
  }

  toggleFormat(format: string): void {
    if (!this.availableFormats.includes(format as CampaignFormat)) {
      return;
    }

    const typedFormat = format as CampaignFormat;

    this.formats.update((current: CampaignFormat[]) =>
      current.includes(typedFormat)
        ? current.filter((item: CampaignFormat) => item !== typedFormat)
        : [...current, typedFormat]
    );
  }

  selectPost(postId: string): void {
    this.selectedPostId.set(postId);
  }

  async onReferenceFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    this.errorMessage.set('');

    if (files.length === 0) {
      return;
    }

    const availableSlots = this.maxReferences - this.references().length;

    if (availableSlots <= 0) {
      this.errorMessage.set(
        `Puoi caricare al massimo ${this.maxReferences} immagini.`
      );
      input.value = '';
      return;
    }

    const acceptedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    const newReferences: SubjectReference[] = [];

    for (const file of files.slice(0, availableSlots)) {
      if (!acceptedTypes.includes(file.type)) {
        this.errorMessage.set(
          `${file.name}: usa un'immagine JPG, PNG o WebP.`
        );
        continue;
      }

      if (file.size > this.maxReferenceSize) {
        this.errorMessage.set(
          `${file.name}: il limite è 4 MB per immagine.`
        );
        continue;
      }

      try {
        const dataUrl = await this.readFileAsDataUrl(file);

        newReferences.push({
          id: this.createId(),
          name: file.name,
          dataUrl,
          mimeType: file.type,
          size: file.size
        });
      } catch (error: unknown) {
        console.error('Reference image read error:', error);
        this.errorMessage.set(
          `Impossibile leggere ${file.name}.`
        );
      }
    }

    this.references.update(
      (current: SubjectReference[]) => [
        ...current,
        ...newReferences
      ]
    );

    input.value = '';
  }

  removeReference(referenceId: string): void {
    this.references.update(
      (current: SubjectReference[]) =>
        current.filter(
          (reference: SubjectReference) =>
            reference.id !== referenceId
        )
    );
  }

  clearReferences(): void {
    this.references.set([]);
  }

  async buildCampaign(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.isPlanning() || this.isGeneratingAll()) {
      return;
    }

    if (!this.campaignBrief().trim()) {
      this.errorMessage.set('Inserisci una descrizione della campagna.');
      return;
    }

    if (this.campaignBrief().trim().length > 3000) {
      this.errorMessage.set(
        'La descrizione non può superare 3000 caratteri.'
      );
      return;
    }

    if (![3, 6, 9].includes(this.contentCount())) {
      this.errorMessage.set(
        'Seleziona 3, 6 oppure 9 visual.'
      );
      return;
    }

    if (this.formats().length === 0) {
      this.errorMessage.set(
        'Seleziona almeno un formato: Reel, Post o Carousel.'
      );
      return;
    }

    if (
      this.subjectSource() !== 'invent' &&
      this.references().length === 0
    ) {
      this.errorMessage.set(
        'Carica almeno un’immagine di riferimento per questo soggetto.'
      );
      return;
    }

    this.isPlanning.set(true);

    try {
      const session = await this.authService.getSession();

      if (!session?.user?.id || !session?.access_token) {
        throw new Error(
          'Sessione non valida. Effettua nuovamente il login.'
        );
      }

      const headers = new HttpHeaders({
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      });

      const payload = {
        campaignName: this.campaignName().trim(),
        brief: this.campaignBrief().trim(),
        contentCount: this.contentCount(),
        formats: this.formats(),
        subjectSource:
          this.subjectSource() === 'invent'
            ? 'ai'
            : this.subjectSource(),
        identityMode:
          this.identityMode() === 'reinterpret'
            ? 'style'
            : 'preserve',
        mood: 'Cinematic',
        palette: 'AI decides',
        goal: 'Build hype',
        references: this.references().map(
          (reference: SubjectReference) => ({
            name: reference.name,
            mimeType: reference.mimeType,
            dataUrl: reference.dataUrl
          })
        )
      };

      console.log('VANTA campaign planning request:', {
        ...payload,
        references: payload.references.map(
          (reference: {
            name: string;
            mimeType: string;
            dataUrl: string;
          }) => ({
            name: reference.name,
            mimeType: reference.mimeType,
            hasImage: Boolean(reference.dataUrl)
          })
        )
      });

      const response = await firstValueFrom(
        this.http.post<CampaignPlanResponse>(
          `${environment.apiUrl}/api/campaigns/plan`,
          payload,
          { headers }
        )
      );

      const plan = response.campaign;

      if (!response.success || !plan || !Array.isArray(plan.posts)) {
        throw new Error(
          response.message ||
            'Il backend non ha restituito un piano valido.'
        );
      }

      if (plan.posts.length !== this.contentCount()) {
        throw new Error(
          `Il backend ha restituito ${plan.posts.length} visual invece di ${this.contentCount()}.`
        );
      }

      const normalizedPosts: CampaignPost[] = plan.posts.map(
        (item: CampaignPostPayload, index: number): CampaignPost => ({
          id: this.createId(),
          title: this.toText(item.title) || `Visual ${index + 1}`,
          format: this.toText(item.format) || 'Post',
          objective: this.toText(item.role),
          visualDirection:
            this.toText(item.visualDirection) ||
            this.toText(item.subject),
          creativePrompt: this.toText(item.prompt),
          negativePrompt:
            'Distorted anatomy, malformed hands, blurry details, low quality, watermark, random text, inconsistent subject.',
          caption: this.toText(item.caption),
          hashtags: [],
          generatedImage: null,
          status: 'pending',
          generationError: ''
        })
      );

      this.campaignTitle.set(
        this.toText(plan.title) ||
          this.campaignName().trim() ||
          'Nuova campagna'
      );

      this.campaignConcept.set(this.toText(plan.logline));

      this.visualIdentity.set(
        this.toText(plan.artDirection) ||
          this.toStringArray(plan.visualRules).join(' · ')
      );

      this.palette.set(this.toStringArray(plan.palette));
      this.posts.set(normalizedPosts);
      this.selectedPostId.set(normalizedPosts[0]?.id ?? null);

      this.successMessage.set(
        `Piano creato: ${normalizedPosts.length} visual. La generazione completa richiede ${normalizedPosts.length * this.imageCreditCost} crediti, se tutti i visual devono essere generati.`
      );
    } catch (error: unknown) {
      console.error('VANTA Campaign Studio planning error:', error);

      if (error instanceof HttpErrorResponse) {
        console.error('HTTP status:', error.status);
        console.error('Backend response:', error.error);
        this.errorMessage.set(this.getHttpErrorMessage(error));
      } else {
        this.errorMessage.set(
          error instanceof Error
            ? error.message
            : 'Errore durante la pianificazione della campagna.'
        );
      }
    } finally {
      this.isPlanning.set(false);
    }
  }

  async generateOne(postId: string): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.isGeneratingAll() || this.isPlanning()) {
      return;
    }

    const post = this.posts().find(
      (item: CampaignPost) => item.id === postId
    );

    if (!post || post.status === 'generating' || post.status === 'ready') {
      return;
    }

    await this.generatePost(post);
  }

  async generateAll(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.isPlanning() || this.isGeneratingAll()) {
      return;
    }

    const pending = this.pendingPosts();

    if (pending.length === 0) {
      this.errorMessage.set('Non ci sono visual da generare.');
      return;
    }

    const totalCost = pending.length * this.imageCreditCost;

    const confirmed = window.confirm(
      `Generare ${pending.length} immagini?\n\nCosto previsto: ${totalCost} crediti.\n\nIl server verificherà il saldo disponibile.`
    );

    if (!confirmed) {
      return;
    }

    this.isGeneratingAll.set(true);

    let completed = 0;
    let failed = 0;
    let stoppedForCredits = false;

    try {
      for (const post of pending) {
        const success = await this.generatePost(post);

        if (success) {
          completed++;
        } else {
          failed++;

          const currentPost = this.posts().find(
            (item: CampaignPost) => item.id === post.id
          );

          if (
            currentPost?.generationError.includes('credit') ||
            currentPost?.generationError.includes('saldo') ||
            currentPost?.generationError.includes('Credit')
          ) {
            stoppedForCredits = true;
            break;
          }
        }
      }

      this.successMessage.set(
        `Generazione terminata: ${completed} completate, ${failed} non riuscite.${stoppedForCredits ? ' Sequenza interrotta per un possibile problema di crediti.' : ''}`
      );
    } finally {
      this.isGeneratingAll.set(false);
    }
  }

  retryPost(postId: string): Promise<void> {
    return this.generateOne(postId);
  }

  downloadImage(post: CampaignPost): void {
    if (!post.generatedImage) {
      return;
    }

    const link = document.createElement('a');
    link.href = post.generatedImage;
    link.download = `${this.slugify(post.title) || 'vanta-visual'}.png`;
    link.rel = 'noopener';
    link.click();
  }

  trackByPostId(_index: number, post: CampaignPost): string {
    return post.id;
  }

  
  
  private async generatePost(post: CampaignPost): Promise<boolean> {
  this.updatePost(post.id, {
    status: 'generating',
    generationError: ''
  });

  try {
    const session = await this.authService.getSession();

    if (!session?.user?.id || !session?.access_token) {
      throw new Error(
        'Sessione non valida. Effettua nuovamente il login.'
      );
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${session.access_token}`
    });

    const references = this.references();
    const subjectSource = this.subjectSource();

    if (subjectSource !== 'invent' && references.length === 0) {
      throw new Error(
        'Carica almeno una foto di riferimento prima di generare.'
      );
    }

    const sourceImages =
      subjectSource === 'invent'
        ? []
        : references.map(reference => reference.dataUrl);

    console.log('[VANTA GENERATION]', {
      subjectSource,
      identityMode: this.identityMode(),
      referenceCount: sourceImages.length
    });

    const response = await firstValueFrom(
      this.http.post<ImageGenerationResponse>(
        `${environment.apiUrl}/api/image/generate`,
        {
          userId: session.user.id,
          prompt: post.creativePrompt,
          negativePrompt: post.negativePrompt,
          aspectRatio: this.aspectRatio(),
          subjectSource,
          identityMode: this.identityMode(),
          sourceImages
        },
        { headers }
      )
    );

    const image = response.generatedImage ?? response.image ?? null;

    if (!image) {
      throw new Error(
        response.message ||
          'Il server non ha restituito l’immagine generata.'
      );
    }

    this.updatePost(post.id, {
      generatedImage: image,
      status: 'ready',
      generationError: ''
    });

    return true;
  } catch (error: unknown) {
    console.error(`VANTA image generation error: ${post.title}`, error);

    const message =
      error instanceof HttpErrorResponse
        ? this.getHttpErrorMessage(error)
        : error instanceof Error
          ? error.message
          : 'Errore durante la generazione.';

    this.updatePost(post.id, {
      status: 'error',
      generationError: message
    });

    this.errorMessage.set(message);
    return false;
  }
  }



  private updatePost(
    postId: string,
    changes: Partial<CampaignPost>
  ): void {
    this.posts.update((current: CampaignPost[]) =>
      current.map((post: CampaignPost) =>
        post.id === postId ? { ...post, ...changes } : post
      )
    );
  }

  private toText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .filter((item: unknown): item is string =>
          typeof item === 'string'
        )
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0);
    }

    if (typeof value === 'string' && value.trim()) {
      return value
        .split(',')
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0);
    }

    return [];
  }

  private getHttpErrorMessage(error: HttpErrorResponse): string {
    const body = error.error as ApiError | string | null;

    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (body && typeof body === 'object') {
      if (typeof body.message === 'string' && body.message.trim()) {
        return body.message;
      }

      if (typeof body.error === 'string' && body.error.trim()) {
        return body.error;
      }

      if (
        body.error &&
        typeof body.error === 'object' &&
        typeof body.error.message === 'string'
      ) {
        return body.error.message;
      }
    }

    return `Errore HTTP ${error.status}: ${error.statusText || error.message}`;
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Formato immagine non valido.'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Impossibile leggere il file.'));
      };

      reader.readAsDataURL(file);
    });
  }

  private createId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
