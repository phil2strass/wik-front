import { Component, DestroyRef, ViewEncapsulation, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Configuration } from '@shared/config/configuration';
import { SecurityStore } from '@shared/security/security-store';
import { DataStore } from '@shared/data/data-store';
import { Langue } from '@shared/data/models/langue.model';
import { Categorie } from '../../word/models/categorie.model';
import { Word, WordTranslationValue } from '../../word/models/word.model';
import { SenseService } from '../../word/services/sense.service';
import { MaterialModule } from '../../material.module';
import { WordSenseDialogComponent } from '../../word/components/word-sense-dialog/word-sense-dialog.component';
import { WordTranslationEditDialogComponent } from '../../word/components/word-translation-view-dialog/word-translation-view-dialog.component';

type SenseEntry = {
  label: string;
  translation: string;
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
  previous: string;
  next: string;
  page: string;
  of: string;
  totalWords: string;
  examplesLabel: string;
};

@Component({
    selector: 'app-starter',
    imports: [CommonModule, FormsModule, MaterialModule],
    templateUrl: './starter.component.html',
    styleUrl: './starter.component.scss',
    encapsulation: ViewEncapsulation.None
})
export class StarterComponent {
  readonly #translate = inject(TranslateService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #http = inject(HttpClient);
  readonly #baseUrl = inject(Configuration).baseUrl;
  readonly #securityStore = inject(SecurityStore);
  readonly #dataStore = inject(DataStore);
  readonly #senseService = inject(SenseService);
  readonly #dialog = inject(MatDialog);
  readonly pageSize = 5;
  readonly types = this.#dataStore.types;
  readonly uiTextByLang: Record<string, DictionaryUiText> = {
    fr: {
      eyebrow: 'Dictionnaire personnel',
      title: 'Lecture par pages',
      subtitle: '5 mots par page avec types, genres, traductions, sens et exemples traduits.',
      previous: 'Page précédente',
      next: 'Page suivante',
      page: 'Page',
      of: 'sur',
      totalWords: 'mots au total',
      examplesLabel: 'Exemples',
    },
    en: {
      eyebrow: 'Personal dictionary',
      title: 'Paged reading',
      subtitle: '5 words per page with types, genders, translations, senses, and translated examples.',
      previous: 'Previous page',
      next: 'Next page',
      page: 'Page',
      of: 'of',
      totalWords: 'total words',
      examplesLabel: 'Examples',
    },
    es: {
      eyebrow: 'Diccionario personal',
      title: 'Lectura por paginas',
      subtitle: '5 palabras por pagina con tipos, generos, traducciones, sentidos y ejemplos traducidos.',
      previous: 'Pagina anterior',
      next: 'Pagina siguiente',
      page: 'Pagina',
      of: 'de',
      totalWords: 'palabras en total',
      examplesLabel: 'Ejemplos',
    },
    de: {
      eyebrow: 'Persoenliches Woerterbuch',
      title: 'Lesen nach Seiten',
      subtitle: '5 Woerter pro Seite mit Wortart, Genus, Uebersetzungen, Bedeutungen und Beispielen.',
      previous: 'Vorherige Seite',
      next: 'Naechste Seite',
      page: 'Seite',
      of: 'von',
      totalWords: 'Woerter gesamt',
      examplesLabel: 'Beispiele',
    },
  };

  currentPage = 1;
  pageInput = 1;
  currentUiLang = 'en';
  totalCount = 0;
  entries: DictionaryEntry[] = [];
  typeFilter: number | null = null;
  targetLangueId?: number;
  motherTongueId?: number;
  loading = false;
  #loadSeq = 0;

  get totalPages(): number {
    const safeTotal = Number.isFinite(this.totalCount) ? this.totalCount : this.entries.length;
    return Math.max(1, Math.ceil(safeTotal / this.pageSize));
  }

  get pagedEntries(): DictionaryEntry[] {
    return this.entries;
  }

  get uiText(): DictionaryUiText {
    return this.uiTextByLang[this.currentUiLang] ?? this.uiTextByLang['en'];
  }

