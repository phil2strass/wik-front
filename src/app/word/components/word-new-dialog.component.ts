import { CommonModule } from '@angular/common';
import { Component, ViewChild, effect, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogActions, MatDialogContent, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { WordStore } from '../word-store';
import { WordFormComponent } from './word-form.component';

@Component({
    selector: 'word-new-dialog',
    template: `
        <mat-dialog-content>
            <app-word-form #wordFormRef [form]="form" mode="create" [useCard]="false"></app-word-form>
        </mat-dialog-content>
        <div class="word-new-dialog__loader-slot">
            <mat-progress-bar *ngIf="isLoading()" mode="indeterminate"></mat-progress-bar>
        </div>
        <mat-dialog-actions class="d-flex gap-10 align-items-center">
            <button mat-button (click)="onCancel()">Annuler</button>
            <button
                mat-flat-button
                color="primary"
                (click)="onSave()"
                [disabled]="form.invalid || !form.dirty || isLoading()">
                <span>Enregistrer</span>
            </button>
        </mat-dialog-actions>
    `,
    styles: [
        `
            .word-new-dialog__loader-slot {
                height: 4px;
            }

            .word-new-dialog__loader-slot mat-progress-bar {
                height: 4px;
            }
        `
    ],
    imports: [CommonModule, MatButtonModule, MatDialogContent, MatDialogActions, MatProgressBarModule, WordFormComponent]
})
export class WordNewDialog {
    @ViewChild('wordFormRef') wordFormComponent?: WordFormComponent;

    readonly dialogRef = inject(MatDialogRef<WordNewDialog>);
    readonly #wordStore = inject(WordStore);
    protected readonly status = this.#wordStore.status;
    protected readonly action = this.#wordStore.action;

    #formBuilder = inject(FormBuilder);
    form: FormGroup;

    constructor() {
        this.form = this.#formBuilder.group({
            name: ['', Validators.required],
            typeId: [null, Validators.required],
            genderId: [null],
            plural: ['']
        });

        effect(() => {
            const loading = this.isLoading();
            if (loading && this.form.enabled) {
                this.form.disable({ emitEvent: false });
            } else if (!loading && this.form.disabled) {
                this.form.enable({ emitEvent: false });
            }
        });

        effect(() => {
            if (this.action() === 'created') {
                this.#wordStore.actionInit();
                this.dialogRef.close(true);
            }
        });
    }

    onCancel() {
        this.dialogRef.close();
    }

    onSave() {
        this.wordFormComponent?.save();
    }

    isLoading(): boolean {
        return this.status() === 'loading';
    }
}
