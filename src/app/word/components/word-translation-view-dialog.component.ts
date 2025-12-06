import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { Configuration } from '../../shared/config/configuration';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { Word, WordTranslationValue } from '../models/word.model';
import { Langue } from '@shared/data/models/langue.model';
import { WordFormComponent } from './word-form.component';

type WordTranslationEditDialogData = {
    parentWord: Word;
    langue: Langue;
    translation?: WordTranslationValue | undefined;
    typeId: number | null;
};

@Component({
    selector: 'app-word-translation-edit-dialog',
    template: `
        <h2 mat-dialog-title>Traduction {{ data.langue.name }}</h2>
        <mat-dialog-content class="word-translation-dialog__content">
            <app-word-form
                [form]="form"
                mode="update"
                [useCard]="false"
                [disableTypeSelection]="true"
                [showTypeField]="false"
                [showPlural]="true"
                [genderOptional]="!requiresGenderField"
                [handleSubmit]="false"
                [gendersOverride]="data.langue.genders"></app-word-form>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button type="button" (click)="onCancel()" [disabled]="loading">Annuler</button>
            <button mat-flat-button color="primary" (click)="save()" [disabled]="loading || form.invalid">
                Enregistrer
            </button>
        </mat-dialog-actions>
    `,
    standalone: true,
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatButtonModule,
        WordFormComponent
    ],
    styles: [
        `
            .word-translation-dialog__content {
                min-width: 480px;
            }
        `
    ]
})
export class WordTranslationEditDialogComponent {
    form: FormGroup;
    loading = false;
    requiresGenderField: boolean;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: WordTranslationEditDialogData,
        private dialogRef: MatDialogRef<WordTranslationEditDialogComponent>,
        private fb: FormBuilder,
        private http: HttpClient,
        private configuration: Configuration,
        private messageService: MessageService
    ) {
        const translation = data.translation;
        this.requiresGenderField = this.shouldRequireGender(data.langue, translation, data.typeId);
        this.form = this.fb.group({
            wordTypeId: [translation?.wordTypeId ?? null, Validators.required],
            name: [translation?.name ?? '', Validators.required],
            plural: [translation?.plural ?? ''],
            langueId: [data.langue.id, Validators.required],
            typeId: [translation?.typeId ?? data.typeId ?? null, Validators.required],
            genderId: [translation?.genderId ?? null, this.requiresGenderField ? Validators.required : []]
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.loading = true;
        this.http.put(`${this.configuration.baseUrl}word`, this.form.getRawValue()).subscribe({
            next: () => {
                this.messageService.info('Traduction enregistrée');
                this.dialogRef.close(true);
            },
            error: err => {
                this.messageService.error(err?.error ?? 'Erreur lors de la sauvegarde');
            },
            complete: () => {
                this.loading = false;
            }
        });
    }

    private shouldRequireGender(langue: Langue, translation?: WordTranslationValue, fallbackTypeId?: number | null): boolean {
        const iso = langue.iso?.trim().toUpperCase();
        const isGenderedLanguage = iso === 'FR' || iso === 'DE';
        if (!isGenderedLanguage) {
            return false;
        }
        const typeId = translation?.typeId ?? fallbackTypeId;
        return typeId === 1;
    }
}
