import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
    selector: 'app-category-create-dialog',
    standalone: true,
    template: `
        <h2 mat-dialog-title>Créer une catégorie</h2>
        <mat-dialog-content>
            <form [formGroup]="form" class="category-create-dialog__form">
                <mat-form-field appearance="outline" class="w-100" color="primary">
                    <mat-label>Nom</mat-label>
                    <input matInput formControlName="name" />
                </mat-form-field>
            </form>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button mat-dialog-close>Annuler</button>
            <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Créer</button>
        </mat-dialog-actions>
    `,
    styles: [
        `
            .category-create-dialog__form {
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
        MatInputModule
    ]
})
export class CategoryCreateDialogComponent {
    #fb = inject(FormBuilder);
    #dialogRef = inject(MatDialogRef<CategoryCreateDialogComponent>);

    form = this.#fb.group({
        name: ['', [Validators.required, Validators.maxLength(255)]]
    });

    save(): void {
        if (this.form.invalid) return;
        this.#dialogRef.close(this.form.value.name?.trim());
    }
}
