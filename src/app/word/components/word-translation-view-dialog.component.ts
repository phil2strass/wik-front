import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { HttpClient } from '@angular/common/http';
import { Configuration } from '../../shared/config/configuration';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { Word, WordTranslationValue } from '../models/word.model';
import { Langue } from '@shared/data/models/langue.model';
import { WordFormComponent } from './word-form.component';
import { forkJoin, Observable } from 'rxjs';

type WordTranslationEditDialogData = {
    parentWord: Word;
    langue: Langue;
    translations?: WordTranslationValue[];
    typeId: number | null;
};

@Component({
    selector: 'app-word-translation-edit-dialog',
    template: `
        <h2 mat-dialog-title>Traductions {{ data.langue.name }}</h2>
        <mat-dialog-content class="word-translation-dialog__content">
            <div class="word-translation-dialog__sidebar">
                <div class="word-translation-dialog__sidebar-header">
                    <button mat-stroked-button type="button" (click)="addTranslation()">Ajouter</button>
                </div>
                <mat-nav-list>
                    <a
                        mat-list-item
                        *ngFor="let formGroup of translationForms; let index = index"
                        (click)="selectTranslation(index)"
                        [class.word-translation-dialog__item--active]="index === selectedIndex">
                        <div class="word-translation-dialog__item-title">
                            {{ formGroup.value.name?.trim() || 'Nouvelle traduction' }}
                        </div>
                    </a>
                </mat-nav-list>
            </div>
            <div class="word-translation-dialog__form" *ngIf="selectedForm as activeForm">
                <app-word-form
                    [form]="activeForm"
                    mode="update"
                    [useCard]="false"
                    [disableTypeSelection]="true"
                    [showTypeField]="false"
                    [showPlural]="true"
                    [genderOptional]="!requiresGenderField"
                    [showTitle]="false"
                    [showComment]="true"
                    [handleSubmit]="false"
                    [gendersOverride]="data.langue.genders"></app-word-form>
                <div class="word-translation-dialog__form-footer" *ngIf="translationForms.length > 1">
                    <button
                        mat-button
                        color="warn"
                        type="button"
                        class="word-translation-dialog__delete-btn"
                        (click)="deleteTranslation(selectedIndex, $event)"
                        [disabled]="loading">
                        Supprimer
                    </button>
                </div>
            </div>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button type="button" (click)="onCancel()" [disabled]="loading">Annuler</button>
            <button mat-flat-button color="primary" (click)="save()" [disabled]="loading || !selectedForm || selectedForm.invalid">
                Enregistrer
            </button>
        </mat-dialog-actions>
    `,
    standalone: true,
    imports: [CommonModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatButtonModule, MatListModule, WordFormComponent],
    styles: [
        `
            .word-translation-dialog__content {
                width: 100%;
                max-width: 900px;
                display: flex;
                gap: 24px;
            }

            .word-translation-dialog__sidebar {
                width: 240px;
                border-right: 1px solid rgba(0, 0, 0, 0.08);
                padding-right: 12px;
            }

            .word-translation-dialog__sidebar-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }

            .word-translation-dialog__form {
                flex: 1;
            }

            .word-translation-dialog__form-footer {
                display: flex;
                justify-content: flex-start;
                margin-top: 12px;
            }

            .word-translation-dialog__delete-btn {
                font-size: 0.85rem;
            }

            .word-translation-dialog__item-title {
                font-weight: 600;
            }

            .word-translation-dialog__item--active {
                background-color: rgba(25, 118, 210, 0.12);
            }

            mat-nav-list a[mat-list-item] {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
        `
    ]
})
export class WordTranslationEditDialogComponent {
    translationForms: FormGroup[] = [];
    selectedIndex = 0;
    loading = false;
    requiresGenderField: boolean;
    private pendingDeleteWordTypeIds: number[] = [];

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: WordTranslationEditDialogData,
        private dialogRef: MatDialogRef<WordTranslationEditDialogComponent>,
        private fb: FormBuilder,
        private http: HttpClient,
        private configuration: Configuration,
        private messageService: MessageService
    ) {
        const baseTypeId = data.typeId;
        this.requiresGenderField = this.shouldRequireGender(data.langue, baseTypeId);
        const translations = Array.isArray(data.translations) && data.translations.length ? data.translations : [undefined];
        this.translationForms = translations.map(translation => this.createTranslationForm(translation));
    }

    get selectedForm(): FormGroup | null {
        if (!this.translationForms.length) {
            return null;
        }
        return this.translationForms[this.selectedIndex] ?? null;
    }

    addTranslation(): void {
        const form = this.createTranslationForm(undefined);
        this.translationForms.push(form);
        this.selectedIndex = this.translationForms.length - 1;
    }

    selectTranslation(index: number): void {
        if (index >= 0 && index < this.translationForms.length) {
            this.selectedIndex = index;
        }
    }

    deleteTranslation(index: number, event: Event): void {
        event.stopPropagation();
        if (this.loading) {
            return;
        }
        const form = this.translationForms[index];
        if (!form) {
            return;
        }
        const wordTypeId = form.get('wordTypeId')?.value;
        if (wordTypeId) {
            this.pendingDeleteWordTypeIds.push(wordTypeId);
        }
        this.translationForms.splice(index, 1);
        if (this.translationForms.length === 0) {
            this.translationForms.push(this.createTranslationForm(undefined));
        }
        if (this.selectedIndex >= this.translationForms.length) {
            this.selectedIndex = this.translationForms.length - 1;
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    save(): void {
        if (!this.translationForms.length) {
            this.dialogRef.close();
            return;
        }
        let hasInvalid = false;
        const actionableForms = this.translationForms.filter(form => {
            if (form.invalid) {
                hasInvalid = true;
                form.markAllAsTouched();
                return false;
            }
            const nameValue = form.get('name')?.value;
            return typeof nameValue === 'string' && nameValue.trim().length > 0;
        });
        if (hasInvalid) {
            return;
        }
        if (actionableForms.length === 0 && this.pendingDeleteWordTypeIds.length === 0) {
            this.dialogRef.close();
            return;
        }
        this.loading = true;
        const requests: Observable<unknown>[] = [];
        actionableForms.forEach(form => {
            const payload = form.getRawValue();
            const hasId = !!payload.wordTypeId;
            const request$ = hasId
                ? this.http.put(`${this.configuration.baseUrl}word`, payload)
                : this.http.post(
                      `${this.configuration.baseUrl}word/${this.data.parentWord.wordTypeId}/translation`,
                      payload
                  );
            requests.push(request$);
        });
        this.pendingDeleteWordTypeIds.forEach(id => {
            requests.push(this.http.delete(`${this.configuration.baseUrl}word/${id}`));
        });
        this.pendingDeleteWordTypeIds = [];
        forkJoin(requests).subscribe({
            next: () => {
                this.messageService.info('Traductions enregistrées');
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

    private createTranslationForm(translation?: WordTranslationValue): FormGroup {
        return this.fb.group({
            wordTypeId: [translation?.wordTypeId ?? null],
            name: [translation?.name ?? '', Validators.required],
            plural: [translation?.plural ?? ''],
            langueId: [translation?.langueId ?? this.data.langue.id, Validators.required],
            typeId: [translation?.typeId ?? this.data.typeId ?? null, Validators.required],
            genderId: [translation?.genderId ?? null],
            commentaire: [translation?.commentaire ?? ''],
            baseWordTypeId: [this.data.parentWord.wordTypeId]
        });
    }

    private shouldRequireGender(langue: Langue, typeId?: number | null): boolean {
        const iso = langue.iso?.trim().toUpperCase();
        const isGenderedLanguage = iso === 'FR' || iso === 'DE';
        if (!isGenderedLanguage) {
            return false;
        }
        return typeId === 1;
    }
}
