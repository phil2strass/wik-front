import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { HttpClient } from '@angular/common/http';
import { Configuration } from '../../shared/config/configuration';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { Word, WordTranslationValue } from '../models/word.model';
import { Langue } from '@shared/data/models/langue.model';

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
        <mat-dialog-content>
            <form [formGroup]="form" class="word-translation-dialog__form">
                <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Mot</mat-label>
                    <input matInput formControlName="name" />
                    <mat-error *ngIf="form.get('name')?.hasError('required')">Champ obligatoire</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Pluriel</mat-label>
                    <input matInput formControlName="plural" />
                </mat-form-field>

                <div class="word-translation-dialog__genders" *ngIf="data.langue.genders?.length">
                    <div class="word-translation-dialog__label">Genre</div>
                    <mat-radio-group formControlName="genderId" class="d-flex flex-wrap gap-16">
                        <mat-radio-button *ngFor="let gender of data.langue.genders" [value]="gender.id">
                            {{ gender.name }}
                        </mat-radio-button>
                    </mat-radio-group>
                    <div class="mat-error word-form__gender-error" *ngIf="form.get('genderId')?.hasError('required')">
                        Veuillez sélectionner un genre.
                    </div>
                </div>
            </form>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button mat-dialog-close [disabled]="loading">Annuler</button>
            <button mat-flat-button color="primary" (click)="save()" [disabled]="loading || form.invalid">
                Enregistrer
            </button>
        </mat-dialog-actions>
    `,
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatRadioButton,
        MatRadioGroup
    ],
    styles: [
        `
            .word-translation-dialog__form {
                display: flex;
                flex-direction: column;
                gap: 16px;
                margin-top: 8px;
            }

            .word-translation-dialog__genders {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .word-translation-dialog__label {
                font-weight: 600;
            }
        `
    ]
})
export class WordTranslationEditDialogComponent {
    form: FormGroup;
    loading = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: WordTranslationEditDialogData,
        private dialogRef: MatDialogRef<WordTranslationEditDialogComponent>,
        private fb: FormBuilder,
        private http: HttpClient,
        private configuration: Configuration,
        private messageService: MessageService
    ) {
        const translation = data.translation;
        this.form = this.fb.group({
            wordTypeId: [translation?.wordTypeId ?? null, Validators.required],
            name: [translation?.name ?? '', Validators.required],
            plural: [translation?.plural ?? ''],
            langueId: [data.langue.id, Validators.required],
            typeId: [translation?.typeId ?? data.typeId ?? null, Validators.required],
            genderId: [
                translation?.genderId ??
                    (this.shouldRequireGender(data.langue) ? null : translation?.genderId ?? null),
                this.shouldRequireGender(data.langue) ? Validators.required : []
            ]
        });
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

    private shouldRequireGender(langue: Langue): boolean {
        const iso = langue.iso?.trim().toUpperCase();
        return iso === 'FR' || iso === 'DE';
    }
}
