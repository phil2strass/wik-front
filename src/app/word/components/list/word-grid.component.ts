import { Component, computed, effect, inject, ViewChild, OnDestroy, signal } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { DataStore } from '@shared/data/data-store';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Word, WordTranslationValue } from '../../models/word.model';
import { WordDeleteDialog } from '../word-delete.component';
import { WordGridStore } from '../../word-grid-store';
import { WordEditDialog } from '../word-edit-dialog.component';
import { WordNewDialog } from '../word-new-dialog.component';
import { IconModule } from '@root/app/icon/icon.module';
import { MaterialModule } from '@root/app/material.module';
import { CommonModule } from '@angular/common';
import { SelectionModel } from '@angular/cdk/collections';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { WordDeleteSelectedDialogComponent } from '../word-delete-selected-dialog.component';
import { Gender, Langue } from '@shared/data/models/langue.model';
import { Type } from '@shared/data/models/type.model';
import { SecurityStore } from '@shared/security/security-store';
import { WordTranslationEditDialogComponent } from '../word-translation-view-dialog/word-translation-view-dialog.component';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { Subject, Subscription, timer } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, switchMap, takeWhile } from 'rxjs/operators';
import { MatChipSelectionChange } from '@angular/material/chips';
import { ExpressionDialogComponent } from '../expression-dialog/expression-dialog.component';
import { ExpressionTranslationDialogComponent } from '../expression-dialog/expression-translation-dialog.component';
import { WordSenseDialogComponent } from '../word-sense-dialog/word-sense-dialog.component';
import { HttpClient } from '@angular/common/http';
import { Configuration } from '@shared/config/configuration';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { CHAT_GPT_BATCH_COUNT, CHAT_GPT_BATCH_SIZE } from '@shared/config/ai-config';
import { CategoryAssignDialogComponent } from '../category-assign-dialog.component';

@Component({
    selector: 'app-word-list',
    templateUrl: './word-grid.component.html',
    styleUrls: ['./word-grid.component.scss'],
    imports: [MaterialModule, CommonModule, IconModule, TranslateModule]
})
export class WordGridComponent implements OnDestroy {
    readonly #dataStore = inject(DataStore);
    protected readonly types = this.#dataStore.types;
    protected readonly langues = this.#dataStore.langues;

    readonly #wordGridStore = inject(WordGridStore);
    protected readonly status = this.#wordGridStore.status;
    protected readonly data = this.#wordGridStore.data;
    protected readonly pageIndex = this.#wordGridStore.pageIndex;
    protected readonly pageSize = this.#wordGridStore.pageSize;
    protected readonly resultsLength = this.#wordGridStore.resultsLength;
    protected readonly typeFilter = this.#wordGridStore.typeFilter;
    protected readonly searchTerm = this.#wordGridStore.searchTerm;
    protected readonly totalPages = computed(() => {
        const size = this.pageSize();
        const total = this.resultsLength();
        if (!size || size <= 0) {
            return 1;
        }
        return Math.max(1, Math.ceil(total / size));
    });

