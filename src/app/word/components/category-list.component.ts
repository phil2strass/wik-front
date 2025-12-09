import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CategoryCreateDialogComponent } from './category-create-dialog.component';
import { CategorieService } from '../services/categorie.service';
import { Categorie } from '../models/categorie.model';
import { MessageService } from '@shared/ui-messaging/message/message.service';

@Component({
    selector: 'app-category-list',
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    template: `
        <div class="category-list__container">
            <mat-card class="cardWithShadow b-1 rounded p-24">
                <div class="category-list__header">
                    <h3 class="m-t-0">Catégories</h3>
                    <button mat-flat-button color="primary" type="button" (click)="openCreateDialog()" [disabled]="loading">
                        Créer catégorie
                    </button>
                </div>

                <div class="category-list__table-wrapper">
                    <table mat-table [dataSource]="categories" class="mat-elevation-z0 category-list__table">
                        <ng-container matColumnDef="id">
                            <th mat-header-cell *matHeaderCellDef>ID</th>
                            <td mat-cell *matCellDef="let row">{{ row.id }}</td>
                        </ng-container>

                        <ng-container matColumnDef="name">
                            <th mat-header-cell *matHeaderCellDef>Nom</th>
                            <td mat-cell *matCellDef="let row">{{ row.name }}</td>
                        </ng-container>

                        <ng-container matColumnDef="actions">
                            <th mat-header-cell *matHeaderCellDef></th>
                            <td mat-cell *matCellDef="let row" class="category-list__actions">
                                <button mat-icon-button color="warn" (click)="remove(row)" [disabled]="loading">
                                    <mat-icon>delete</mat-icon>
                                </button>
                            </td>
                        </ng-container>

                        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
                    </table>
                </div>
            </mat-card>
        </div>
    `,
    styles: [
        `
            .category-list__container {
                display: flex;
                justify-content: flex-start;
                padding: 16px;
            }
            .category-list__form {
                display: flex;
                gap: 12px;
                align-items: flex-end;
                margin-bottom: 12px;
            }
            .category-list__field {
                flex: 0 0 280px;
            }
            .category-list__table-wrapper {
                overflow-x: auto;
            }
            .category-list__table th,
            .category-list__table td {
                padding: 12px 8px;
            }
            .category-list__actions {
                text-align: right;
            }
        `
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatTableModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        CategoryCreateDialogComponent
    ]
})
export class CategoryListComponent implements OnInit {
    private categorieService = inject(CategorieService);
    private fb = inject(FormBuilder);
    private messageService = inject(MessageService);
    private dialog = inject(MatDialog);

    categories: Categorie[] = [];
    displayedColumns = ['id', 'name', 'actions'];
    loading = false;
    form: FormGroup = this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(255)]]
    });

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading = true;
        this.categorieService.list().subscribe({
            next: data => {
                this.categories = data;
                this.loading = false;
            },
            error: err => {
                this.loading = false;
                this.messageService.error(err?.error ?? 'Erreur de chargement');
            }
        });
    }

    openCreateDialog(): void {
        const dialogRef = this.dialog.open(CategoryCreateDialogComponent, {
            width: '420px'
        });
        dialogRef.afterClosed().subscribe(name => {
            if (typeof name === 'string' && name.trim()) {
                this.submit(name.trim());
            }
        });
    }

    submit(nameFromDialog?: string): void {
        if (this.form.invalid && !nameFromDialog) {
            this.form.markAllAsTouched();
            return;
        }
        const name = nameFromDialog ?? (this.form.value.name || '').trim();
        if (!name) {
            this.form.get('name')?.setErrors({ required: true });
            return;
        }
        this.loading = true;
        this.categorieService.create(name).subscribe({
            next: cat => {
                this.categories = [...this.categories, cat];
                this.form.reset();
                this.loading = false;
                this.messageService.info('Catégorie créée');
            },
            error: err => {
                this.loading = false;
                this.messageService.error(err?.error ?? 'Erreur lors de la création');
            }
        });
    }

    remove(cat: Categorie): void {
        if (this.loading || !cat?.id) return;
        this.loading = true;
        this.categorieService.delete(cat.id).subscribe({
            next: () => {
                this.categories = this.categories.filter(c => c.id !== cat.id);
                this.loading = false;
                this.messageService.info('Catégorie supprimée');
            },
            error: err => {
                this.loading = false;
                this.messageService.error(err?.error ?? 'Erreur lors de la suppression');
            }
        });
    }
}
