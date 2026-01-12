import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { Langue } from '@shared/data/models/langue.model';

export type SenseExampleTranslationDialogResult = {
    translations: Record<number, string>;
};

type SenseExampleTranslationDialogData = {
    languages: Langue[];
    initial?: Record<number, string | null | undefined>;
};

@Component({
    selector: 'app-sense-example-translation-dialog',
    standalone: true,
    template: `
        <h2 mat-dialog-title>{{ 'word.examples.translation.title' | translate }}</h2>
        <mat-dialog-content>
            <form class="sense-example-translation-dialog__form" [formGroup]="form">
                <mat-form-field
                    *ngFor="let lang of languages"
                    appearance="outline"
                    class="w-100 sense-example-translation-dialog__field"
                    color="primary"
                    hideRequiredMarker="true">
                    <mat-label>{{ lang.name }}</mat-label>
                    <textarea matInput [formControlName]="controlName(lang)" rows="3"></textarea>
                </mat-form-field>
            </form>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button type="button" (click)="cancel()">
                {{ 'common.actions.cancel' | translate }}
            </button>
            <button mat-flat-button color="primary" type="button" (click)="submit()">
                {{ 'common.actions.save' | translate }}
            </button>
        </mat-dialog-actions>
    `,
    styles: [
        `
            .sense-example-translation-dialog__form {
                display: flex;
                flex-direction: column;
            }

            .sense-example-translation-dialog__field {
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
export class SenseExampleTranslationDialogComponent {
    readonly #dialogRef = inject(MatDialogRef<SenseExampleTranslationDialogComponent>);
    readonly #fb = inject(FormBuilder);
    readonly data = inject<SenseExampleTranslationDialogData>(MAT_DIALOG_DATA);
    readonly languages = (this.data.languages ?? []).filter(lang => !!lang?.id);
    readonly form: FormGroup;

    constructor() {
        const group: Record<string, ReturnType<FormBuilder['control']>> = {};
        this.languages.forEach(lang => {
            const initial = this.data.initial?.[lang.id] ?? '';
            group[this.controlName(lang)] = this.#fb.control(initial ?? '');
        });
        this.form = this.#fb.group(group);
    }

    controlName(lang: Langue): string {
        return `lang_${lang.id}`;
    }

    cancel(): void {
        this.#dialogRef.close();
    }

    submit(): void {
        const translations: Record<number, string> = {};
        this.languages.forEach(lang => {
            const value = (this.form.get(this.controlName(lang))?.value ?? '').toString().trim();
            translations[lang.id] = value;
        });
        this.#dialogRef.close({ translations } satisfies SenseExampleTranslationDialogResult);
    }
}