    readonly #securityStore = inject(SecurityStore);
    readonly #http = inject(HttpClient);
    readonly #config = inject(Configuration);
    readonly #messages = inject(MessageService);
    readonly #router = inject(Router);
    protected readonly profil = this.#securityStore.loadedProfil;
    protected readonly langueSelectedId = this.#securityStore.langueSelected;
    protected readonly selectedLangueName = computed(() => {
        const selectedId = this.langueSelectedId();
        const langues = this.langues() ?? [];
        return langues.find(langue => langue.id === selectedId)?.name ?? '';
    });
    protected readonly selectedLangueIso = computed(() => {
        const selectedId = this.langueSelectedId();
        const langues = this.langues() ?? [];
        return langues.find(langue => langue.id === selectedId)?.iso ?? '';
    });
    translationLanguages: Langue[] = [];
    readonly #aiLoading = signal(false);
    protected readonly aiLoading = this.#aiLoading;
    readonly #aiJobStatus = signal<{
        status: string;
        batches: number;
        completedBatches: number;
        jobId: string;
        errors?: any[];
        importErrors?: any[];
    } | null>(null);
    protected readonly aiJobStatus = this.#aiJobStatus;
    protected readonly aiJobFirstError = computed(() => this.#aiJobStatus()?.errors?.[0] ?? null);
    protected readonly aiJobFirstImportError = computed(() => this.#aiJobStatus()?.importErrors?.[0] ?? null);

    readonly dialog = inject(MatDialog);
    readonly #translate = inject(TranslateService);
    readonly #paginatorIntl = inject(MatPaginatorIntl);
    #langChangeSub?: Subscription;
    #aiJobPollSub?: Subscription;
    #filterSub?: Subscription;
    #filterInput$ = new Subject<string>();
    #categoryToggleLoading = new Set<string>();

    displayedColumns: string[] = ['select', 'name', 'actions'];

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    selection = new SelectionModel<Word>(true, []);

    constructor() {
        effect(() => {
            const profil = this.profil();
            const langues = this.langues() ?? [];
            const selectedId = this.langueSelectedId();
            const typeFilterValue = this.typeFilter();
            const rows = this.data();
            const orderedLangueIds: number[] = [];
            const pushLangue = (langueId?: number | null) => {
                if (langueId == null) return;
                if (langueId === selectedId) return;
                if (orderedLangueIds.includes(langueId)) return;
                orderedLangueIds.push(langueId);
            };

            pushLangue(profil?.langueMaternelle);
            profil?.langues?.forEach(id => pushLangue(id));
            if (Array.isArray(rows)) {
                rows.forEach(row => this.collectTranslationLangues(row.translations, pushLangue));
            }

            this.translationLanguages = orderedLangueIds.map(id => langues.find(langue => langue.id === id)).filter((lang): lang is Langue => !!lang);

            const dynamicColumns: string[] = [];
            if (typeFilterValue == null) {
                dynamicColumns.push('type');
            }
            dynamicColumns.push('category');
            dynamicColumns.push(...this.translationLanguages.map(lang => this.translationColumnId(lang.id)));
            this.displayedColumns = ['select', 'name', ...dynamicColumns, 'actions'];
            this.updatePaginatorLabels();
        });

        this.#langChangeSub = this.#translate.onLangChange.subscribe(() => this.updatePaginatorLabels());
        this.#filterSub = this.#filterInput$
            .pipe(debounceTime(250), distinctUntilChanged())
            .subscribe(term => this.#wordGridStore.setSearchTerm(term));
    }

    private collectTranslationLangues(translations: Word['translations'], pushLangue: (langueId?: number | null) => void): void {
        if (!translations) {
            return;
        }
        if (Array.isArray(translations)) {
            translations.forEach(entry => {
                if (Array.isArray(entry) && entry.length >= 2) {
                    const key = Number(entry[0]);
                    if (!Number.isNaN(key)) {
                        const bucket = this.normalizeTranslationBucket(entry[1]);
                        if (bucket.length > 0) {
                            pushLangue(key);
                        }
                    }
                }
            });
        } else if (typeof translations === 'object') {
            Object.entries(translations).forEach(([key, value]) => {
                const numericKey = Number(key);
                if (!Number.isNaN(numericKey)) {
                    const bucket = this.normalizeTranslationBucket(value);
                    if (bucket.length > 0) {
                        pushLangue(numericKey);
                    }
                }
            });
        }
    }

    private updatePaginatorLabels() {
        this.#translate
            .get([
                'common.paginator.itemsPerPage',
                'common.paginator.firstPage',
                'common.paginator.lastPage',
                'common.paginator.nextPage',
                'common.paginator.previousPage'
            ])
            .subscribe(labels => {
                this.#paginatorIntl.itemsPerPageLabel = labels['common.paginator.itemsPerPage'];
                this.#paginatorIntl.firstPageLabel = labels['common.paginator.firstPage'];
                this.#paginatorIntl.lastPageLabel = labels['common.paginator.lastPage'];
                this.#paginatorIntl.nextPageLabel = labels['common.paginator.nextPage'];
                this.#paginatorIntl.previousPageLabel = labels['common.paginator.previousPage'];
                this.#paginatorIntl.changes.next();
            });
    }

    ngOnDestroy(): void {
        this.#langChangeSub?.unsubscribe();
        this.#aiJobPollSub?.unsubscribe();
        this.#filterSub?.unsubscribe();
    }

    ngAfterViewInit(): void {
        this.sort.sortChange.subscribe(sort => {
            this.#wordGridStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
            this.paginator.pageIndex = 0;
        });
        this.paginator.page.subscribe(pageEvent => {
            this.#wordGridStore.setPage(pageEvent.pageIndex, pageEvent.pageSize);
        });
        this.#wordGridStore.load();
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.#filterInput$.next(filterValue);
    }

    onTypeFilterChange(typeId: number | null) {
        this.#wordGridStore.setTypeFilter(typeId ?? null);
    }

    jumpToPage(rawValue: string): void {
        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed)) {
            return;
        }
        const target = Math.min(Math.max(Math.floor(parsed), 1), this.totalPages());
        const index = target - 1;
        this.paginator.pageIndex = index;
        this.#wordGridStore.setPage(index, this.paginator.pageSize);
    }

    triggerChatGpt(): void {
        const typeId = this.typeFilter();
        const langueId = this.langueSelectedId();
        if (!typeId || !langueId) {
            this.#messages.error("Type ou langue manquant");
            return;
        }
        const batchSize = CHAT_GPT_BATCH_SIZE;
        const batchCount = CHAT_GPT_BATCH_COUNT;
        const count = batchSize * batchCount;
        const params = new URLSearchParams({
            langueId: `${langueId}`,
            typeId: `${typeId}`,
            count: `${count}`,
            batchSize: `${batchSize}`,
            batchCount: `${batchCount}`,
            import: 'true'
        });
        this.#aiLoading.set(true);
        this.#http.post<any>(`${this.#config.baseUrl}ai/sens/generate-missing-async?${params.toString()}`, null).subscribe({
            next: res => {
                const jobId = res?.jobId ?? '';
                const batches = res?.batches ?? 0;
                this.#messages.info(`ChatGPT lancé (${batches} lots)${jobId ? `, job ${jobId}` : ''}`);
                if (jobId) {
                    this.startJobPolling(jobId);
                }
            },
            error: err => {
                this.#messages.error(err?.error ?? "Erreur lors de l'appel ChatGPT");
            },
            complete: () => this.#aiLoading.set(false)
        });
    }

    private startJobPolling(jobId: string): void {
        this.#aiJobPollSub?.unsubscribe();
        this.#aiJobStatus.set({ status: 'PENDING', batches: 0, completedBatches: 0, jobId });
        this.#aiJobPollSub = timer(0, 2000)
            .pipe(
                switchMap(() => this.#http.get<any>(`${this.#config.baseUrl}ai/sens/jobs/${jobId}`)),
                takeWhile(res => res?.status !== 'DONE' && res?.status !== 'FAILED', true)
            )
            .subscribe({
                next: res => {
                    this.#aiJobStatus.set({
                        status: res?.status ?? 'UNKNOWN',
                        batches: res?.batches ?? 0,
                        completedBatches: res?.completedBatches ?? 0,
                        jobId,
                        errors: Array.isArray(res?.errors) ? res.errors : [],
                        importErrors: Array.isArray(res?.importResult?.errors) ? res.importResult.errors : []
                    });
                    if (res?.status === 'DONE') {
                        const errorCount = Array.isArray(res?.errors) ? res.errors.length : 0;
                        const importErrorCount = Array.isArray(res?.importResult?.errors) ? res.importResult.errors.length : 0;
                        if (errorCount > 0 || importErrorCount > 0) {
                            this.#messages.error(`ChatGPT terminé avec ${errorCount + importErrorCount} erreur(s)`);
                        } else {
                            this.#messages.info(`ChatGPT terminé (${res?.items ?? 0} mots)`);
                        }
                        this.#aiJobPollSub?.unsubscribe();
                    } else if (res?.status === 'FAILED') {
                        this.#messages.error(res?.error ?? 'ChatGPT échoué');
                        this.#aiJobPollSub?.unsubscribe();
                    }
                },
                error: () => {
                    this.#messages.error("Erreur lors du suivi ChatGPT");
                    this.#aiJobPollSub?.unsubscribe();
                }
            });
    }

    typeLabel(type: Type | { id?: number; name?: string } | null | undefined): string {
        if (!type || !type.id) {
            return type?.name ?? '';
        }
        const key = `word.type.${type.id}`;
        const translated = this.#translate.instant(key);
        return translated && translated !== key ? translated : type.name ?? '';
    }

    typesLabel(row: Word): string {
        if (row.types && row.types.trim().length > 0) {
            return row.types
                .split(',')
                .map(part => part.trim())
                .filter(part => part.length > 0)
                .join(', ');
        }
        return this.typeLabel(row.type) || '-';
    }

    hasCategory(row: Word, categoryId: number): boolean {
        return Array.isArray(row.categories) && row.categories.some(category => category.id === categoryId);
    }

    isCategoryToggleLoading(wordLangueTypeId: number, categoryId: number): boolean {
        return this.#categoryToggleLoading.has(`${wordLangueTypeId}:${categoryId}`);
    }

    onCategoryToggle(row: Word, categoryId: number, event: MatChipSelectionChange): void {
        if (!event.isUserInput) {
            return;
        }
        const selected = event.selected;
        const key = `${row.wordLangueTypeId}:${categoryId}`;
        if (this.#categoryToggleLoading.has(key)) {
            event.source.selected = !selected;
            return;
        }
        this.#categoryToggleLoading.add(key);
        this.#http
            .post<void>(`${this.#config.baseUrl}word/${row.wordLangueTypeId}/categories/toggle`, {
                categorieId: categoryId,
                active: selected
            })
            .pipe(finalize(() => this.#categoryToggleLoading.delete(key)))
            .subscribe({
                next: () => this.updateRowCategories(row, categoryId, selected),
                error: err => {
                    event.source.selected = !selected;
                    this.#messages.error(err?.error ?? 'Erreur lors de la mise à jour des catégories');
                }
            });
    }

    private updateRowCategories(row: Word, categoryId: number, active: boolean): void {
        const current = Array.isArray(row.categories) ? [...row.categories] : [];
        if (active) {
            if (!current.some(category => category.id === categoryId)) {
                current.push({ id: categoryId, name: '8 ans' });
            }
        } else {
            const next = current.filter(category => category.id !== categoryId);
            row.categories = next;
            return;
        }
        row.categories = current;
    }

    translationColumnId(langueId: number): string {
        return `translation-${langueId}`;
    }

    langHeaderLabel(lang: Langue): string {
        const iso = lang.iso?.trim().toLowerCase();
        if (iso) {
            const key = `lang.${iso}`;
            const translated = this.#translate.instant(key);
            if (translated && translated !== key) {
                return translated;
            }
        }
        return lang.name;
    }

    openExpressions(row: Word): void {
        const baseConfig = {
            width: '1000px',
            maxWidth: '1000px',
            autoFocus: false,
            restoreFocus: false
        } as const;
        this.dialog.open(ExpressionDialogComponent, {
            ...baseConfig,
            data: { wordLangueTypeId: row.wordLangueTypeId, wordLabel: this.formatDisplayName(row) }
        });
    }

    openSenses(row: Word): void {
        this.dialog.open(WordSenseDialogComponent, {
            width: '1000px',
            maxWidth: '1100px',
            autoFocus: false,
            restoreFocus: false,
            data: { word: row }
        });
    }

    openView(row: Word): void {
        const urlTree = this.#router.createUrlTree(['/word/view', row.wordLangueTypeId]);
        const url = this.#router.serializeUrl(urlTree);
        window.open(url, '_blank');
    }

    openExpressionTranslationDialog(row: Word, langue: Langue): void {
        const baseConfig = {
            width: '1000px',
            maxWidth: '1000px',
            autoFocus: false,
            restoreFocus: false
        } as const;
        this.dialog.open(ExpressionTranslationDialogComponent, {
            ...baseConfig,
            data: { wordLangueTypeId: row.wordLangueTypeId, wordLabel: this.formatDisplayName(row), langue }
        });
    }

    formatDisplayName(row: Word): string {
        const langue = this.getLangueById(row.langue);
        const baseName = row.name ?? row.displayName ?? '';
        return this.formatLocalizedValue(baseName, langue, row.gender, row.type?.id);
    }

    formatTranslationValue(row: Word, langue: Langue): string | undefined {
        const values = this.filterTranslationValues(this.extractTranslationValues(row, langue.id), row.type?.id ?? null);
        if (!values.length) {
            return undefined;
        }
        const formatted = values
            .map(value => {
                const gender = value.genderId != null ? ({ id: value.genderId, name: '' } as Gender) : undefined;
                return this.formatLocalizedValue(value.name, langue, gender, value.typeId ?? undefined);
            })
            .filter(value => !!value);
        return formatted.length ? formatted.join(', ') : undefined;
    }

    private filterTranslationValues(values: WordTranslationValue[], typeId: number | null): WordTranslationValue[] {
        if (!typeId) {
            return values;
        }
        return values.filter(value => value.typeId === typeId);
    }

    private extractTranslationValues(row: Word, langueId: number): WordTranslationValue[] {
        const translations = row.translations;
        if (!translations) {
            return [];
        }
        if (Array.isArray(translations)) {
            for (const entry of translations) {
                if (Array.isArray(entry) && entry.length >= 2) {
                    const key = Number(entry[0]);
                    if (!Number.isNaN(key) && key === langueId) {
                        return this.normalizeTranslationBucket(entry[1]);
                    }
                }
            }
            return [];
        }
        const byNumber = translations as Record<number, WordTranslationValue[]>;
        if (byNumber[langueId] !== undefined) {
            return this.normalizeTranslationBucket(byNumber[langueId]);
        }
        const byString = translations as Record<string, WordTranslationValue[]>;
        return this.normalizeTranslationBucket(byString[String(langueId)]);
    }

    private normalizeTranslationBucket(bucket: unknown): WordTranslationValue[] {
        if (bucket == null) {
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
                    typeof (maybe as any).targetWordLangueTypeId === 'number'
                        ? (maybe as any).targetWordLangueTypeId
                        : typeof (maybe as any).wordLangueTypeId === 'number'
                        ? (maybe as any).wordLangueTypeId
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

    openTranslationPicker(word: Word): void {
        if (!this.translationLanguages.length) {
            return;
        }
        const initialLang = this.translationLanguages[0];
        this.openTranslationDialogRef(word, initialLang, this.extractTranslationValues(word, initialLang.id), this.translationLanguages);
    }

    private openTranslationDialogRef(
        row: Word,
        langue: Langue,
        translationValues: WordTranslationValue[],
        languages?: Langue[]
    ): MatDialogRef<WordTranslationEditDialogComponent> {
        const ref = this.dialog.open(WordTranslationEditDialogComponent, {
            width: '75vw',
            minWidth: '800px',
            autoFocus: false,
            restoreFocus: false,
            data: {
                parentWord: row,
                langue,
                languages,
                translations: translationValues,
                typeId: row.type?.id ?? null,
                sourceLangueName: this.selectedLangueName(),
                sourceLangueIso: this.selectedLangueIso()
            }
        });
        ref.afterClosed().subscribe(updated => {
            if (updated) {
                this.#wordGridStore.load();
            }
        });
        return ref;
    }

    private formatLocalizedValue(value: string, langue?: Langue, gender?: Gender, typeId?: number): string {
        let result = this.cleanGenderCode(value ?? '');
        if (!langue?.iso) {
            return result;
        }

        const article = this.resolveArticle(langue.iso, gender?.id);
        if (article) {
            result = `${article} ${result}`.trim();
        }

        if (langue.iso.trim().toUpperCase() === 'DE' && typeId === 1) {
            result = this.capitalizeLastWord(result);
        }
        return result;
    }

    private cleanGenderCode(value: string): string {
        return value
            .replace(/\s*\(\d+\)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private capitalizeLastWord(value: string): string {
        if (!value) return '';
        const parts = value.split(' ');
        const lastIndex = parts.length - 1;
        const word = parts[lastIndex];
        if (!word) return value;
        parts[lastIndex] = word.substring(0, 1).toUpperCase() + word.substring(1);
        return parts.join(' ');
    }

    private getLangueById(id?: number): Langue | undefined {
        if (id == null) {
            return undefined;
        }
        const langues = this.langues();
        return langues ? langues.find(langue => langue.id === id) : undefined;
    }

    formatTranslationMenuLabel(langue: Langue): string {
        const selected = this.selectedLangueName();
        if (selected) {
            return `${selected} -> ${langue.name}`;
        }
        return `Traduction ${langue.name}`;
    }

    openTranslationDialog(row: Word, langue: Langue): void {
        const translationValues = this.extractTranslationValues(row, langue.id);
        this.openTranslationDialogRef(row, langue, translationValues, this.translationLanguages);
    }

    private resolveArticle(iso: string, genderId?: number): string | null {
        if (!genderId) {
            return null;
        }
        const normalizedIso = iso.trim().toUpperCase();
        if (normalizedIso === 'DE') {
            switch (genderId) {
                case 1:
                    return 'der';
                case 2:
                    return 'die';
                case 3:
                    return 'das';
                default:
                    return null;
            }
        }
        if (normalizedIso === 'FR') {
            switch (genderId) {
                case 1:
                    return 'le';
                case 2:
                    return 'la';
                default:
                    return null;
            }
        }
        return null;
    }

    openEdit(word: Word) {
        const dialogRef = this.dialog.open(WordEditDialog, {
            data: word,
            width: '800px'
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result !== undefined) {
                this.#wordGridStore.load();
            }
        });
    }

    openDelete(word: Word) {
        const dialogRef = this.dialog.open(WordDeleteDialog, {
            data: word,
            position: {
                top: '25vh'
            }
        });

        dialogRef.afterClosed().subscribe(wordId => {
            if (wordId !== undefined) {
                this.#wordGridStore.delete(wordId);
            }
        });
    }

    /** The label for the checkbox on the passed row */
    checkboxLabel(row?: Word): string {
        if (!row) {
            return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
        }
        return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.wordLangueTypeId}`;
    }

    /** Whether the number of selected elements matches the total number of rows. */
    isAllSelected(): any {
        const numSelected = this.selection.selected.length;
        const numRows = this.data().length;
        return numSelected === numRows;
    }

    /** Selects all rows if they are not all selected; otherwise clear selection. */
    masterToggle(): void {
        this.isAllSelected() ? this.selection.clear() : this.data().forEach(row => this.selection.select(row));
    }

    openCreate() {
        const dialogRef = this.dialog.open(WordNewDialog, {
            width: '800px'
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.#wordGridStore.load();
            }
        });
    }

    deleteSelected(): void {
        const selectedWords = [...this.selection.selected];
        if (selectedWords.length === 0) {
            return;
        }

        const dialogRef = this.dialog.open(WordDeleteSelectedDialogComponent, {
            data: { count: selectedWords.length },
            width: '420px'
        });

        dialogRef.afterClosed().subscribe(confirm => {
            if (confirm) {
                const ids = selectedWords.map(word => word.wordLangueTypeId);
                this.#wordGridStore.deleteMany(ids);
                this.selection.clear();
            }
        });
    }

    openCategoryAssignDialog(): void {
        const selectedWords = [...this.selection.selected];
        if (selectedWords.length === 0) {
            return;
        }
        const dialogRef = this.dialog.open(CategoryAssignDialogComponent, {
            width: '480px'
        });
        dialogRef.afterClosed().subscribe((categorieIds: number[] | undefined) => {
            if (!categorieIds?.length) {
                return;
            }
            const wordLangueTypeIds = selectedWords.map(word => word.wordLangueTypeId);
            this.#http
                .post<void>(`${this.#config.baseUrl}word/bulk-categories`, {
                    wordLangueTypeIds,
                    categorieIds
                })
                .subscribe({
                    next: () => {
                        this.#messages.info('Catégories ajoutées');
                        this.selection.clear();
                        this.#wordGridStore.load();
                    },
                    error: err => {
                        this.#messages.error(err?.error ?? 'Erreur lors de la mise à jour des catégories');
                    }
                });
        });
    }
}
