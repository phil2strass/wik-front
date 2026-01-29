import { Component, DestroyRef, ViewEncapsulation, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Configuration } from '@shared/config/configuration';
import { SecurityStore } from '@shared/security/security-store';
import { DataStore } from '@shared/data/data-store';
import { Langue } from '@shared/data/models/langue.model';
import { Categorie } from '../../models/categorie.model';
import { Word, WordTranslationValue } from '../../models/word.model';
import { SenseService } from '../../services/sense.service';
import { MaterialModule } from '../../../material.module';
import { WordSenseDialogComponent } from '../word-sense-dialog/word-sense-dialog.component';
import { WordTranslationEditDialogComponent } from '../word-translation-view-dialog/word-translation-view-dialog.component';

type SenseEntry = {
  label: string;
  translation: string;
  wordTranslations: string[];
  examples: { source: string; translation: string }[];
};

type DictionaryEntry = {
  word: string;
  wordData: Word;
  type: string;
  gender?: string;
  translations: string[];
  senses: SenseEntry[];
  categories: Categorie[];
};

type AiWordDetailExample = {
  src: string;
  fr: string;
  de: string;
};

type AiWordDetailSense = {
  senseIndex?: number;
  sensSrc: string;
  sensFr: string;
  sensDe: string;
  wordFr?: string;
  wordDe?: string;
  wordFrGender?: string;
  wordFrPlural?: string;
  wordDeGender?: string;
  wordDePlural?: string;
  examples: AiWordDetailExample[];
};

type AiWordDetailResult = {
  word: string;
  gender?: string;
  langue?: string;
  sens: AiWordDetailSense[];
};

type WordGridTranslation = {
  wordLangueTypeId: number;
  langueId: number;
  typeId: number;
  name: string;
  genderId: number | null;
  plural: string;
};

type DictionaryUiText = {
  eyebrow: string;
  title: string;
  subtitle: string;
  back: string;
  examplesLabel: string;
  notFound: string;
  loading: string;
};

