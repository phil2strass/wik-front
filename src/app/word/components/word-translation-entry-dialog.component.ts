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
};

@Component({
    standalone: true,
    selector: 'word-translation-entry-dialog',
    template: `
        <h2 mat-dialog-title>{{ data.titleKey | translate }}</h2>
        <mat-dialog-content class="word-translation-entry-dialog__content">
            <mat-form-field appearance="outline" class="w-100 word-translation-entry-dialog__field" color="primary" hideRequiredMarker="true">
                <mat-label *ngIf="data.labelKey">{{ data.labelKey | translate }}</mat-label>
                <input matInput [formControl]="nameControl" type="text" />
                <mat-error *ngIf="nameControl.hasError('required')">
                    {{ 'word.translation.errors.required' | translate }}
                </mat-error>
            </mat-form-field>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button type="button" (click)="cancel()">
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

    cancel(): void {
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
        this.dialogRef.close(value);
    }
}
