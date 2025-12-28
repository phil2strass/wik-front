import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
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
import { finalize } from 'rxjs/operators';
import { Langue } from '@shared/data/models/langue.model';

export type ExampleTranslationDialogData = {
    wordLangueTypeId: number;
    wordLabel: string;
    langue: Langue;
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

    translationsForm: FormArray<FormGroup> = this.#fb.array<FormGroup>([]);
    loading = false;
    langLabel = '';
    editing: Set<number> = new Set<number>();

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: ExampleTranslationDialogData,
        private dialogRef: MatDialogRef<ExampleTranslationDialogComponent>
    ) {
        this.langLabel = this.computeLangLabel(data.langue);
        this.loadTranslations();
    }

    get forms(): FormArray<FormGroup> {
        return this.translationsForm;
    }

    loadTranslations(): void {
        this.loading = true;
        this.forms.clear();
        this.#exampleService
            .getExampleTranslations(this.data.wordLangueTypeId, this.data.langue.id)
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: translations => {
                    translations.forEach(translation => this.forms.push(this.buildGroup(translation)));
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
            exampleContent: [translation.exampleContent],
            content: [translation.content ?? '', [Validators.required, Validators.maxLength(500)]]
        });
    }

    private computeLangLabel(langue?: Langue): string {
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
        if (!group) {
            return;
        }
        const exampleId = group.get('exampleId')?.value;
        if (!exampleId) {
            return;
        }
        this.loading = true;
        this.#exampleService
            .deleteExampleTranslation(exampleId, this.data.langue.id)
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
        this.loadTranslations();
    }

    saveAll(): void {
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
                langueId: this.data.langue.id,
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
            .saveExampleTranslations(this.data.wordLangueTypeId, this.data.langue.id, payload)
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
}
