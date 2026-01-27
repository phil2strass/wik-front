import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { Categorie } from '../models/categorie.model';

type CategoryEditDialogData = {
    category: Categorie;
};

@Component({
    selector: 'app-category-edit-dialog',
    standalone: true,
    template: `
        <h2 mat-dialog-title>{{ 'word.category.editTitle' | translate }}</h2>
        <mat-dialog-content>
            <form [formGroup]="form" class="category-edit-dialog__form">
                <mat-form-field appearance="outline" class="w-100" color="primary">
                    <mat-label>{{ 'word.category.nameLabel' | translate }}</mat-label>
                    <input matInput formControlName="name" />
                </mat-form-field>
            </form>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button mat-dialog-close>{{ 'common.actions.cancel' | translate }}</button>
            <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">
                {{ 'common.actions.save' | translate }}
            </button>
        </mat-dialog-actions>
    `,
    styles: [
        `
            .category-edit-dialog__form {
                margin-top: 8px;
            }
        `
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatDialogClose,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        TranslateModule
    ]
})
export class CategoryEditDialogComponent {
    #fb = inject(FormBuilder);
    #dialogRef = inject(MatDialogRef<CategoryEditDialogComponent>);

    constructor(@Inject(MAT_DIALOG_DATA) private data: CategoryEditDialogData) {
        this.form.patchValue({ name: data?.category?.name ?? '' });
    }

    form = this.#fb.group({
        name: ['', [Validators.required, Validators.maxLength(255)]]
    });

    save(): void {
        if (this.form.invalid) return;
        this.#dialogRef.close(this.form.value.name?.trim());
    }
}
