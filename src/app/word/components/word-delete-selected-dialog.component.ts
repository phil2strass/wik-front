import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

type WordDeleteSelectedDialogData = {
    count: number;
};

@Component({
    standalone: true,
    selector: 'word-delete-selected-dialog',
    template: `
        <h2 mat-dialog-title>Supprimer {{ data.count }} mot{{ data.count > 1 ? 's' : '' }}</h2>
        <mat-dialog-content class="mat-typography">
            <p>Êtes-vous sûr de vouloir supprimer les éléments sélectionnés ?</p>
        </mat-dialog-content>
        <div mat-dialog-actions class="d-flex justify-content-end gap-12">
            <button mat-button (click)="onCancel()">Annuler</button>
            <button color="warn" mat-flat-button [mat-dialog-close]="true">Supprimer</button>
        </div>
    `,
    imports: [MatButtonModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose]
})
export class WordDeleteSelectedDialogComponent {
    readonly dialogRef = inject(MatDialogRef<WordDeleteSelectedDialogComponent>);
    readonly data = inject<WordDeleteSelectedDialogData>(MAT_DIALOG_DATA);

    onCancel(): void {
        this.dialogRef.close();
    }
}
