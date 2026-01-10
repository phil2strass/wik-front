import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { DataStore } from '@shared/data/data-store';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { Word } from '../../models/word.model';
import { WordSense } from '../../models/sense.model';
import { SenseService } from '../../services/sense.service';
import { ExampleAddDialogComponent, ExampleAddDialogResult } from '../example-dialog/example-add-dialog.component';
import { ExampleDeleteDialogComponent } from '../example-dialog/example-delete-dialog.component';
import { SenseEntryDialogComponent, SenseEntryDialogResult } from './sense-entry-dialog.component';
import { Langue } from '@shared/data/models/langue.model';
import { WordTranslationDeleteConfirmDialogComponent } from '../word-translation-delete-confirm-dialog.component';

export type WordSenseDialogData = {
    word: Word;
};

type SenseState = {
    form: FormGroup;
    examples: FormArray<FormGroup>;
    loadingExamples: boolean;
};

@Component({
    selector: 'app-word-sense-dialog',
    standalone: true,
    templateUrl: './word-sense-dialog.component.html',
    styleUrls: ['./word-sense-dialog.component.scss'],
    imports: [
        CommonModule,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatProgressBarModule,
        MatTooltipModule,
        ReactiveFormsModule,
        TranslateModule
    ]
})
export class WordSenseDialogComponent {
    #fb = inject(FormBuilder);
    #senseService = inject(SenseService);
    #messageService = inject(MessageService);
    #translate = inject(TranslateService);
    #dataStore = inject(DataStore);
    #dialog = inject(MatDialog);

