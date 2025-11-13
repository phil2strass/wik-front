import { Component, inject, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Word } from '../models/word.model';

@Component({
    selector: 'word-delete-dialog',
    template: `
        <h2 mat-dialog-title>Suppression {{ data.name }}</h2>
        <mat-dialog-content>
            <p>Êtes-vous sûr de vouloir supprimer ce mot ?</p>
        </mat-dialog-content>
        <mat-dialog-actions>
            <button matButton (click)="onNoClick()">Annuler</button>
            <button matButton [mat-dialog-close]="wordId()" cdkFocusInitial>Supprimer</button>
        </mat-dialog-actions>
    `,
    imports: [MatFormFieldModule, MatInputModule, FormsModule, MatButtonModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose]
})
export class WordDeleteDialog {
    readonly dialogRef = inject(MatDialogRef<WordDeleteDialog>);
    readonly data = inject<Word>(MAT_DIALOG_DATA);
    readonly wordId = model(this.data.wordTypeId);

    onNoClick(): void {
        this.dialogRef.close();
    }
}
