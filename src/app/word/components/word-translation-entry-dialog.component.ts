import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Gender } from '@shared/data/models/langue.model';

type WordTranslationEntryDialogData = {
    titleKey: string;
    confirmKey: string;
    labelKey?: string;
    initialValue?: string | null;
    showPlural?: boolean;
    pluralLabelKey?: string;
    initialPlural?: string | null;
    showGender?: boolean;
    genders?: Gender[];
    genderId?: number | null;
    genderRequired?: boolean;
    langueIso?: string | null;
};

type WordTranslationEntryDialogResult = {
    name: string;
    plural: string | null;
    genderId: number | null;
};

@Component({
    standalone: true,
    selector: 'word-translation-entry-dialog',
    template: `
        <h2 mat-dialog-title>{{ data.titleKey | translate }}</h2>
        <mat-dialog-content class="word-translation-entry-dialog__content">
            <mat-form-field
                appearance="outline"
                class="w-100 word-translation-entry-dialog__field"
                color="primary"
                hideRequiredMarker="true"
                floatLabel="always">
                <mat-label *ngIf="data.labelKey">{{ data.labelKey | translate }}</mat-label>
                <input matInput [formControl]="nameControl" type="text" />
                <mat-error *ngIf="nameControl.hasError('required') && nameControl.touched">
                    {{ 'word.translation.errors.required' | translate }}
                </mat-error>
            </mat-form-field>
            <mat-form-field
                *ngIf="data.showPlural"
                appearance="outline"
                class="w-100 word-translation-entry-dialog__field"
                color="primary"
                hideRequiredMarker="true"
                floatLabel="always">
                <mat-label>{{ data.pluralLabelKey ?? 'word.form.plural.label' | translate }}</mat-label>
                <input matInput [formControl]="pluralControl" type="text" />
            </mat-form-field>
            <mat-form-field
                *ngIf="showGender"
                appearance="outline"
                class="w-100 word-translation-entry-dialog__field"
                color="primary"
                hideRequiredMarker="true"
                floatLabel="always">
                <mat-label>{{ 'word.form.gender.label' | translate }}</mat-label>
                <mat-select [formControl]="genderControl">
                    <mat-option *ngFor="let gender of genderOptions" [value]="gender.id">
                        {{ genderOptionLabel(gender) }}
                    </mat-option>
                </mat-select>
                <mat-error *ngIf="genderControl.hasError('required') && genderControl.touched">
                    {{ 'word.translation.errors.genderRequired' | translate }}
                </mat-error>
            </mat-form-field>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button type="button" (mousedown)="cancel($event)" (click)="cancel($event)">
                {{ 'common.actions.cancel' | translate }}
            </button>
            <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="nameControl.invalid">
                {{ data.confirmKey | translate }}
            </button>
        </mat-dialog-actions>
    `,
    styles: [
        `
            .word-translation-entry-dialog__field {
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
        MatSelect,
        MatOption,
        ReactiveFormsModule,
        TranslateModule
    ]
})
export class WordTranslationEntryDialogComponent {
    readonly translate = inject(TranslateService);
    readonly formBuilder = inject(FormBuilder);
    readonly dialogRef = inject(MatDialogRef<WordTranslationEntryDialogComponent>);
    readonly data = inject<WordTranslationEntryDialogData>(MAT_DIALOG_DATA);
    readonly nameControl = this.formBuilder.control(this.data.initialValue ?? '', [Validators.required]);
    readonly pluralControl = this.formBuilder.control(this.data.initialPlural ?? '');
    readonly genderControl = this.formBuilder.control(
        this.data.genderId ?? null,
        this.data.genderRequired ? [Validators.required] : []
    );

    get showGender(): boolean {
        return !!this.data.showGender && Array.isArray(this.data.genders) && this.data.genders.length > 0;
    }

    get genderOptions(): Gender[] {
        return this.showGender ? this.data.genders ?? [] : [];
    }

    cancel(event?: Event): void {
        event?.preventDefault();
        event?.stopPropagation();
        this.nameControl.markAsUntouched();
        this.nameControl.markAsPristine();
        this.nameControl.updateValueAndValidity({ emitEvent: false });
        this.pluralControl.markAsUntouched();
        this.pluralControl.markAsPristine();
        this.pluralControl.updateValueAndValidity({ emitEvent: false });
        this.genderControl.markAsUntouched();
        this.genderControl.markAsPristine();
        this.genderControl.updateValueAndValidity({ emitEvent: false });
        this.dialogRef.close(null);
    }

    submit(): void {
        if (this.nameControl.invalid) {
            this.nameControl.markAsTouched();
            return;
        }
        if (this.showGender && this.genderControl.invalid) {
            this.genderControl.markAsTouched();
            return;
        }
        const value = (this.nameControl.value ?? '').toString().trim();
        if (!value) {
            this.nameControl.setErrors({ required: true });
            this.nameControl.markAsTouched();
            return;
        }
        const pluralValue = this.data.showPlural ? (this.pluralControl.value ?? '').toString().trim() : null;
        const genderValue = this.showGender ? this.extractGenderId(this.genderControl.value) : null;
        const result: WordTranslationEntryDialogResult = {
            name: value,
            plural: pluralValue || null,
            genderId: genderValue
        };
        this.dialogRef.close(result);
    }

    genderOptionLabel(gender: Gender): string {
        if (!gender) {
            return '';
        }
        const baseLabel = this.resolveGenderLabel(gender);
        const article = this.computeArticle(this.data.langueIso, gender.id);
        if (article) {
            return baseLabel ? `${article} (${baseLabel})` : article;
        }
        return baseLabel;
    }

    private resolveGenderLabel(gender: Gender): string {
        const raw = gender?.name ?? '';
        const idKey = gender?.id != null ? `gender.${gender.id}` : undefined;
        if (idKey) {
            const translatedById = this.translate.instant(idKey);
            if (translatedById && translatedById !== idKey) {
                return translatedById;
            }
        }
        const normalized = raw
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
        const key = `gender.${normalized}`;
        const translated = this.translate.instant(key);
        return translated && translated !== key ? translated : raw;
    }

    private extractGenderId(value: unknown): number | null {
        if (typeof value === 'number') {
            return value;
        }
        if (value != null) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
    }

    private computeArticle(iso?: string | null, genderId?: number | null): string | null {
        if (!iso || !genderId) {
            return null;
        }
        const normalizedIso = iso.trim().toUpperCase();
        if (normalizedIso === 'FR') {
            switch (genderId) {
                case 1:
                    return 'le';
                case 2:
                    return 'la';
                case 3:
                    return 'les';
                default:
                    return null;
            }
        }
        if (normalizedIso === 'DE') {
            switch (genderId) {
                case 1:
                    return 'der';
                case 2:
                    return 'die';
                case 3:
                    return 'das';
                default:
                    return null;
            }
        }
        return null;
    }
}
