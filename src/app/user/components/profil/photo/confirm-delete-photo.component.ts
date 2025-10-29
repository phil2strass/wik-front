import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-confirm-delete-photo',
    standalone: true,
    template: `
        <h2 mat-dialog-title>Supprimer la photo</h2>
        <mat-dialog-content class="mat-typography">
            <p>Voulez-vous vraiment supprimer votre photo de profil ?</p>
        </mat-dialog-content>
        <div mat-dialog-actions class="d-flex justify-content-end gap-12">
            <button mat-button (click)="close(false)">Annuler</button>
            <button color="warn" mat-flat-button (click)="close(true)">Supprimer</button>
        </div>
    `,
    imports: [MatDialogModule, MatButtonModule]
})
export class ConfirmDeletePhotoComponent {
    constructor(private dialogRef: MatDialogRef<ConfirmDeletePhotoComponent>) {}

    close(result: boolean) {
        this.dialogRef.close(result);
    }
}
