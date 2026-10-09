import {

  Component,

  OnInit,

  signal

} from '@angular/core';



import { CommonModule } from '@angular/common';



import {

  HttpClient,

  HttpHeaders

} from '@angular/common/http';



import { AuthService } from '../../core/auth.service';

import { InstagramService } from '../../core/instagram.service';

import { environment } from '../../../environments/environment';



// =====================================================

// PROFILE DNA

// =====================================================



interface ProfileDNA {



  mood: string[];



  visualStyle: string[];



  palette: string[];



  composition: string[];



  typography: string[];



  texture: string[];



  identity: string[];



  recommendations: string[];



  impactScore: number;



}





// =====================================================

// CREATIVE DIRECTION

// =====================================================



interface CreativeDirection {



  title: string;



  concept: string;



  theme: string;



  mood: string[];



  visualStyle: string[];



  palette: string[];



  composition: string[];



  typography: string[];



  texture: string[];



  openLoop: boolean;



  preserveSubject: boolean;



  creativePrompt: string;



  negativePrompt: string;



  recommendations: string[];



}





// =====================================================

// INSTAGRAM ANALYZE RESPONSE

// =====================================================



interface AnalyzeResponse {



  success: boolean;



  profile: unknown;



  media: unknown[];



  dna: ProfileDNA;



  analyzed_at: string;



}





// =====================================================

// CREATIVE DIRECTION RESPONSE

// =====================================================



interface CreativeDirectionResponse {



  success: boolean;



  creativeDirection: CreativeDirection;



  generated_at: string;



}





// =====================================================

// IMAGE GENERATION RESPONSE

// =====================================================



interface ImageGenerationResponse {



  success: boolean;



  generatedImage?: string;



  model?: string;



  generated_at?: string;



  message?: string;



}





// =====================================================

// IMPACT EVALUATION

// =====================================================



interface ImpactAlignment {



  mood: number;



  visualStyle: number;



  palette: number;



  composition: number;



  identity: number;



  texture: number;



}





interface ImpactEvaluation {



  sourceScore: number;



  generatedScore: number;



  improvement: number;



  verdict:

    | 'better'

    | 'same'

    | 'worse';



  confidence: number;



  strengths: string[];



  weaknesses: string[];



  reasons: string[];



  profileAlignment: ImpactAlignment;



}





interface ImpactResponse {



  success: boolean;



  evaluation: ImpactEvaluation;



  evaluated_at: string;



}





// =====================================================

// VISUAL SAVE RESPONSE

// =====================================================



interface VisualResponse {



  success: boolean;



  visual?: {



    id: string;



    user_id: string;



    profile_id?: string | null;



    source_image_url?: string | null;



    generated_image_url: string;



    created_at: string;



  };



  message?: string;



  error?: string;



}





// =====================================================

// CREATE PROCESS

// =====================================================



type CreateAspectRatio = '9:16' | '4:5' | '1:1' | '16:9' | '3:2';


type CreateStage =

  | 'idle'

  | 'analyzing'

  | 'directing'

  | 'generating'

  | 'evaluating'

  | 'complete'

  | 'error';





// =====================================================

// COMPONENT

// =====================================================



@Component({



  selector: 'app-create',



  standalone: true,



  imports: [

    CommonModule

  ],



  templateUrl:

    './create.html',



  styleUrl:

    './create.scss'



})





