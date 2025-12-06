import { Component, effect, inject, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { DataStore } from '@shared/data/data-store';
import { MatDialog } from '@angular/material/dialog';
import { Word } from '../../models/word.model';
import { WordDeleteDialog } from '../word-delete.component';
import { WordGridStore } from '../../word-grid-store';
import { WordEditDialog } from '../word-edit-dialog.component';
import { WordNewDialog } from '../word-new-dialog.component';
import { IconModule } from '@root/app/icon/icon.module';
import { MaterialModule } from '@root/app/material.module';
import { CommonModule } from '@angular/common';
import { SelectionModel } from '@angular/cdk/collections';
import { TranslateModule } from '@ngx-translate/core';
import { WordDeleteSelectedDialogComponent } from '../word-delete-selected-dialog.component';
import { Gender, Langue } from '@shared/data/models/langue.model';
import { SecurityStore } from '@shared/security/security-store';

@Component({
    selector: 'app-word-list',
    templateUrl: './word-grid.component.html',
    styleUrls: ['./word-grid.component.scss'],
    imports: [MaterialModule, CommonModule, IconModule, TranslateModule]
})
export class WordGridComponent {
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
    translationLanguages: Langue[] = [];

    readonly dialog = inject(MatDialog);

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
        });
    }

    private collectTranslationLangues(translations: Word['translations'], pushLangue: (langueId?: number | null) => void): void {
        if (!translations) {
            return;
        }
        if (Array.isArray(translations)) {
            translations.forEach(entry => {
                if (Array.isArray(entry) && entry.length >= 1) {
                    const key = Number(entry[0]);
                    if (!Number.isNaN(key)) {
                        pushLangue(key);
                    }
                }
            });
        } else if (typeof translations === 'object') {
            Object.keys(translations).forEach(key => {
                const numericKey = Number(key);
                if (!Number.isNaN(numericKey)) {
                    pushLangue(numericKey);
                }
            });
        }
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

    formatDisplayName(row: Word): string {
        const langue = this.getLangueById(row.langue);
        const baseName = row.name ?? row.displayName ?? '';
        return this.formatLocalizedValue(baseName, langue, row.gender);
    }

    formatTranslationValue(row: Word, langue: Langue): string | undefined {
        const value = this.extractTranslationValue(row, langue.id);
        if (!value) {
            return undefined;
        }
        return this.formatLocalizedValue(value, langue);
    }

    private extractTranslationValue(row: Word, langueId: number): string | undefined {
        const translations = row.translations;
        if (!translations) {
            return undefined;
        }
        if (Array.isArray(translations)) {
            for (const entry of translations) {
                if (Array.isArray(entry) && entry.length >= 2) {
                    const key = Number(entry[0]);
                    if (!Number.isNaN(key) && key === langueId) {
                        return String(entry[1]);
                    }
                }
            }
            return undefined;
        }
        const byNumber = translations as Record<number, string>;
        if (byNumber[langueId] !== undefined) {
            return byNumber[langueId];
        }
        const byString = translations as Record<string, string>;
        return byString[String(langueId)];
    }

    private formatLocalizedValue(value: string, langue?: Langue, gender?: Gender): string {
        let result = this.cleanGenderCode(value ?? '');
        if (!langue?.iso) {
            return result;
        }

        const article = this.resolveArticle(langue.iso, gender?.id);
        if (article) {
            result = `${article} ${result}`.trim();
        }

        if (langue.iso.trim().toUpperCase() === 'DE') {
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
