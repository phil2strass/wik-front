import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

export type SenseEntryDialogResult = {
    content: string;
};

type SenseEntryDialogData = {
    titleKey: string;
    confirmKey: string;
    initialValue?: string | null;
};

@Component({
    selector: 'app-sense-entry-dialog',
    standalone: true,
    template: `
        <h2 mat-dialog-title>{{ data.titleKey | translate }}</h2>
        <mat-dialog-content>
            <mat-form-field appearance="outline" class="w-100 sense-entry-dialog__field" color="primary" hideRequiredMarker="true">
                <mat-label>{{ 'word.senses.placeholder' | translate }}</mat-label>
                <textarea matInput [formControl]="contentControl" rows="3"></textarea>
                <mat-error *ngIf="contentControl.hasError('required')">
                    {{ 'word.senses.errors.required' | translate }}
                </mat-error>
                <mat-error *ngIf="contentControl.hasError('maxlength')">
                    {{ 'word.senses.errors.maxlength' | translate:{ max: 500 } }}
                </mat-error>
            </mat-form-field>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button type="button" (click)="cancel()">
                {{ 'common.actions.cancel' | translate }}
            </button>
            <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="contentControl.invalid">
                {{ data.confirmKey | translate }}
            </button>
        </mat-dialog-actions>
    `,
    styles: [
        `
            .sense-entry-dialog__field {
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
export class SenseEntryDialogComponent {
    readonly #dialogRef = inject(MatDialogRef<SenseEntryDialogComponent>);
    readonly #fb = inject(FormBuilder);
    readonly data = inject<SenseEntryDialogData>(MAT_DIALOG_DATA);

    readonly contentControl = this.#fb.control(this.data.initialValue ?? '', [Validators.required, Validators.maxLength(500)]);

    cancel(): void {
        this.#dialogRef.close();
    }

    submit(): void {
        if (this.contentControl.invalid) {
            this.contentControl.markAsTouched();
            return;
        }
        const content = (this.contentControl.value ?? '').toString().trim();
        if (!content) {
            this.contentControl.setErrors({ required: true });
            this.contentControl.markAsTouched();
            return;
        }
        this.#dialogRef.close({ content } satisfies SenseEntryDialogResult);
    }
}
