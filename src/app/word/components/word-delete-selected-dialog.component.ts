import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';

type WordDeleteSelectedDialogData = {
    count: number;
};

@Component({
    standalone: true,
    selector: 'word-delete-selected-dialog',
    template: `
        <h2 mat-dialog-title>
            {{
                data.count > 1
                    ? ('word.deleteSelected.titleMany' | translate : { count: data.count })
                    : ('word.deleteSelected.titleOne' | translate : { count: data.count })
            }}
        </h2>
        <mat-dialog-content class="mat-typography">
            <p>{{ 'word.deleteSelected.message' | translate }}</p>
        </mat-dialog-content>
        <div mat-dialog-actions class="d-flex justify-content-end gap-12">
            <button mat-button (click)="onCancel()">{{ 'common.actions.cancel' | translate }}</button>
            <button color="warn" mat-flat-button [mat-dialog-close]="true">{{ 'common.actions.delete' | translate }}</button>
        </div>
    `,
    imports: [MatButtonModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, TranslateModule]
})
export class WordDeleteSelectedDialogComponent {
    readonly dialogRef = inject(MatDialogRef<WordDeleteSelectedDialogComponent>);
    readonly data = inject<WordDeleteSelectedDialogData>(MAT_DIALOG_DATA);

    onCancel(): void {
        this.dialogRef.close();
    }
}