  constructor() {
    const initialLang = this.#translate.currentLang || this.#translate.defaultLang || 'en';
    this.applyUiLanguage(initialLang);
    this.#translate.onLangChange
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(event => this.applyUiLanguage(event.lang));

    effect(() => {
      const langueId = this.#securityStore.langueSelected();
      const motherTongueId = this.#securityStore.loadedProfil()?.langueMaternelle ?? undefined;
      if (langueId !== this.targetLangueId || motherTongueId !== this.motherTongueId) {
        this.targetLangueId = langueId;
        this.motherTongueId = motherTongueId;
        this.goToPage(1);
      }
    });
  }

  goToPage(page: number): void {
    const normalized = Math.min(Math.max(Math.floor(page || 1), 1), this.totalPages);
    this.currentPage = normalized;
    this.pageInput = normalized;
    this.loadPage();
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  onTypeFilterChange(typeId: number | null): void {
    this.typeFilter = typeId ?? null;
    this.goToPage(1);
  }

  private applyUiLanguage(lang: string): void {
    const normalized = (lang || 'en').toLowerCase();
    this.currentUiLang = this.uiTextByLang[normalized] ? normalized : 'en';
  }

  private loadPage(): void {
    if (!this.targetLangueId) {
      return;
    }
    const currentSeq = ++this.#loadSeq;
    this.loading = true;
    let params = new HttpParams()
      .set('langueId', this.targetLangueId.toString())
      .set('page', String(this.currentPage - 1))
      .set('size', String(this.pageSize))
      .set('sort', 'name,asc');
    if (this.typeFilter != null) {
      params = params.set('typeId', this.typeFilter.toString());
    }

    this.#http
      .get<Word[]>(`${this.#baseUrl}word/search`, { params, observe: 'response' })
      .pipe(
        switchMap(response => {
          if (currentSeq !== this.#loadSeq) {
            return of({ entries: [], totalCount: this.totalCount });
          }
          const data = Array.isArray(response.body) ? response.body : [];
          const totalCountHeader = response.headers.get('X-Total-Count');
          const parsed = totalCountHeader ? Number(totalCountHeader) : NaN;
          const totalCount = Number.isFinite(parsed) ? parsed : data.length;
          return this.buildEntries(data, this.motherTongueId).pipe(
            map(entries => ({ entries, totalCount }))
          );
        }),
        catchError(() => of({ entries: [], totalCount: 0 }))
      )
      .subscribe(result => {
        if (currentSeq !== this.#loadSeq) {
          return;
        }
        this.entries = result.entries;
        this.totalCount = result.totalCount;
        this.loading = false;
        if (this.currentPage > this.totalPages) {
          this.goToPage(this.totalPages);
        }
      });
  }

  private buildEntries(words: Word[], motherTongueId?: number) {
    if (!words.length) {
      return of([] as DictionaryEntry[]);
    }
    const requests = words.map(word => this.buildEntry(word, motherTongueId));
    return forkJoin(requests).pipe(
      map(entries =>
        entries.sort((a, b) =>
          (a.word ?? '').localeCompare(b.word ?? '', undefined, { sensitivity: 'base' })
        )
      ),
      catchError(() => of([] as DictionaryEntry[]))
    );
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

  openSenseDialog(entry: DictionaryEntry): void {
    const dialogRef = this.#dialog.open(WordSenseDialogComponent, {
      width: '1200px',
      maxWidth: '95vw',
      data: {
        word: entry.wordData
      }
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadPage();
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
        this.loadPage();
      }
    });
  }

  categoryClass(index: number): string {
    const palette = ['category-chip--a', 'category-chip--b', 'category-chip--c', 'category-chip--d', 'category-chip--e'];
    return palette[index % palette.length];
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

  private buildSense(senseId: number, content: string, motherTongueId?: number) {
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

    return forkJoin({ translation: translation$, examples: examples$ }).pipe(
      map(result => ({
        label: content,
        translation: result.translation,
        examples: result.examples
      }))
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