@Component({
  selector: 'app-word-detail',
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './word-detail.component.html',
  styleUrls: ['../../../pages/starter/starter.component.scss', './word-detail.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class WordDetailComponent {
  readonly #translate = inject(TranslateService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #http = inject(HttpClient);
  readonly #baseUrl = inject(Configuration).baseUrl;
  readonly #securityStore = inject(SecurityStore);
  readonly #dataStore = inject(DataStore);
  readonly #senseService = inject(SenseService);
  readonly #dialog = inject(MatDialog);

  readonly uiTextByLang: Record<string, DictionaryUiText> = {
    fr: {
      eyebrow: 'Dictionnaire personnel',
      title: 'Détail du mot',
      subtitle: 'Type, genres, traductions, sens et exemples traduits.',
      back: 'Retour à la liste',
      examplesLabel: 'Exemples',
      notFound: 'Mot introuvable.',
      loading: 'Chargement du mot...'
    },
    en: {
      eyebrow: 'Personal dictionary',
      title: 'Word detail',
      subtitle: 'Type, genders, translations, senses, and translated examples.',
      back: 'Back to list',
      examplesLabel: 'Examples',
      notFound: 'Word not found.',
      loading: 'Loading word...'
    },
    es: {
      eyebrow: 'Diccionario personal',
      title: 'Detalle de la palabra',
      subtitle: 'Tipos, generos, traducciones, sentidos y ejemplos traducidos.',
      back: 'Volver a la lista',
      examplesLabel: 'Ejemplos',
      notFound: 'Palabra no encontrada.',
      loading: 'Cargando palabra...'
    },
    de: {
      eyebrow: 'Persoenliches Woerterbuch',
      title: 'Wortdetails',
      subtitle: 'Wortart, Genus, Uebersetzungen, Bedeutungen und Beispielen.',
      back: 'Zurueck zur Liste',
      examplesLabel: 'Beispiele',
      notFound: 'Wort nicht gefunden.',
      loading: 'Wort wird geladen...'
    }
  };

  currentUiLang = 'en';
  entry: DictionaryEntry | null = null;
  loading = false;
  notFound = false;
  aiLoading = false;
  aiError: string | null = null;
  aiResult: AiWordDetailResult | null = null;
  aiIntegrating = false;
  aiIntegrateError: string | null = null;
  chatEngines = [
    { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'gpt-5.2', label: 'GPT-5.2' }
  ];
  selectedChatEngine = this.chatEngines[0]?.id ?? 'gpt-4o-mini';
  wordLangueTypeId?: number;
  targetLangueId?: number;
  motherTongueId?: number;
  #wordData?: Word;

  constructor() {
    const initialLang = this.#translate.currentLang || this.#translate.defaultLang || 'en';
    this.applyUiLanguage(initialLang);
    this.#translate.onLangChange
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(event => this.applyUiLanguage(event.lang));

    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(params => {
      const raw = params.get('wordLangueTypeId');
      const parsed = raw ? Number(raw) : NaN;
      if (!Number.isFinite(parsed)) {
        this.notFound = true;
        this.entry = null;
        return;
      }
      this.wordLangueTypeId = parsed;
      this.loadWord(parsed);
    });

    effect(() => {
      const profil = this.#securityStore.loadedProfil();
      const langueId = this.#securityStore.langueSelected();
      const motherTongueId = profil?.langueMaternelle ?? undefined;
      if (langueId !== this.targetLangueId || motherTongueId !== this.motherTongueId) {
        this.targetLangueId = langueId;
        this.motherTongueId = motherTongueId;
        this.refreshEntry();
      }
    });
  }

  get uiText(): DictionaryUiText {
    return this.uiTextByLang[this.currentUiLang] ?? this.uiTextByLang['en'];
  }

  goBack(): void {
    this.#router.navigate(['/word/list']);
  }

  onChatGptClick(): void {
    if (!this.entry) {
      return;
    }
    const payload = {
      wordLangueTypeId: this.entry.wordData.wordLangueTypeId,
      word: this.entry.wordData.name ?? this.entry.wordData.displayName ?? this.entry.word,
      gender: this.entry.wordData.gender?.name ?? '',
      langue: this.selectedLangueName(),
      langueIso: this.selectedLangueIso(),
      typeId: this.entry.wordData.type?.id ?? null,
      typeName: this.entry.wordData.type?.name ?? '',
      expandAllSenses: true,
      senses: this.entry.senses.map(sense => sense.label).filter(label => !!label),
      model: this.selectedChatEngine
    };

    this.aiLoading = true;
    this.aiError = null;
    this.aiResult = null;
    this.aiIntegrateError = null;

    this.#http.post<any>(`${this.#baseUrl}ai/word/detail`, payload).subscribe({
      next: response => {
        const senses = Array.isArray(response?.sens) ? response.sens : [];
        this.aiResult = {
          word: response?.word ?? payload.word,
          gender: response?.gender ?? payload.gender,
          langue: response?.langue ?? payload.langue,
          sens: senses.map((sense: any) => ({
            senseIndex: typeof sense?.sense_index === 'number' ? sense.sense_index : undefined,
            sensSrc: sense?.sens_src ?? '',
            sensFr: sense?.sens_fr ?? '',
            sensDe: sense?.sens_de ?? '',
            wordFr: sense?.word_fr ?? '',
            wordDe: sense?.word_de ?? '',
            wordFrGender: sense?.word_fr_gender ?? '',
            wordFrPlural: sense?.word_fr_plural ?? '',
            wordDeGender: sense?.word_de_gender ?? '',
            wordDePlural: sense?.word_de_plural ?? '',
            examples: Array.isArray(sense?.examples)
              ? sense.examples.map((example: any) => ({
                  src: example?.src ?? '',
                  fr: example?.fr ?? '',
                  de: example?.de ?? ''
                }))
              : []
          }))
        };
      },
      error: err => {
        const message = err?.error?.message || err?.error || 'Erreur lors de la requête OpenAI.';
        this.aiError = typeof message === 'string' ? message : 'Erreur lors de la requête OpenAI.';
        this.aiLoading = false;
      },
      complete: () => {
        this.aiLoading = false;
      }
    });
  }

  integrateAiResult(): void {
    if (!this.aiResult || !this.entry) {
      return;
    }
    const payload = {
      wordLangueTypeId: this.entry.wordData.wordLangueTypeId,
      senses: this.aiResult.sens.map(sense => ({
        source: sense.sensSrc,
        translationFr: sense.sensFr,
        translationDe: sense.sensDe,
        wordFr: sense.wordFr ?? '',
        wordFrGender: sense.wordFrGender ?? '',
        wordFrPlural: sense.wordFrPlural ?? '',
        wordDe: sense.wordDe ?? '',
        wordDeGender: sense.wordDeGender ?? '',
        wordDePlural: sense.wordDePlural ?? '',
        examples: (sense.examples ?? []).map(example => ({
          source: example.src,
          translationFr: example.fr,
          translationDe: example.de
        }))
      }))
    };

    this.aiIntegrating = true;
    this.aiIntegrateError = null;
    this.#http.post(`${this.#baseUrl}ai/word/integrate`, payload).subscribe({
      next: () => {
        this.aiResult = null;
        this.refreshEntry();
      },
      error: err => {
        const message = err?.error?.message || err?.error || 'Erreur lors de l’intégration.';
        this.aiIntegrateError = typeof message === 'string' ? message : 'Erreur lors de l’intégration.';
        this.aiIntegrating = false;
      },
      complete: () => {
        this.aiIntegrating = false;
      }
    });
  }

  openSenseDialog(entry: DictionaryEntry): void {
    const dialogRef = this.#dialog.open(WordSenseDialogComponent, {
      width: '1200px',
      maxWidth: '95vw',
      data: {
        word: entry.wordData
      }
    });
    dialogRef.afterClosed().subscribe(() => {
      this.refreshEntry();
    });
  }

  openTranslationDialog(entry: DictionaryEntry): void {
    if (!this.motherTongueId) {
      return;
    }
    const langue = this.getLangueById(this.motherTongueId);
    if (!langue) {
      return;
    }
    const translationValues = this.extractTranslationValues(entry.wordData, langue.id);
    const dialogRef = this.#dialog.open(WordTranslationEditDialogComponent, {
      width: '75vw',
      minWidth: '800px',
      autoFocus: false,
      restoreFocus: false,
      data: {
        parentWord: entry.wordData,
        langue,
        languages: [langue],
        translations: translationValues,
        typeId: entry.wordData.type?.id ?? null,
        sourceLangueName: this.selectedLangueName(),
        sourceLangueIso: this.selectedLangueIso()
      }
    });
    dialogRef.afterClosed().subscribe(updated => {
      if (updated) {
        this.refreshEntry();
      }
    });
  }

  private applyUiLanguage(lang: string): void {
    const normalized = (lang || 'en').toLowerCase();
    this.currentUiLang = this.uiTextByLang[normalized] ? normalized : 'en';
  }

  private loadWord(wordLangueTypeId: number): void {
    const stateWord = history?.state?.word as Word | undefined;
    if (stateWord?.wordLangueTypeId === wordLangueTypeId) {
      this.#wordData = stateWord;
      this.refreshEntry();
      return;
    }

    this.loading = true;
    this.notFound = false;
    this.aiResult = null;
    this.aiError = null;
    this.#http
      .get<Word>(`${this.#baseUrl}word/${wordLangueTypeId}`)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: word => {
          this.#wordData = word;
          this.refreshEntry();
        },
        error: () => {
          this.loading = false;
          this.notFound = true;
          this.entry = null;
        }
      });
  }

  private refreshEntry(): void {
    if (!this.#wordData) {
      return;
    }
    this.loading = true;
    this.notFound = false;
    this.buildEntry(this.#wordData, this.motherTongueId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(entry => {
        this.entry = entry;
        this.loading = false;
      });
  }

  private buildEntry(word: Word, motherTongueId?: number) {
    const typeLabel = word.type?.name ?? '';
    const genderLabel = word.gender?.name ?? undefined;
    const wordLabel = (word.name ?? word.displayName ?? '').trim();
    const senses$ = this.#senseService.getSenses(word.wordLangueTypeId).pipe(
      switchMap(senses => {
        const ordered = [...senses].sort(
          (a, b) => (a.pos ?? 0) - (b.pos ?? 0) || a.id - b.id
        );
        if (!ordered.length) {
          return of([] as SenseEntry[]);
        }
        return forkJoin(ordered.map(sense => this.buildSense(sense.id, sense.content, motherTongueId)));
      })
    );
    const translations$ = this.loadWordTranslations(word, motherTongueId);
    const fallbackTranslations = this.extractTranslationNames(word.translations, motherTongueId);
    return forkJoin({ senses: senses$, translations: translations$ }).pipe(
      map(({ senses, translations }) => ({
        word: wordLabel,
        wordData: word,
        type: typeLabel,
        gender: genderLabel,
        translations,
        categories: word.categories ?? [],
        senses
      })),
      catchError(() =>
        of({
          word: wordLabel,
          wordData: word,
          type: typeLabel,
          gender: genderLabel,
          translations: fallbackTranslations,
          categories: word.categories ?? [],
          senses: []
        })
      )
    );
  }

  private buildSense(senseId: number, content: string, motherTongueId?: number) {
    const wordTranslationLangueId = motherTongueId ?? this.targetLangueId;
    const wordTranslations$ = wordTranslationLangueId
      ? this.#senseService.getSenseWordTranslations(senseId, wordTranslationLangueId).pipe(
          map(list =>
            Array.isArray(list)
              ? list
                  .map(item => (item?.content ?? '').trim())
                  .filter(value => !!value)
                  .filter((value, index, self) => self.indexOf(value) === index)
              : []
          ),
          catchError(() => of([] as string[]))
        )
      : of([] as string[]);

    const translation$ = motherTongueId
      ? this.#senseService.getSenseTranslations(senseId).pipe(
          map(list => list.find(item => item.langueId === motherTongueId)?.content ?? ''),
          catchError(() => of(''))
        )
      : of('');

    const examples$ = this.#senseService.getSenseExamples(senseId).pipe(
      switchMap(examples => {
        const ordered = [...examples].sort(
          (a, b) => (a.pos ?? 0) - (b.pos ?? 0) || a.id - b.id
        );
        if (!ordered.length) {
          return of([] as { source: string; translation: string }[]);
        }
        if (!motherTongueId) {
          return of(ordered.map(example => ({ source: example.content, translation: '' })));
        }
        const translations$ = ordered.map(example =>
          this.#senseService.getSenseExampleTranslations(example.id).pipe(
            map(list => list.find(item => item.langueId === motherTongueId)?.content ?? ''),
            catchError(() => of(''))
          )
        );
        return forkJoin(translations$).pipe(
          map(translations =>
            ordered.map((example, index) => ({
              source: example.content,
              translation: translations[index] ?? ''
            }))
          )
        );
      }),
      catchError(() => of([] as { source: string; translation: string }[]))
    );

    return forkJoin({ translation: translation$, examples: examples$, wordTranslations: wordTranslations$ }).pipe(
      map(result => ({
        label: content,
        translation: result.translation,
        wordTranslations: result.wordTranslations,
        examples: result.examples
      }))
    );
  }

  private loadWordTranslations(word: Word, motherTongueId?: number) {
    if (!motherTongueId) {
      return of([] as string[]);
    }
    const url = `${this.#baseUrl}word/${word.wordLangueTypeId}/translations/${motherTongueId}`;
    return this.#http.get<WordGridTranslation[]>(url).pipe(
      map(payload => {
        const normalized = Array.isArray(payload) ? payload : [];
        return normalized
          .filter(item => item?.langueId === motherTongueId)
          .map(item => (item?.name ?? '').trim())
          .filter(name => !!name)
          .filter((name, index, self) => self.indexOf(name) === index);
      }),
      catchError(() => of(this.extractTranslationNames(word.translations, motherTongueId)))
    );
  }

  private extractTranslationNames(translations: Word['translations'], langueId?: number): string[] {
    if (!translations || langueId == null) {
      return [];
    }
    const bucket = this.normalizeTranslationBucket(translations, langueId);
    return bucket
      .map(value => value.name)
      .filter(name => !!name)
      .filter((name, index, self) => self.indexOf(name) === index);
  }

  private selectedLangueName(): string {
    const selectedId = this.#securityStore.langueSelected();
    const langue = this.getLangueById(selectedId ?? undefined);
    return langue?.name ?? '';
  }

  private selectedLangueIso(): string {
    const selectedId = this.#securityStore.langueSelected();
    const langue = this.getLangueById(selectedId ?? undefined);
    return langue?.iso ?? '';
  }

  private getLangueById(id?: number): Langue | undefined {
    if (id == null) {
      return undefined;
    }
    const langues = this.#dataStore.langues();
    return langues?.find(langue => langue.id === id);
  }

  private extractTranslationValues(word: Word, langueId: number): WordTranslationValue[] {
    return this.normalizeTranslationBucket(word.translations, langueId);
  }

  private normalizeTranslationBucket(translations: Word['translations'], langueId: number): WordTranslationValue[] {
    if (!translations) {
      return [];
    }
    if (Array.isArray(translations)) {
      for (const entry of translations) {
        if (Array.isArray(entry) && entry.length >= 2) {
          const key = Number(entry[0]);
          if (!Number.isNaN(key) && key === langueId) {
            return this.normalizeTranslationValues(entry[1]);
          }
        }
      }
      return [];
    }
    const byNumber = translations as Record<number, WordTranslationValue[]>;
    if (byNumber[langueId] !== undefined) {
      return this.normalizeTranslationValues(byNumber[langueId]);
    }
    const byString = translations as Record<string, WordTranslationValue[]>;
    return this.normalizeTranslationValues(byString[String(langueId)]);
  }

  private normalizeTranslationValues(bucket: unknown): WordTranslationValue[] {
    if (!bucket) {
      return [];
    }
    if (Array.isArray(bucket)) {
      return bucket
        .map(value => this.normalizeTranslationValue(value))
        .filter((value): value is WordTranslationValue => !!value);
    }
    const single = this.normalizeTranslationValue(bucket);
    return single ? [single] : [];
  }

  private normalizeTranslationValue(value: unknown): WordTranslationValue | undefined {
    if (value == null) {
      return undefined;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      const maybe = value as Partial<WordTranslationValue>;
      return {
        name: typeof maybe.name === 'string' ? maybe.name : '',
        genderId: typeof maybe.genderId === 'number' ? maybe.genderId : null,
        wordLangueTypeId: typeof maybe.wordLangueTypeId === 'number' ? maybe.wordLangueTypeId : null,
        langueId: typeof maybe.langueId === 'number' ? maybe.langueId : null,
        typeId: typeof maybe.typeId === 'number' ? maybe.typeId : null,
        plural: typeof maybe.plural === 'string' ? maybe.plural : '',
        commentaire: typeof maybe.commentaire === 'string' ? maybe.commentaire : '',
        baseWordLangueTypeId:
          typeof maybe.baseWordLangueTypeId === 'number' ? maybe.baseWordLangueTypeId : null,
        targetWordLangueTypeId:
          typeof (maybe as { targetWordLangueTypeId?: unknown }).targetWordLangueTypeId === 'number'
            ? (maybe as { targetWordLangueTypeId: number }).targetWordLangueTypeId
            : typeof maybe.wordLangueTypeId === 'number'
            ? maybe.wordLangueTypeId
            : null,
        meaningIndex: typeof maybe.meaningIndex === 'number' ? maybe.meaningIndex : null
      };
    }
    return {
      name: String(value),
      genderId: null,
      wordLangueTypeId: null,
      langueId: null,
      typeId: null,
      plural: '',
      commentaire: '',
      baseWordLangueTypeId: null,
      targetWordLangueTypeId: null,
      meaningIndex: null
    };
  }
}
