import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconModule } from '@root/app/icon/icon.module';
import { ExampleService } from '../../services/example.service';
import { WordExampleTranslation } from '../../models/example.model';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs/operators';
import { Langue } from '@shared/data/models/langue.model';
import { ExampleDeleteDialogComponent } from './example-delete-dialog.component';

export type ExampleTranslationDialogData = {
    wordLangueTypeId: number;
    wordLabel: string;
    langue?: Langue;
    languages?: Langue[];
};

@Component({
    selector: 'app-example-translation-dialog',
    standalone: true,
    templateUrl: './example-translation-dialog.component.html',
    styleUrls: ['./example-dialog.component.scss', './example-translation-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatSelectModule,
        ReactiveFormsModule,
        TranslateModule,
        IconModule
    ]
})
export class ExampleTranslationDialogComponent {
    #fb = inject(FormBuilder);
    #exampleService = inject(ExampleService);
    #messageService = inject(MessageService);
    #translate = inject(TranslateService);
    #dialog = inject(MatDialog);

    translationsForm: FormArray<FormGroup> = this.#fb.array<FormGroup>([]);
    newExampleControl = this.#fb.control('', [Validators.required, Validators.maxLength(500)]);
    loading = false;
    langLabel = '';
    editing: Set<number> = new Set<number>();
    exampleEditingIndex: number | null = null;
    exampleOriginalContent = '';
    currentLangue: Langue | null = null;
    availableLangues: Langue[] = [];

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: ExampleTranslationDialogData,
        private dialogRef: MatDialogRef<ExampleTranslationDialogComponent>
    ) {
        const providedLangues = data.languages && data.languages.length ? data.languages : [];
        this.availableLangues = [...providedLangues];
        if (data.langue && !this.availableLangues.find(lang => lang.id === data.langue?.id)) {
            this.availableLangues.push(data.langue);
        }
        const initialLangue = data.langue ?? this.availableLangues[0] ?? null;
        this.setLangue(initialLangue);
    }

    get forms(): FormArray<FormGroup> {
        return this.translationsForm;
    }

    private setLangue(langue: Langue | null): void {
        this.currentLangue = langue;
        this.langLabel = this.computeLangLabel(langue ?? undefined);
        this.loadTranslations();
    }

    loadTranslations(): void {
        if (!this.currentLangue) {
            this.forms.clear();
            this.editing.clear();
            this.exampleEditingIndex = null;
            return;
        }
        this.loading = true;
        this.forms.clear();
        this.editing.clear();
        this.#exampleService
            .getExampleTranslations(this.data.wordLangueTypeId, this.currentLangue.id)
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: translations => {
                    translations.forEach(translation => this.forms.push(this.buildGroup(translation)));
                    this.exampleEditingIndex = null;
                    this.exampleOriginalContent = '';
                },
                error: err => {
                    this.#messageService.error(err?.error ?? 'Erreur lors du chargement des traductions');
                }
            });
    }

    private buildGroup(translation: WordExampleTranslation): FormGroup {
        return this.#fb.group({
            translationId: [translation.translationId ?? null],
            exampleId: [translation.exampleId],
            exampleContent: [translation.exampleContent, [Validators.required, Validators.maxLength(500)]],
            content: [translation.content ?? '', [Validators.required, Validators.maxLength(500)]]
        });
    }

    computeLangLabel(langue?: Langue): string {
        if (!langue) {
            return '';
        }
        const iso = langue.iso?.trim().toLowerCase();
        if (iso) {
            const key = `lang.${iso}`;
            const translated = this.#translate.instant(key);
            if (translated && translated !== key) {
                return translated;
            }
        }
        return langue.name ?? '';
    }

    isEditing(index: number): boolean {
        return this.editing.has(index);
    }

    enableEditing(index: number): void {
        this.editing.add(index);
    }

    hasEditing(): boolean {
        return this.editing.size > 0;
    }

    hasTranslation(index: number): boolean {
        const group = this.forms.at(index);
        const content = (group?.get('content')?.value ?? '').toString().trim();
        return !!content;
    }

    deleteTranslation(index: number): void {
        const group = this.forms.at(index);
        const langueId = this.currentLangue?.id;
        if (!group || !langueId) {
            return;
        }
        const exampleId = group.get('exampleId')?.value;
        if (!exampleId) {
            return;
        }
        this.loading = true;
        this.#exampleService
            .deleteExampleTranslation(exampleId, langueId)
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: () => {
                    group.patchValue({ translationId: null, content: '' });
                    this.editing.delete(index);
                    this.#messageService.info(this.#translate.instant('word.examples.translation.deleted'));
                },
                error: err => {
                    this.#messageService.error(err?.error ?? 'Erreur lors de la suppression');
                }
            });
    }

    cancel(): void {
        if (!this.hasEditing()) {
            this.dialogRef.close();
            return;
        }
        this.editing.clear();
        this.exampleEditingIndex = null;
        this.exampleOriginalContent = '';
        this.loadTranslations();
    }

    saveAll(): void {
        const langueId = this.currentLangue?.id;
        if (!langueId) {
            return;
        }
        const payload: WordExampleTranslation[] = [];
        this.forms.controls.forEach((group, index) => {
            if (!this.isEditing(index)) {
                return;
            }
            if (group.invalid) {
                group.markAllAsTouched();
                return;
            }
            const content = (group.get('content')?.value ?? '').toString().trim();
            if (!content) {
                return;
            }
            payload.push({
                translationId: group.get('translationId')?.value,
                exampleId: group.get('exampleId')?.value,
                wordLangueTypeId: this.data.wordLangueTypeId,
                langueId,
                content,
                exampleContent: group.get('exampleContent')?.value
            });
        });
        if (!payload.length) {
            this.cancel();
            return;
        }
        this.loading = true;
        this.#exampleService
            .saveExampleTranslations(this.data.wordLangueTypeId, langueId, payload)
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: saved => {
                    saved.forEach(savedItem => {
                        const idx = this.forms.controls.findIndex(ctrl => ctrl.get('exampleId')?.value === savedItem.exampleId);
                        if (idx >= 0) {
                            this.forms.at(idx).patchValue({
                                translationId: savedItem.translationId ?? savedItem.translationId,
                                content: savedItem.content ?? ''
                            });
                            this.editing.delete(idx);
                        }
                    });
                    this.#messageService.info(this.#translate.instant('word.examples.translation.saved'));
                    this.editing.clear();
                },
                error: err => {
                    this.#messageService.error(err?.error ?? 'Erreur lors de la sauvegarde');
                }
            });
    }

    changeLangue(langueId: number): void {
        if (!this.availableLangues?.length) {
            return;
        }
        const next = this.availableLangues.find(lang => lang.id === langueId);
        if (next && next.id !== this.currentLangue?.id) {
            this.setLangue(next);
        }
    }

    resetNewExample(): void {
        this.newExampleControl.reset('');
        this.newExampleControl.markAsPristine();
        this.newExampleControl.markAsUntouched();
    }

    addExample(): void {
        const content = (this.newExampleControl.value ?? '').toString().trim();
        if (!content) {
            this.newExampleControl.markAsTouched();
            this.#messageService.error(this.#translate.instant('word.examples.errors.required'));
            return;
        }
        this.loading = true;
        this.#exampleService
            .createExample(this.data.wordLangueTypeId, content)
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: () => {
                    this.resetNewExample();
                    this.loadTranslations();
                    this.#messageService.info(this.#translate.instant('word.examples.save'));
                },
                error: err => {
                    this.#messageService.error(err?.error ?? 'Erreur lors de la sauvegarde');
                }
            });
    }

    startExampleEdit(index: number): void {
        const group = this.forms.at(index);
        if (!group) {
            return;
        }
        this.exampleEditingIndex = index;
        this.exampleOriginalContent = (group.get('exampleContent')?.value ?? '').toString();
    }

    cancelExampleEdit(): void {
        if (this.exampleEditingIndex === null) {
            return;
        }
        const idx = this.exampleEditingIndex;
        const group = this.forms.at(idx);
        group?.get('exampleContent')?.setValue(this.exampleOriginalContent);
        group?.get('exampleContent')?.markAsPristine();
        group?.get('exampleContent')?.markAsUntouched();
        this.exampleEditingIndex = null;
        this.exampleOriginalContent = '';
    }

    saveExample(): void {
        if (this.exampleEditingIndex === null) {
            return;
        }
        const idx = this.exampleEditingIndex;
        const group = this.forms.at(idx);
        if (!group) {
            return;
        }
        const contentControl = group.get('exampleContent');
        if (!contentControl) {
            return;
        }
        if (contentControl.invalid) {
            contentControl.markAllAsTouched();
            return;
        }
        const exampleId = group.get('exampleId')?.value;
        const content = (contentControl.value ?? '').toString().trim();
        if (!exampleId || !content) {
            return;
        }
        this.loading = true;
        this.#exampleService
            .updateExample(exampleId, content)
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: () => {
                    this.exampleEditingIndex = null;
                    this.exampleOriginalContent = '';
                    this.#messageService.info(this.#translate.instant('word.examples.save'));
                },
                error: err => {
                    this.#messageService.error(err?.error ?? 'Erreur lors de la sauvegarde');
                }
            });
    }

    deleteExample(index: number): void {
        const group = this.forms.at(index);
        if (!group || this.loading) {
            return;
        }
        const id = group.get('exampleId')?.value;
        if (!id) {
            return;
        }
        const dialogRef = this.#dialog.open(ExampleDeleteDialogComponent, {
            width: '420px',
            data: { content: group.get('exampleContent')?.value ?? '' }
        });

        dialogRef.afterClosed().subscribe(confirm => {
            if (!confirm) {
                return;
            }
            this.loading = true;
            this.#exampleService
                .deleteExample(id)
                .pipe(finalize(() => (this.loading = false)))
                .subscribe({
                    next: () => {
                        this.forms.removeAt(index);
                        if (this.exampleEditingIndex === index) {
                            this.exampleEditingIndex = null;
                            this.exampleOriginalContent = '';
                        }
                        this.editing.delete(index);
                        this.#messageService.info('Exemple supprimé');
                    },
                    error: err => {
                        this.#messageService.error(err?.error ?? 'Erreur lors de la suppression');
                    }
                });
        });
    }
}
