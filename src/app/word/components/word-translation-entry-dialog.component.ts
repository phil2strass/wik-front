import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

type WordTranslationEntryDialogData = {
    titleKey: string;
    confirmKey: string;
    labelKey?: string;
    initialValue?: string | null;
    showPlural?: boolean;
    pluralLabelKey?: string;
    initialPlural?: string | null;
};

type WordTranslationEntryDialogResult = {
    name: string;
    plural: string | null;
};

@Component({
    standalone: true,
    selector: 'word-translation-entry-dialog',
    template: `
        <h2 mat-dialog-title>{{ data.titleKey | translate }}</h2>
        <mat-dialog-content class="word-translation-entry-dialog__content">
            <mat-form-field
                appearance="outline"
                class="w-100 word-translation-entry-dialog__field"
                color="primary"
                hideRequiredMarker="true"
                floatLabel="always">
                <mat-label *ngIf="data.labelKey">{{ data.labelKey | translate }}</mat-label>
                <input matInput [formControl]="nameControl" type="text" />
                <mat-error *ngIf="nameControl.hasError('required') && nameControl.touched">
                    {{ 'word.translation.errors.required' | translate }}
                </mat-error>
            </mat-form-field>
            <mat-form-field
                *ngIf="data.showPlural"
                appearance="outline"
                class="w-100 word-translation-entry-dialog__field"
                color="primary"
                hideRequiredMarker="true"
                floatLabel="always">
                <mat-label>{{ data.pluralLabelKey ?? 'word.form.plural.label' | translate }}</mat-label>
                <input matInput [formControl]="pluralControl" type="text" />
            </mat-form-field>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button type="button" (mousedown)="cancel($event)" (click)="cancel($event)">
                {{ 'common.actions.cancel' | translate }}
            </button>
            <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="nameControl.invalid">
                {{ data.confirmKey | translate }}
            </button>
        </mat-dialog-actions>
    `,
    styles: [
        `
            .word-translation-entry-dialog__field {
                margin-top: 8px;
            }
        `
    ],
    imports: [
        CommonModule,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        ReactiveFormsModule,
        TranslateModule
    ]
})
export class WordTranslationEntryDialogComponent {
    readonly dialogRef = inject(MatDialogRef<WordTranslationEntryDialogComponent>);
    readonly data = inject<WordTranslationEntryDialogData>(MAT_DIALOG_DATA);
    readonly nameControl = inject(FormBuilder).control(this.data.initialValue ?? '', [Validators.required]);
    readonly pluralControl = inject(FormBuilder).control(this.data.initialPlural ?? '');

    cancel(event?: Event): void {
        event?.preventDefault();
        event?.stopPropagation();
        this.nameControl.markAsUntouched();
        this.nameControl.markAsPristine();
        this.nameControl.updateValueAndValidity({ emitEvent: false });
        this.pluralControl.markAsUntouched();
        this.pluralControl.markAsPristine();
        this.pluralControl.updateValueAndValidity({ emitEvent: false });
        this.dialogRef.close(null);
    }

    submit(): void {
        if (this.nameControl.invalid) {
            this.nameControl.markAsTouched();
            return;
        }
        const value = (this.nameControl.value ?? '').toString().trim();
        if (!value) {
            this.nameControl.setErrors({ required: true });
            this.nameControl.markAsTouched();
            return;
        }
        const pluralValue = this.data.showPlural ? (this.pluralControl.value ?? '').toString().trim() : null;
        const result: WordTranslationEntryDialogResult = { name: value, plural: pluralValue || null };
        this.dialogRef.close(result);
    }
}
