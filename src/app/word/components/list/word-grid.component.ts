import { Component, computed, effect, inject, ViewChild, OnDestroy } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { DataStore } from '@shared/data/data-store';
import { MatDialog } from '@angular/material/dialog';
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
import { WordDeleteSelectedDialogComponent } from '../word-delete-selected-dialog.component';
import { Gender, Langue } from '@shared/data/models/langue.model';
import { SecurityStore } from '@shared/security/security-store';
import { WordTranslationEditDialogComponent } from '../word-translation-view-dialog/word-translation-view-dialog.component';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { Subscription } from 'rxjs';
import { ExampleDialogComponent } from '../example-dialog/example-dialog.component';
import { ExampleTranslationDialogComponent } from '../example-dialog/example-translation-dialog.component';

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
    protected readonly pageSize = this.#wordGridStore.pageSize;
    protected readonly resultsLength = this.#wordGridStore.resultsLength;
    protected readonly typeFilter = this.#wordGridStore.typeFilter;

    readonly #securityStore = inject(SecurityStore);
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

    readonly dialog = inject(MatDialog);
    readonly #translate = inject(TranslateService);
    readonly #paginatorIntl = inject(MatPaginatorIntl);
    #langChangeSub?: Subscription;

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
            dynamicColumns.push(...this.translationLanguages.map(lang => this.translationColumnId(lang.id)));
            this.displayedColumns = ['select', 'name', ...dynamicColumns, 'actions'];
            this.updatePaginatorLabels();
        });

        this.#langChangeSub = this.#translate.onLangChange.subscribe(() => this.updatePaginatorLabels());
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
        //this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    onTypeFilterChange(typeId: number | null) {
        this.#wordGridStore.setTypeFilter(typeId ?? null);
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

    openExamples(row: Word, langue?: Langue): void {
        const baseConfig = {
            width: '1000px',
            maxWidth: '1000px',
            autoFocus: false,
            restoreFocus: false
        } as const;
        const dialogRef = langue
            ? this.dialog.open(ExampleTranslationDialogComponent, {
                  ...baseConfig,
                  data: { wordTypeId: row.wordTypeId, wordLabel: this.formatDisplayName(row), langue }
              })
            : this.dialog.open(ExampleDialogComponent, {
                  ...baseConfig,
                  data: { wordTypeId: row.wordTypeId, wordLabel: this.formatDisplayName(row) }
              });
        dialogRef.afterClosed().subscribe();
    }

    formatDisplayName(row: Word): string {
        const langue = this.getLangueById(row.langue);
        const baseName = row.name ?? row.displayName ?? '';
        return this.formatLocalizedValue(baseName, langue, row.gender, row.type?.id);
    }

    formatTranslationValue(row: Word, langue: Langue): string | undefined {
        const values = this.extractTranslationValues(row, langue.id);
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
                wordTypeId: typeof maybe.wordTypeId === 'number' ? maybe.wordTypeId : null,
                langueId: typeof maybe.langueId === 'number' ? maybe.langueId : null,
                typeId: typeof maybe.typeId === 'number' ? maybe.typeId : null,
                plural: typeof maybe.plural === 'string' ? maybe.plural : '',
                commentaire: typeof maybe.commentaire === 'string' ? maybe.commentaire : ''
            };
        }
        return {
            name: String(value),
            genderId: null,
            wordTypeId: null,
            langueId: null,
            typeId: null,
            plural: '',
            commentaire: ''
        };
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
        this.dialog
            .open(WordTranslationEditDialogComponent, {
                width: '75vw',
                minWidth: '800px',
                autoFocus: false,
                restoreFocus: false,
                data: {
                    parentWord: row,
                    langue,
                    translations: translationValues,
                    typeId: row.type?.id ?? null,
                    sourceLangueName: this.selectedLangueName(),
                    sourceLangueIso: this.selectedLangueIso()
                }
            })
            .afterClosed()
            .subscribe(updated => {
                if (updated) {
                    this.#wordGridStore.load();
                }
            });
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
        return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.wordTypeId}`;
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
                const ids = selectedWords.map(word => word.wordTypeId);
                this.#wordGridStore.deleteMany(ids);
                this.selection.clear();
            }
        });
    }
}
