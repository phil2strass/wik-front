import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatDialogTitle, MatDialogContent, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Langue } from '@shared/data/models/langue.model';

@Component({
    selector: 'app-translation-language-picker-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogTitle, MatDialogContent, MatButtonModule],
    template: `
        <h2 mat-dialog-title class="translation-picker__title">{{ data.wordLabel }} -></h2>
        <mat-dialog-content>
            <div class="translation-picker__languages">
                <button
                    mat-stroked-button
                    color="primary"
                    *ngFor="let lang of data.languages"
                    (click)="choose(lang)"
                    class="translation-picker__lang-btn">
                    {{ lang.name }}
                </button>
            </div>
        </mat-dialog-content>
    `,
    styles: [
        `
            .translation-picker__title {
                margin: 0 0 8px 0;
            }
            .translation-picker__languages {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 4px;
            }
            .translation-picker__lang-btn {
                min-width: 140px;
            }
        `
    ]
})
export class TranslationLanguagePickerDialogComponent {
    data = inject<{ wordLabel: string; languages: Langue[] }>(MAT_DIALOG_DATA);
    #dialogRef = inject(MatDialogRef<TranslationLanguagePickerDialogComponent>);

    choose(lang: Langue): void {
        this.#dialogRef.close(lang);
    }
}
