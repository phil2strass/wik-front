import { CommonModule } from '@angular/common';
import { Component, ViewChild, effect, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { WordStore } from '../word-store';
import { WordFormComponent } from './word-form.component';

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
        <mat-dialog-content>
            <app-word-form #wordFormRef [form]="form" mode="update" [useCard]="false" [disableTypeSelection]="true"></app-word-form>
        </mat-dialog-content>
        <div class="word-edit-dialog__loader-slot">
            <mat-progress-bar *ngIf="isLoading()" mode="indeterminate"></mat-progress-bar>
        </div>
        <mat-dialog-actions class="d-flex gap-10 align-items-center">
            <button mat-button (click)="onNoClick()">Annuler</button>
            <button
                mat-flat-button
                color="primary"
                (click)="onSave()"
                [disabled]="form.invalid || !form.dirty || isLoading()">
                <span>Enregistrer</span>
            </button>
        </mat-dialog-actions>
    `,
    imports: [
        CommonModule,
        MatButtonModule,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatProgressSpinnerModule,
        MatProgressBarModule,
        WordFormComponent
    ],
    styles: [
        `
            .word-edit-dialog__loader-slot {
                height: 4px;
            }

            .word-edit-dialog__loader-slot mat-progress-bar {
                height: 4px;
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
