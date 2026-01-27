import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CategorieService } from '../services/categorie.service';
import { Categorie } from '../models/categorie.model';

@Component({
    selector: 'app-category-assign-dialog',
    standalone: true,
    template: `
        <h2 mat-dialog-title>Ajouter des catégories</h2>
        <mat-dialog-content>
            <div class="category-assign-dialog__content">
                <mat-progress-spinner *ngIf="loading" mode="indeterminate" diameter="28"></mat-progress-spinner>
                <form [formGroup]="form" *ngIf="!loading">
                    <mat-selection-list formControlName="categorieIds">
                        <mat-list-option *ngFor="let cat of categories" [value]="cat.id">
                            {{ cat.name }}
                        </mat-list-option>
                    </mat-selection-list>
                </form>
            </div>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button mat-dialog-close>Annuler</button>
            <button mat-flat-button color="primary" [disabled]="form.invalid || loading" (click)="save()">
                Ajouter
            </button>
        </mat-dialog-actions>
    `,
    styles: [
        `
            .category-assign-dialog__content {
                min-height: 120px;
            }
            mat-selection-list {
                max-height: 320px;
                overflow: auto;
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
        MatListModule,
        MatProgressSpinnerModule
    ]
})
export class CategoryAssignDialogComponent {
    #fb = inject(FormBuilder);
    #dialogRef = inject(MatDialogRef<CategoryAssignDialogComponent>);
    #categorieService = inject(CategorieService);

    categories: Categorie[] = [];
    loading = true;

    form = this.#fb.group({
        categorieIds: [[], [Validators.required]]
    });

    constructor() {
        this.#categorieService.list().subscribe({
            next: data => {
                this.categories = data ?? [];
                this.loading = false;
            },
            error: () => {
                this.categories = [];
                this.loading = false;
            }
        });
    }

    save(): void {
        if (this.form.invalid) return;
        const ids = this.form.value.categorieIds ?? [];
        this.#dialogRef.close(ids);
    }
}
