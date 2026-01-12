import { Component, inject, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { Word } from '../models/word.model';

@Component({
    selector: 'word-delete-dialog',
    template: `
        <h2 mat-dialog-title>{{ 'word.delete.title' | translate : { name: data.name } }}</h2>
        <mat-dialog-content class="mat-typography">
            <p>{{ 'word.delete.message' | translate }}</p>
        </mat-dialog-content>
        <div mat-dialog-actions class="d-flex justify-content-end gap-12">
            <button mat-button (click)="onNoClick()">{{ 'common.actions.cancel' | translate }}</button>
            <button color="warn" mat-flat-button [mat-dialog-close]="wordId()">{{ 'common.actions.delete' | translate }}</button>
        </div>
        <!--
        <mat-dialog-actions>
            <button matButton (click)="onNoClick()">Annuler</button>
            <button matButton [mat-dialog-close]="wordId()" cdkFocusInitial>Supprimer</button>
        </mat-dialog-actions>
        -->
    `,
    imports: [
        MatFormFieldModule,
        MatInputModule,
        FormsModule,
        MatButtonModule,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatDialogClose,
        TranslateModule
    ]
})
export class WordDeleteDialog {
    readonly dialogRef = inject(MatDialogRef<WordDeleteDialog>);
    readonly data = inject<Word>(MAT_DIALOG_DATA);
    readonly wordId = model(this.data.wordLangueTypeId);

    onNoClick(): void {
        this.dialogRef.close();
    }
}
