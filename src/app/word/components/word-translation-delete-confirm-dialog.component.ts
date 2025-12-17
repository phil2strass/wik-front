import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

type WordTranslationDeleteConfirmDialogData = {
    name?: string | null;
};

@Component({
    standalone: true,
    selector: 'word-translation-delete-confirm-dialog',
    template: `
        <h2 mat-dialog-title>Supprimer la traduction</h2>
        <mat-dialog-content class="mat-typography">
            <p>Voulez-vous vraiment supprimer la traduction{{ data.name ? ' “' + data.name + '”' : '' }} ?</p>
        </mat-dialog-content>
        <div mat-dialog-actions class="d-flex justify-content-end gap-12">
            <button mat-button (click)="onCancel()">Annuler</button>
            <button color="warn" mat-flat-button [mat-dialog-close]="true">Supprimer</button>
        </div>
    `,
    imports: [MatButtonModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose]
})
export class WordTranslationDeleteConfirmDialogComponent {
    readonly dialogRef = inject(MatDialogRef<WordTranslationDeleteConfirmDialogComponent>);
    readonly data = inject<WordTranslationDeleteConfirmDialogData>(MAT_DIALOG_DATA);

    onCancel(): void {
        this.dialogRef.close(false);
    }
}

