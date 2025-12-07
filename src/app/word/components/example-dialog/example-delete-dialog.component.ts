import { Component, inject } from '@angular/core';
import {
    MAT_DIALOG_DATA,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogRef,
    MatDialogTitle
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

type ExampleDeleteDialogData = {
    content: string;
};

@Component({
    selector: 'app-example-delete-dialog',
    standalone: true,
    template: `
        <h2 mat-dialog-title>Attention!</h2>
        <mat-dialog-content class="mat-typography">
            <p>Êtes-vous sûr de vouloir supprimer ce exemple ?</p>
            <p *ngIf="data.content" class="example-delete-dialog__excerpt">“{{ data.content }}”</p>
        </mat-dialog-content>
        <div mat-dialog-actions class="d-flex justify-content-end gap-12">
            <button mat-button (click)="onNoClick()">{{ 'common.actions.cancel' | translate }}</button>
            <button color="warn" mat-flat-button [mat-dialog-close]="true">
                {{ 'word.examples.delete' | translate }}
            </button>
        </div>
    `,
    styles: [
        `
            .example-delete-dialog__excerpt {
                font-style: italic;
                color: rgba(0, 0, 0, 0.7);
                margin: 0;
            }
        `
    ],
    imports: [CommonModule, MatButtonModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, TranslateModule]
})
export class ExampleDeleteDialogComponent {
    readonly data = inject<ExampleDeleteDialogData>(MAT_DIALOG_DATA);
    readonly dialogRef = inject(MatDialogRef<ExampleDeleteDialogComponent>);

    onNoClick(): void {
        this.dialogRef.close();
    }
}
