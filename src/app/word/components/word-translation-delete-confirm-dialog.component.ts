import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';

type WordTranslationDeleteConfirmDialogData = {
    name?: string | null;
    title?: string;
    message?: string;
    confirmLabel?: string;
};

@Component({
    standalone: true,
    selector: 'word-translation-delete-confirm-dialog',
    template: `
        <h2 mat-dialog-title>{{ data.title || ('word.translation.deleteTitle' | translate) }}</h2>
        <mat-dialog-content class="mat-typography">
            <p>
                {{
                    data.message ||
                        ('word.translation.deleteMessage' | translate : { name: data.name ? ' “' + data.name + '”' : '' })
                }}
            </p>
        </mat-dialog-content>
        <div mat-dialog-actions class="d-flex justify-content-end gap-12">
            <button mat-button (click)="onCancel()">{{ 'common.actions.cancel' | translate }}</button>
            <button color="warn" mat-flat-button [mat-dialog-close]="true">
                {{ data.confirmLabel || ('word.translation.delete' | translate) }}
            </button>
        </div>
    `,
    imports: [MatButtonModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, TranslateModule]
})
export class WordTranslationDeleteConfirmDialogComponent {
    readonly dialogRef = inject(MatDialogRef<WordTranslationDeleteConfirmDialogComponent>);
    readonly data = inject<WordTranslationDeleteConfirmDialogData>(MAT_DIALOG_DATA);

    onCancel(): void {
        this.dialogRef.close(false);
    }
}