export class Create

  implements OnInit {





  // =====================================================

  // GLOBAL INSTAGRAM SERVICE

  // =====================================================



  public get instagramService(): InstagramService {

    return this.instagramServiceInternal;

  }





  // =====================================================

  // STATE

  // =====================================================



  dna =

    signal<ProfileDNA | null>(

      null

    );





  loadingDNA =

    signal(false);





  selectedImage =

    signal<string | null>(

      null

    );





  selectedImageName =

    signal('');





  selectedImageType =

    signal('');





  prompt =

    signal('');


  /** Output format; defaults to Instagram Reel / Story. */
  aspectRatio =

    signal<CreateAspectRatio>('9:16');





  generating =

    signal(false);





  generatingImage =

    signal(false);





  evaluatingImpact =

    signal(false);





  error =

    signal('');





  creativeDirection =

    signal<CreativeDirection | null>(

      null

    );





  generatedImage =

    signal<string | null>(

      null

    );





  impactEvaluation =

    signal<ImpactEvaluation | null>(

      null

    );





  // ===================================================

  // CREATION SAVE STATE

  // ===================================================



  savingCreation =

    signal(false);





  creationSaved =

    signal(false);





  saveError =

    signal('');





  // ===================================================

  // BETA UX STATE

  // ===================================================



  stage =

    signal<CreateStage>(

      'idle'

    );





  stageMessage =

    signal(

      'Ready when you are.'

    );





  stageProgress =

    signal(0);





  // ===================================================

  // INTERNAL PROCESS FLAGS

  // ===================================================



  sourceAnalyzed =

    signal(false);





  directionReady =

    signal(false);





  imageReady =

    signal(false);





  impactReady =

    signal(false);





  // =====================================================

  // CONSTRUCTOR

  // =====================================================



  constructor(



    private readonly http: HttpClient,



    private readonly authService: AuthService,



    private readonly instagramServiceInternal: InstagramService



  ) {}





  // =====================================================

  // INIT

  // =====================================================



  async ngOnInit(): Promise<void> {



    console.log('');



    console.log(

      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

    );



    console.log(

      '🎬 VANTA CREATE INITIALIZED'

    );



    console.log(

      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

    );





    console.log(

      '🔐 AUTH USER:',

      this.authService.user()

    );





    // =================================================

    // LOAD GLOBAL INSTAGRAM STATE

    // =================================================



    await this.instagramServiceInternal.load();





    // =================================================

    // CHECK INSTAGRAM CONNECTION

    // =================================================



    if (

      !this.instagramServiceInternal.connected()

    ) {



      console.log(

        '⚠️ INSTAGRAM NOT CONNECTED'

      );





      this.loadingDNA.set(

        false

      );





      this.error.set(

        'Connect Instagram before creating.'

      );





      return;

    }





    console.log(

      '✅ INSTAGRAM CONNECTED:',

      this.instagramServiceInternal.getUsername()

    );





    // =================================================

    // LOAD PROFILE DNA

    // =================================================



    this.loadProfileDNA();



  }





  // =====================================================

  // LOAD PROFILE DNA

  // =====================================================



  loadProfileDNA(): void {



    this.loadingDNA.set(

      true

    );





    this.error.set(

      ''

    );





    // =================================================

    // INSTAGRAM CHECK

    // =================================================



    if (

      !this.instagramServiceInternal.connected()

    ) {



      this.loadingDNA.set(

        false

      );





      this.error.set(

        'Connect Instagram and analyze your profile before creating.'

      );





      return;

    }





    console.log(

      '🧬 Loading VANTA Profile DNA...'

    );





    // =================================================

    // GET VANTA SESSION

    // =================================================



    this.authService

      .getSession()

      .then(

        session => {



          if (!session) {



            this.loadingDNA.set(

              false

            );





            this.error.set(

              'Your VANTA session has expired. Please log in again.'

            );





            return;

          }





          // =============================================

          // AUTH HEADERS

          // =============================================



          const headers =

            new HttpHeaders({



              'Content-Type':

                'application/json',



              Authorization:

                `Bearer ${session.access_token}`



            });





          // =============================================

          // ANALYZE PROFILE

          // =============================================



          this.http

            .post<AnalyzeResponse>(

              `${environment.apiUrl}/api/instagram/analyze`,

              {},

              {

                headers

              }

            )

            .subscribe({



              next:

                response => {



                  console.log(

                    '🧬 VANTA PROFILE DNA:',

                    response.dna

                  );





                  this.dna.set(

                    response.dna

                  );





                  this.loadingDNA.set(

                    false

                  );





                  console.log(

                    '✅ CREATE PROFILE DNA READY'

                  );



                },





              error:

                error => {



                  console.error(

                    '❌ PROFILE DNA ERROR:',

                    error

                  );





                  this.loadingDNA.set(

                    false

                  );





                  this.error.set(

                    error?.error?.message ||

                    'Connect Instagram and analyze your profile before creating.'

                  );



                }



            });



        }

      )

      .catch(

        error => {



          console.error(

            '❌ CREATE SESSION ERROR:',

            error

          );





          this.loadingDNA.set(

            false

          );





          this.error.set(

            'Unable to verify your VANTA session.'

          );



        }

      );



  }





  // =====================================================

  // IMAGE SELECTED

  // =====================================================



  onImageSelected(

    event: Event

  ): void {



    const input =

      event.target as HTMLInputElement;





    const file =

      input.files?.[0];





    if (!file) {



      return;



    }





    if (

      !file.type.startsWith(

        'image/'

      )

    ) {



      this.error.set(

        'Please upload a valid image.'

      );





      input.value = '';



      return;



    }





    const maxSize =

      20 * 1024 * 1024;





    if (

      file.size > maxSize

    ) {



      this.error.set(

        'Image must be smaller than 20 MB.'

      );





      input.value = '';



      return;



    }





    console.log('');



    console.log(

      '📸 SOURCE IMAGE SELECTED'

    );



    console.log(

      'NAME:',

      file.name

    );



    console.log(

      'TYPE:',

      file.type

    );



    console.log(

      'SIZE:',

      file.size

    );





    this.resetGenerationState();





    this.selectedImageName.set(

      file.name

    );





    this.selectedImageType.set(

      file.type

    );





    const reader =

      new FileReader();





    reader.onload = () => {



      if (

        typeof reader.result !==

        'string'

      ) {



        this.error.set(

          'Unable to read the selected image.'

        );





        this.stage.set(

          'error'

        );





        this.stageMessage.set(

          'The source image could not be read.'

        );





        return;



      }





      this.selectedImage.set(

        reader.result

      );





      console.log(

        '✅ SOURCE IMAGE READY'

      );



    };





    reader.onerror = () => {



      console.error(

        '❌ IMAGE READ ERROR'

      );





      this.error.set(

        'Unable to read the selected image.'

      );





      this.stage.set(

        'error'

      );





      this.stageMessage.set(

        'The source image could not be read.'

      );



    };





    reader.readAsDataURL(

      file

    );





    input.value = '';



  }





  // =====================================================

  // REMOVE IMAGE

  // =====================================================



  removeImage(): void {



    console.log(

      '🗑️ SOURCE IMAGE REMOVED'

    );





    this.selectedImage.set(

      null

    );





    this.selectedImageName.set(

      ''

    );





    this.selectedImageType.set(

      ''

    );





    this.resetGenerationState();



  }





  // =====================================================

  // UPDATE PROMPT

  // =====================================================



  updatePrompt(

    event: Event

  ): void {



    const target =

      event.target as HTMLTextAreaElement;





    this.prompt.set(

      target.value

    );



  }





  // =====================================================
  // OUTPUT FORMAT
  // =====================================================

  setAspectRatio(ratio: CreateAspectRatio): void {
    this.aspectRatio.set(ratio);
  }


  // =====================================================
  // MAIN GENERATION FLOW
  // =====================================================



  generateVisual(): void {



    if (

      this.generating()

    ) {



      return;



    }





    // =================================================

    // INSTAGRAM CONNECTION CHECK

    // =================================================



    if (

      !this.instagramServiceInternal.connected()

    ) {



      this.error.set(

        'Connect Instagram before creating a visual.'

      );





      this.setStage(

        'error',

        'Connect Instagram before creating.',

        0

      );





      return;



    }





    const image =

      this.selectedImage();





    if (!image) {



      this.error.set(

        'Upload an image first.'

      );





      this.stage.set(

        'error'

      );





      this.stageMessage.set(

        'Upload a frame to start creating.'

      );





      return;



    }





    const currentDNA =

      this.dna();





    if (!currentDNA) {



      this.error.set(

        'Profile DNA is not available.'

      );





      this.stage.set(

        'error'

      );





      this.stageMessage.set(

        'Connect Instagram before creating.'

      );





      return;



    }





    this.generating.set(

      true

    );





    this.generatingImage.set(

      false

    );





    this.evaluatingImpact.set(

      false

    );





    this.error.set(

      ''

    );





    this.saveError.set(

      ''

    );





    this.creationSaved.set(

      false

    );





    this.generatedImage.set(

      null

    );





    this.impactEvaluation.set(

      null

    );





    this.creativeDirection.set(

      null

    );





    // =================================================

    // RESET PROCESS

    // =================================================



    this.sourceAnalyzed.set(

      false

    );





    this.directionReady.set(

      false

    );





    this.imageReady.set(

      false

    );





    this.impactReady.set(

      false

    );





    // =================================================

    // STAGE 1

    // =================================================



    this.setStage(

      'analyzing',

      'Analyzing your frame...',

      15

    );





    console.log('');



    console.log(

      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

    );



    console.log(

      '🧠 VANTA CREATIVE DIRECTOR'

    );



    console.log(

      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

    );





    console.log(

      '📸 SOURCE IMAGE: YES'

    );





    console.log(

      '🧬 PROFILE DNA: YES'

    );





    console.log(

      '💬 USER IDEA:',

      this.prompt().trim() ||

      '(NO IDEA — VANTA DECIDES)'

    );





    const selectedAspectRatio = this.aspectRatio();


    const aspectRatioInstruction =
      `Output aspect ratio: ${selectedAspectRatio}. Compose specifically for this format, keep the main subject and important text safely inside the frame, and do not assume a vertical Reel crop unless 9:16 is selected.`;


    const userPrompt = this.prompt().trim();


    const request = {

      source: 'image',

      aspectRatio: selectedAspectRatio,

      prompt: [userPrompt, aspectRatioInstruction].filter(Boolean).join('\n\n'),

      preserveSubject: true,

      openLoop: true

    };





    this.http

      .post<CreativeDirectionResponse>(

        `${environment.apiUrl}/api/ai/creative-direction`,

        {



          dna:

            currentDNA,



          request,



          sourceImage:

            image



        }

      )

      .subscribe({



        next:

          response => {



            console.log('');



            console.log(

              '🧠 CREATIVE DIRECTION RECEIVED'

            );





            console.log(

              response.creativeDirection

            );





            this.sourceAnalyzed.set(

              true

            );





            this.directionReady.set(

              true

            );





            this.creativeDirection.set(

              response.creativeDirection

            );





            this.setStage(

              'directing',

              'Building your creative direction...',

              35

            );





            this.generateImage(

              response.creativeDirection

            );



          },





        error:

          error => {



            console.error('');



            console.error(

              '❌ CREATIVE DIRECTOR ERROR'

            );





            console.error(

              error

            );





            console.error(

              'BACKEND:',

              error?.error

            );





            this.error.set(

              error?.error?.message ||

              'Unable to create the VANTA creative direction.'

            );





            this.setStage(

              'error',

              'VANTA could not create the visual direction.',

              0

            );





            this.generating.set(

              false

            );



          }



      });



  }





  // =====================================================

  // IMAGE GENERATION

  // =====================================================



  
  async generateImage(
    creative: CreativeDirection
  ): Promise<void> {

    const image = this.selectedImage();

    if (!image) {
      this.error.set('Source image is missing.');
      this.setStage('error', 'The source image is missing.', 0);
      this.generatingImage.set(false);
      this.generating.set(false);
      return;
    }

    try {
      const session = await this.authService.getSession();

      if (!session?.user?.id || !session.access_token) {
        this.error.set('Your VANTA session has expired. Please log in again.');
        this.setStage('error', 'Authentication required.', 0);
        this.generatingImage.set(false);
        this.generating.set(false);
        return;
      }

      this.generatingImage.set(true);

      this.setStage(
        'generating',
        `Creating your ${this.aspectRatio()} visual...`,
        65
      );

      const imageRequest = {
        userId: session.user.id,
        prompt: creative.creativePrompt,
        negativePrompt: creative.negativePrompt,
        aspectRatio: this.aspectRatio(),
        sourceImage: image
      };

      this.http.post<ImageGenerationResponse>(
        `${environment.apiUrl}/api/image/generate`,
        imageRequest,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      ).subscribe({
        next: response => {
          if (response.success && response.generatedImage) {
            this.generatedImage.set(response.generatedImage);
            this.imageReady.set(true);
            this.generatingImage.set(false);

            const dna = this.dna();

            if (dna) {
              this.evaluateImpact(
                image,
                response.generatedImage,
                dna
              );
            } else {
              this.generating.set(false);
              this.setStage(
                'complete',
                'Your VANTA visual is ready.',
                100
              );
            }
          } else {
            this.error.set(
              response.message || 'Image generation failed.'
            );
            this.setStage(
              'error',
              'VANTA could not generate the visual.',
              0
            );
            this.generatingImage.set(false);
            this.generating.set(false);
          }
        },
        error: error => {
          console.error('IMAGE GENERATION ERROR:', error);
          console.error('BACKEND ERROR:', error?.error);

          this.error.set(
            error?.error?.message ||
            'Unable to generate the image.'
          );

          this.setStage(
            'error',
            'Something went wrong while generating your visual.',
            0
          );

          this.generatingImage.set(false);
          this.generating.set(false);
        }
      });
    } catch (error) {
      console.error('AUTHENTICATION ERROR:', error);

      this.error.set('Unable to verify your VANTA session.');
      this.setStage('error', 'Authentication failed.', 0);
      this.generatingImage.set(false);
      this.generating.set(false);
    }
  }






  // =====================================================

  // IMPACT EVALUATION

  // =====================================================



  evaluateImpact(

    sourceImage: string,

    generatedImage: string,

    currentDNA: ProfileDNA

  ): void {



    this.evaluatingImpact.set(

      true

    );





    this.setStage(

      'evaluating',

      'Evaluating the visual against your Profile DNA...',

      85

    );





    console.log('');



    console.log(

      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

    );



    console.log(

      '📊 VANTA IMPACT EVALUATION'

    );



    console.log(

      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

    );





    console.log(

      '📸 SOURCE IMAGE: PROVIDED'

    );





    console.log(

      '🖼️ GENERATED IMAGE: PROVIDED'

    );





    console.log(

      '🧬 PROFILE DNA: PROVIDED'

    );





    this.http

      .post<ImpactResponse>(

        `${environment.apiUrl}/api/impact/evaluate`,

        {



          sourceImage,



          generatedImage,



          dna:

            currentDNA



        }

      )

      .subscribe({



        next:

          response => {



            console.log('');



            console.log(

              '📊 VANTA IMPACT RESULT'

            );





            console.log(

              response.evaluation

            );





            this.impactEvaluation.set(

              response.evaluation

            );





            this.impactReady.set(

              true

            );





            this.evaluatingImpact.set(

              false

            );





            this.generating.set(

              false

            );





            this.setStage(

              'complete',

              'Your VANTA visual is ready.',

              100

            );





            console.log('');



            console.log(

              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

            );





            console.log(

              '🎯 SOURCE:',

              response.evaluation.sourceScore

            );





            console.log(

              '🚀 VANTA:',

              response.evaluation.generatedScore

            );





            console.log(

              '📈 IMPROVEMENT:',

              response.evaluation.improvement

            );





            console.log(

              '🏆 VERDICT:',

              response.evaluation.verdict

            );





            console.log(

              '🎯 CONFIDENCE:',

              response.evaluation.confidence

            );





            console.log(

              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

            );



          },





        error:

          error => {



            console.error('');



            console.error(

              '❌ IMPACT EVALUATION ERROR'

            );





            console.error(

              error

            );





            console.error(

              'BACKEND ERROR:',

              error?.error

            );





            this.evaluatingImpact.set(

              false

            );





            this.generating.set(

              false

            );





            this.setStage(

              'complete',

              'Your visual is ready. Impact evaluation unavailable.',

              100

            );





            this.error.set(

              error?.error?.message ||

              'Image generated successfully, but VANTA could not evaluate its impact.'

            );



          }



      });



  }





  // =====================================================

  // SAVE CREATION → SUPABASE

  // =====================================================



  async saveCreation(): Promise<void> {



    if (

      this.savingCreation()

    ) {



      return;



    }





    const sourceImage =

      this.selectedImage();





    const generated =

      this.generatedImage();





    const direction =

      this.creativeDirection();





    const impact =

      this.impactEvaluation();





    // =================================================

    // VALIDATION

    // =================================================



    if (!sourceImage) {



      this.saveError.set(

        'Source image is missing.'

      );





      return;



    }





    if (!generated) {



      this.saveError.set(

        'Generated image is missing.'

      );





      return;



    }





    if (

      this.creationSaved()

    ) {



      return;



    }





    // =================================================

    // AUTHENTICATION

    // =================================================



    const session =

      await this.authService.getSession();





    if (!session) {



      this.saveError.set(

        'You must be logged in to save a visual.'

      );





      return;



    }





    this.savingCreation.set(

      true

    );





    this.saveError.set(

      ''

    );





    console.log('');



    console.log(

      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

    );



    console.log(

      '💾 SAVING VANTA VISUAL'

    );



    console.log(

      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

    );





    console.log(

      '🔐 AUTH USER:',

      session.user.id

    );





    // =================================================

    // BUILD PAYLOAD

    // =================================================



    const payload = {



      sourceImage,



      generatedImage:

        generated,



      title:

        direction?.title ??

        'VANTA Visual',



      concept:

        direction?.concept ??

        null,



      theme:

        direction?.theme ??

        null,



      mood:

        direction?.mood ??

        this.dna()?.mood ??

        [],



      visualStyle:

        direction?.visualStyle ??

        this.dna()?.visualStyle ??

        [],



      palette:

        direction?.palette ??

        this.dna()?.palette ??

        [],



      composition:

        direction?.composition ??

        this.dna()?.composition ??

        [],



      typography:

        direction?.typography ??

        this.dna()?.typography ??

        [],



      texture:

        direction?.texture ??

        this.dna()?.texture ??

        [],



      creativePrompt:

        direction?.creativePrompt ??

        null,



      negativePrompt:

        direction?.negativePrompt ??

        null,



      preserveSubject:

        direction?.preserveSubject ??

        true,



      sourceScore:

        impact?.sourceScore ??

        null,



      generatedScore:

        impact?.generatedScore ??

        null,



      improvement:

        impact?.improvement ??

        null,



      verdict:

        impact?.verdict ??

        null,



      confidence:

        impact?.confidence ??

        null,



      profileAlignment:

        impact?.profileAlignment ??

        {},



      strengths:

        impact?.strengths ??

        [],



      weaknesses:

        impact?.weaknesses ??

        [],



      aspectRatio:

        this.aspectRatio(),



      model:

        null



    };





    // =================================================

    // SAVE

    // =================================================



    this.http

      .post<VisualResponse>(

        `${environment.apiUrl}/api/visuals/save`,

        payload,

        {

          headers: {

            Authorization:

              `Bearer ${session.access_token}`

          }

        }

      )

      .subscribe({



        next:

          response => {



            console.log('');



            console.log(

              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

            );



            console.log(

              '✅ VANTA VISUAL SAVED'

            );



            console.log(

              response.visual

            );



            console.log(

              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

            );





            this.savingCreation.set(

              false

            );





            this.creationSaved.set(

              true

            );





            this.saveError.set(

              ''

            );



          },





        error:

          error => {



            console.error('');



            console.error(

              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

            );



            console.error(

              '❌ VANTA VISUAL SAVE ERROR'

            );



            console.error(

              error

            );



            console.error(

              'BACKEND:',

              error?.error

            );



            console.error(

              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

            );





            this.savingCreation.set(

              false

            );





            this.saveError.set(

              error?.error?.message ||

              'Unable to save this visual.'

            );



          }



      });



  }





  // =====================================================

  // REGENERATE

  // =====================================================



  regenerate(): void {



    if (

      this.generating()

    ) {



      return;



    }





    this.generateVisual();



  }





  // =====================================================

  // RESET GENERATION STATE

  // =====================================================



  private resetGenerationState(): void {



    this.generatedImage.set(

      null

    );





    this.creativeDirection.set(

      null

    );





    this.impactEvaluation.set(

      null

    );





    this.generating.set(

      false

    );





    this.generatingImage.set(

      false

    );





    this.evaluatingImpact.set(

      false

    );





    this.error.set(

      ''

    );





    this.saveError.set(

      ''

    );





    this.savingCreation.set(

      false

    );





    this.creationSaved.set(

      false

    );





    this.sourceAnalyzed.set(

      false

    );





    this.directionReady.set(

      false

    );





    this.imageReady.set(

      false

    );





    this.impactReady.set(

      false

    );





    this.setStage(

      'idle',

      'Ready when you are.',

      0

    );



  }





  // =====================================================

  // SET PROCESS STAGE

  // =====================================================



  private setStage(

    stage: CreateStage,

    message: string,

    progress: number

  ): void {



    this.stage.set(

      stage

    );





    this.stageMessage.set(

      message

    );





    this.stageProgress.set(

      Math.max(

        0,

        Math.min(

          100,

          progress

        )

      )

    );



  }



}