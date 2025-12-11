import { CommonModule } from '@angular/common';
import { Component, ViewChild, effect, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { WordStore } from '../word-store';
import { WordFormComponent } from './word-form/word-form.component';
import { TranslateModule } from '@ngx-translate/core';

interface WordDialogData {
    wordTypeId?: number;
    langue?: number;
    langueId?: number;
    name?: string;
    type?: { id: number; name?: string };
    typeId?: number;
    gender?: { id: number; name?: string } | null;
    genderId?: number | null;
    plural?: string | null;
}

@Component({
    selector: 'word-edit-dialog',
    template: `
        <mat-dialog-content class="word-edit-dialog__content">
            <app-word-form #wordFormRef [form]="form" mode="update" [useCard]="false" [disableTypeSelection]="true"></app-word-form>
        </mat-dialog-content>
        <div class="word-edit-dialog__loader-slot">
            <mat-progress-bar *ngIf="isLoading()" mode="indeterminate"></mat-progress-bar>
        </div>
        <mat-dialog-actions align="end" class="word-edit-dialog__actions-bar">
            <button mat-button type="button" class="word-edit-dialog__action-btn b-1 border-error text-error" (click)="onNoClick()">
                <mat-icon>close</mat-icon>
                <span>{{ 'common.actions.cancel' | translate }}</span>
            </button>
            <button
                mat-flat-button
                color="primary"
                type="button"
                class="word-edit-dialog__action-btn"
                (click)="onSave()"
                [disabled]="form.invalid || !form.dirty || isLoading()">
                <mat-icon>check</mat-icon>
                <span>{{ 'common.actions.save' | translate }}</span>
            </button>
        </mat-dialog-actions>
    `,
    imports: [
        CommonModule,
        MatButtonModule,
        MatDialogContent,
        MatDialogActions,
        MatIconModule,
        MatProgressSpinnerModule,
        MatProgressBarModule,
        WordFormComponent,
        TranslateModule
    ],
    styles: [
        `
            .word-edit-dialog__content {
                padding-top: 24px;
                display: block;
            }

            .word-edit-dialog__loader-slot {
                height: 4px;
            }

            .word-edit-dialog__loader-slot mat-progress-bar {
                height: 4px;
            }

            .word-edit-dialog__actions-bar {
                border-top: 1px solid rgba(0, 0, 0, 0.08);
                padding-top: 12px;
                display: flex;
                justify-content: flex-end;
                gap: 8px;
            }

            .word-edit-dialog__action-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
        `
    ]
})
export class WordEditDialog {
    @ViewChild('wordFormRef') wordFormComponent?: WordFormComponent;
    readonly dialogRef = inject(MatDialogRef<WordEditDialog>);
    readonly data = inject<WordDialogData>(MAT_DIALOG_DATA);

    readonly #wordStore = inject(WordStore);
    protected readonly action = this.#wordStore.action;
    protected readonly status = this.#wordStore.status;

    #formBuilder = inject(FormBuilder);
    form: FormGroup;

    constructor() {
        console.log('WordEditDialog MAT_DIALOG_DATA = ', this.data);
        const langueId = this.data.langue ?? this.data.langueId ?? null;
        const typeId = this.data.type?.id ?? this.data.typeId ?? null;
        const genderId = this.data.gender?.id ?? this.data.genderId ?? null;
        this.form = this.#formBuilder.group({
            wordTypeId: [this.data.wordTypeId, Validators.required],
            name: [this.data.name, Validators.required],
            langueId: [langueId, Validators.required],
            typeId: [typeId, Validators.required],
            genderId: [genderId],
            plural: [this.data.plural]
        });
        this.form.get('typeId')?.disable({ emitEvent: false });
        effect(() => {
            if (this.action() == 'updated') {
                this.#wordStore.actionInit();
                this.dialogRef.close(true);
            }
        });
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    onSave() {
        this.wordFormComponent?.save();
    }

    isLoading(): boolean {
        return this.status() === 'loading';
    }
}