    senses: SenseState[] = [];
    loading = false;
    saving = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: WordSenseDialogData,
        private dialogRef: MatDialogRef<WordSenseDialogComponent>
    ) {
        this.loadSenses();
    }

    get busy(): boolean {
        return this.loading || this.saving;
    }

    get wordLabel(): string {
        const langue = this.wordLangue();
        const iso = langue?.iso ?? '';
        return this.formatLocalizedWord(this.data.word, iso);
    }

    addSense(): void {
        if (this.busy) {
            return;
        }
        const dialogRef = this.#dialog.open(SenseEntryDialogComponent, {
            width: '520px',
            data: {
                titleKey: 'word.senses.addTitle',
                confirmKey: 'word.senses.add'
            }
        });
        dialogRef.afterClosed().subscribe((result?: SenseEntryDialogResult) => {
            if (!result) {
                return;
            }
            const pos = this.nextSensePos();
            const content = (result.content ?? '').toString();
            this.saving = true;
            this.#senseService
                .createSense(this.data.word.wordLangueTypeId, content, pos)
                .pipe(finalize(() => (this.saving = false)))
                .subscribe({
                    next: saved => {
                        const state = this.createSenseState(saved);
                        this.senses = [...this.senses, state].sort((a, b) => {
                            const posA = this.extractNumber(a.form.get('pos')?.value) ?? 0;
                            const posB = this.extractNumber(b.form.get('pos')?.value) ?? 0;
                            if (posA !== posB) {
                                return posA - posB;
                            }
                            const idA = this.extractNumber(a.form.get('id')?.value) ?? 0;
                            const idB = this.extractNumber(b.form.get('id')?.value) ?? 0;
                            return idA - idB;
                        });
                        this.loadExamples(state);
                        this.#messageService.info(this.#translate.instant('word.senses.saved'));
                    },
                    error: err => {
                        this.#messageService.error(err?.error ?? this.#translate.instant('word.senses.errors.save'));
                    }
                });
        });
    }

    openEditSenseDialog(state: SenseState): void {
        if (this.busy) {
            return;
        }
        const initialValue = (state.form.get('content')?.value ?? '').toString();
        const dialogRef = this.#dialog.open(SenseEntryDialogComponent, {
            width: '520px',
            data: {
                titleKey: 'word.senses.editTitle',
                confirmKey: 'word.senses.save',
                initialValue
            }
        });
        dialogRef.afterClosed().subscribe((result?: SenseEntryDialogResult) => {
            if (!result) {
                return;
            }
            const content = (result.content ?? '').toString();
            const pos = Number(state.form.get('pos')?.value ?? 1);
            const senseId = this.extractNumber(state.form.get('id')?.value);
            if (!senseId) {
                return;
            }
            this.saving = true;
            this.#senseService
                .updateSense(senseId, content, pos)
                .pipe(finalize(() => (this.saving = false)))
                .subscribe({
                    next: saved => {
                        state.form.patchValue({
                            id: saved.id,
                            content: saved.content ?? '',
                            pos: saved.pos ?? pos
                        });
                        this.#messageService.info(this.#translate.instant('word.senses.saved'));
                    },
                    error: err => {
                        this.#messageService.error(err?.error ?? this.#translate.instant('word.senses.errors.save'));
                    }
                });
        });
    }

    openAddExampleDialog(state: SenseState): void {
        if (this.busy) {
            return;
        }
        const senseId = this.extractNumber(state.form.get('id')?.value);
        if (!senseId) {
            this.#messageService.error(this.#translate.instant('word.senses.errors.missing'));
            return;
        }
        const dialogRef = this.#dialog.open(ExampleAddDialogComponent, {
            width: '520px'
        });
        dialogRef.afterClosed().subscribe((result?: ExampleAddDialogResult) => {
            if (!result?.content) {
                return;
            }
            this.saving = true;
            this.#senseService
                .createSenseExample(senseId, result.content)
                .pipe(finalize(() => (this.saving = false)))
                .subscribe({
                    next: example => {
                        state.examples.push(
                            this.#fb.group({
                                id: [example.id],
                                content: [example.content ?? '', [Validators.required, Validators.maxLength(500)]],
                                pos: [example.pos ?? 1]
                            })
                        );
                        this.#messageService.info(this.#translate.instant('word.examples.saved'));
                    },
                    error: err => {
                        this.#messageService.error(err?.error ?? this.#translate.instant('word.examples.errors.save'));
                    }
                });
        });
    }

    openEditExampleDialog(state: SenseState, index: number): void {
        if (this.busy) {
            return;
        }
        const group = state.examples.at(index);
        if (!group) {
            return;
        }
        const initialValue = (group.get('content')?.value ?? '').toString();
        const dialogRef = this.#dialog.open(ExampleAddDialogComponent, {
            width: '520px',
            data: {
                titleKey: 'word.examples.editTitle',
                confirmKey: 'word.examples.save',
                initialValue
            }
        });
        dialogRef.afterClosed().subscribe((result?: ExampleAddDialogResult) => {
            if (!result) {
                return;
            }
            const content = (result.content ?? '').toString();
            const pos = Number(group.get('pos')?.value ?? 1);
            const exampleId = this.extractNumber(group.get('id')?.value);
            if (!exampleId) {
                return;
            }
            this.saving = true;
            this.#senseService
                .updateSenseExample(exampleId, content, pos)
                .pipe(finalize(() => (this.saving = false)))
                .subscribe({
                    next: saved => {
                        group.patchValue({
                            id: saved.id,
                            content: saved.content ?? '',
                            pos: saved.pos ?? pos
                        });
                        this.#messageService.info(this.#translate.instant('word.examples.saved'));
                    },
                    error: err => {
                        this.#messageService.error(err?.error ?? this.#translate.instant('word.examples.errors.save'));
                    }
                });
        });
    }

    confirmDeleteSense(state: SenseState): void {
        if (this.busy) {
            return;
        }
        const senseId = this.extractNumber(state.form.get('id')?.value);
        if (!senseId) {
            return;
        }
        const title = this.#translate.instant('word.senses.deleteTitle');
        const message = this.#translate.instant('word.senses.deleteConfirm');
        const dialogRef = this.#dialog.open(WordTranslationDeleteConfirmDialogComponent, {
            width: '420px',
            data: {
                title,
                message,
                confirmLabel: this.#translate.instant('word.senses.delete')
            }
        });
        dialogRef.afterClosed().subscribe(confirm => {
            if (!confirm) {
                return;
            }
            this.saving = true;
            this.#senseService
                .deleteSense(senseId)
                .pipe(finalize(() => (this.saving = false)))
                .subscribe({
                    next: () => {
                        this.senses = this.senses.filter(item => item !== state);
                        this.#messageService.info(this.#translate.instant('word.senses.deleted'));
                    },
                    error: err => {
                        this.#messageService.error(err?.error ?? this.#translate.instant('word.senses.errors.delete'));
                    }
                });
        });
    }

    confirmDeleteExample(state: SenseState, index: number): void {
        if (this.busy) {
            return;
        }
        const group = state.examples.at(index);
        if (!group) {
            return;
        }
        const exampleId = this.extractNumber(group.get('id')?.value);
        if (!exampleId) {
            return;
        }
        const dialogRef = this.#dialog.open(ExampleDeleteDialogComponent, {
            width: '420px',
            data: { content: group.get('content')?.value ?? '' }
        });
        dialogRef.afterClosed().subscribe(confirm => {
            if (!confirm) {
                return;
            }
            this.saving = true;
            this.#senseService
                .deleteSenseExample(exampleId)
                .pipe(finalize(() => (this.saving = false)))
                .subscribe({
                    next: () => {
                        state.examples.removeAt(index);
                        this.#messageService.info(this.#translate.instant('word.examples.deleted'));
                    },
                    error: err => {
                        this.#messageService.error(err?.error ?? this.#translate.instant('word.examples.errors.delete'));
                    }
                });
        });
    }

    senseLabel(state: SenseState, index: number): string {
        const content = (state.form.get('content')?.value ?? '').toString().trim();
        if (content.length > 0) {
            return content;
        }
        return this.#translate.instant('word.senses.fallback', { index: index + 1 });
    }

    senseDisplay(state: SenseState, index: number): string {
        const content = (state.form.get('content')?.value ?? '').toString().trim();
        if (content.length > 0) {
            return content;
        }
        return this.#translate.instant('word.senses.fallback', { index: index + 1 });
    }

    trackSense = (_: number, state: SenseState) => this.extractNumber(state.form.get('id')?.value) ?? state.form;

    close(): void {
        this.dialogRef.close();
    }

    private loadSenses(): void {
        this.loading = true;
        this.senses = [];
        this.#senseService
            .getSenses(this.data.word.wordLangueTypeId)
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: senses => {
                    const sorted = [...senses].sort((a, b) => {
                        const posA = a.pos ?? 0;
                        const posB = b.pos ?? 0;
                        if (posA !== posB) {
                            return posA - posB;
                        }
                        return (a.id ?? 0) - (b.id ?? 0);
                    });
                    this.senses = sorted.map(sense => this.createSenseState(sense));
                    this.senses.forEach(state => this.loadExamples(state));
                },
                error: err => {
                    this.#messageService.error(err?.error ?? this.#translate.instant('word.senses.errors.load'));
                }
            });
    }

    private loadExamples(state: SenseState): void {
        const senseId = this.extractNumber(state.form.get('id')?.value);
        if (!senseId) {
            return;
        }
        state.loadingExamples = true;
        state.examples.clear();
        this.#senseService
            .getSenseExamples(senseId)
            .pipe(finalize(() => (state.loadingExamples = false)))
            .subscribe({
                next: examples => {
                    examples.forEach(example =>
                        state.examples.push(
                            this.#fb.group({
                                id: [example.id],
                                content: [example.content ?? '', [Validators.required, Validators.maxLength(500)]],
                                pos: [example.pos ?? 1]
                            })
                        )
                    );
                },
                error: err => {
                    this.#messageService.error(err?.error ?? this.#translate.instant('word.examples.errors.load'));
                }
            });
    }

    private createSenseState(sense: WordSense): SenseState {
        return {
            form: this.#fb.group({
                id: [sense.id],
                content: [sense.content ?? '', [Validators.maxLength(500)]],
                pos: [sense.pos ?? 1],
                wordLangueTypeId: [sense.wordLangueTypeId]
            }),
            examples: this.#fb.array<FormGroup>([]),
            loadingExamples: false
        };
    }

    private nextSensePos(): number {
        const values = this.senses
            .map(state => this.extractNumber(state.form.get('pos')?.value))
            .filter((value): value is number => value != null);
        const max = values.length ? Math.max(...values) : 0;
        return max + 1;
    }

    private extractNumber(value: unknown): number | null {
        if (typeof value === 'number') {
            return value;
        }
        if (value != null) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
    }

    private wordLangue(): Langue | undefined {
        const langues = this.#dataStore.langues();
        return langues?.find(langue => langue.id === this.data.word.langue);
    }

    private formatLocalizedWord(word: Word, iso?: string | null): string {
        const value = word.name || '';
        const cleaned = this.cleanGenderCode(value.trim());
        const article = this.computeArticle(iso, word.gender?.id);
        const withArticle = article ? `${article} ${cleaned}`.trim() : cleaned;
        if (iso?.trim().toUpperCase() === 'DE' && word.type?.id === 1) {
            return this.capitalizeLastWord(withArticle);
        }
        return withArticle;
    }

    private cleanGenderCode(value: string): string {
        return value
            .replace(/\s*\(\d+\)/g, '')
            .replace(/\s*\([^)]+\)/g, '')
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

    private computeArticle(iso?: string | null, genderId?: number | null): string | null {
        if (!iso || !genderId) {
            return null;
        }
        const normalizedIso = iso.trim().toUpperCase();
        if (normalizedIso === 'FR') {
            switch (genderId) {
                case 1:
                    return 'le';
                case 2:
                    return 'la';
                case 3:
                    return 'les';
                default:
                    return null;
            }
        }
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
        return null;
    }
}
