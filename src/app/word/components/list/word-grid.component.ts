import { Component, inject, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { DataStore } from '@shared/data/data-store';
import { MatDialog } from '@angular/material/dialog';
import { Word } from '../../models/word.model';
import { WordDeleteDialog } from '../word-delete.component';
import { WordGridStore } from '../../word-grid-store';
import { WordEditDialog } from '../word-edit-dialog.component';
import { WordNewDialog } from '../word-new-dialog.component';
import { IconModule } from '@root/app/icon/icon.module';
import { MaterialModule } from '@root/app/material.module';
import { CommonModule } from '@angular/common';
import { SelectionModel } from '@angular/cdk/collections';
import { TranslateModule } from '@ngx-translate/core';
import { WordDeleteSelectedDialogComponent } from '../word-delete-selected-dialog.component';

@Component({
    selector: 'app-word-list',
    template: `
        <div class="b-1 rounded">
            @if (selection.selected.length === 0) {
                <div class="row justify-content-between gap-16 m-x-15">
                    <div class="col-sm-4 m-t-14">
                        <mat-form-field appearance="outline" class="w-30" color="primary">
                            <mat-icon matPrefix>search</mat-icon>
                            <input matInput (keyup)="applyFilter($event)" placeholder="Search Product" />
                        </mat-form-field>
                    </div>
                    <div class="col-sm-6 d-flex align-items-center justify-content-end">
                        <button mat-flat-button (click)="openCreate()">{{ 'word.create' | translate }}</button>
                    </div>
                </div>
            }
            @if (selection.selected.length > 0) {
                <div class="d-flex justify-content-between align-items-center  m-10 ">
                    <div class="m-x-15">Selected: {{ selection.selected.length }}</div>
                    <button mat-icon-button color="warn" class="m-r-10" (click)="deleteSelected()">
                        <tabler-icon name="trash"></tabler-icon>
                    </button>
                </div>
            }

            <div class="table-responsive b-t-1 p-1 example-container">
                @if (status() == 'loading') {
                    <div class="example-loading-shade">
                        <mat-spinner class="word-grid-loader"></mat-spinner>
                    </div>
                }

                <table mat-table [dataSource]="data()" class="w-100 word-grid-table" matSort matSortActive="name" matSortDisableClear matSortDirection="asc">
                    <!-- Checkbox Column -->
                    <ng-container matColumnDef="select">
                        <th mat-header-cell *matHeaderCellDef class="p-l-0 ">
                            <mat-checkbox
                                (change)="$event ? masterToggle() : null"
                                [checked]="selection.hasValue() && isAllSelected()"
                                color="primary"
                                [indeterminate]="selection.hasValue() && !isAllSelected()"
                                [aria-label]="checkboxLabel()"
                                class="m-l-16"></mat-checkbox>
                        </th>
                        <td mat-cell *matCellDef="let row" class="p-l-0">
                            <mat-checkbox
                                (click)="$event.stopPropagation()"
                                (change)="$event ? selection.toggle(row) : null"
                                color="primary"
                                [checked]="selection.isSelected(row)"
                                [aria-label]="checkboxLabel(row)"
                                class="m-l-16"></mat-checkbox>
                        </td>
                    </ng-container>
                    <ng-container matColumnDef="name">
                        <th mat-header-cell *matHeaderCellDef sticky class="f-w-600 mat-subtitle-1 f-s-14">Name</th>
                        <td mat-cell *matCellDef="let row" class="f-s-14">{{ row.name }}</td>
                    </ng-container>

                    <!-- Actions Column -->
                    <ng-container matColumnDef="actions" stickyEnd>
                        <th mat-header-cell *matHeaderCellDef sticky class="f-w-600 mat-subtitle-1 f-s-14">Action</th>
                        <td mat-cell *matCellDef="let row" class="f-s-14" (click)="$event.stopPropagation()">
                            <button mat-icon-button [matMenuTriggerFor]="menu" type="button" aria-label="Example icon-button with a menu">
                                <mat-icon>
                                    <tabler-icon name="dots-vertical"></tabler-icon>
                                </mat-icon>
                            </button>
                            <mat-menu #menu="matMenu" class="cardWithShadow">
                                <button mat-menu-item>
                                    <div class="d-flex align-items-center" (click)="openEdit(row)">
                                        <tabler-icon name="pencil" class="m-x-6"></tabler-icon>
                                        <span>Edit</span>
                                    </div>
                                </button>
                                <button mat-menu-item>
                                    <div class="d-flex align-items-center text-error" (click)="openDelete(row)">
                                        <tabler-icon name="trash" class="m-x-6"></tabler-icon>
                                        <span>Delete</span>
                                    </div>
                                </button>
                            </mat-menu>
                        </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
                </table>
            </div>

            <mat-paginator
                [pageSizeOptions]="[5, 10, 20]"
                [pageSize]="pageSize()"
                [length]="resultsLength()"
                showFirstLastButtons
                aria-label="Sélection page des mots"
                class="b-t-1 p-x-48"></mat-paginator>
        </div>
    `,
    imports: [MaterialModule, CommonModule, IconModule, TranslateModule],
    styles: [
        `
            .example-container {
                position: relative;
                min-height: 240px;
            }

            .example-loading-shade {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.15);
                z-index: 2;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(1px);
            }

            .word-grid-loader {
                animation: fadeIn 200ms ease-in-out forwards;
            }

            .word-grid-table {
                width: 100%;
                table-layout: fixed;
            }

            .word-grid-table .mat-column-select {
                width: 56px;
                max-width: 56px;
            }

            .word-grid-table .mat-column-actions {
                width: 92px;
                max-width: 92px;
            }

            .word-grid-table .mat-column-name {
                width: calc(100% - 148px);
                word-break: break-word;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }
        `
    ]
})
export class WordGridComponent {
    readonly #dataStore = inject(DataStore);
    protected readonly langues = this.#dataStore.langues;

    readonly #wordGridStore = inject(WordGridStore);
    protected readonly status = this.#wordGridStore.status;
    protected readonly data = this.#wordGridStore.data;
    protected readonly pageSize = this.#wordGridStore.pageSize;
    protected readonly resultsLength = this.#wordGridStore.resultsLength;

    readonly dialog = inject(MatDialog);

    displayedColumns: string[] = ['select', 'name', 'actions'];

    langueId: number = -1;

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    selection = new SelectionModel<Word>(true, []);

    constructor() {}

    ngAfterViewInit(): void {
        this.sort.sortChange.subscribe(sort => {
            this.#wordGridStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
            this.paginator.pageIndex = 0;
        });
        this.paginator.page.subscribe(pageEvent => {
            this.#wordGridStore.setPage(pageEvent.pageIndex, pageEvent.pageSize);
        });
        this.#wordGridStore.load();
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        //this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    openEdit(word: Word) {
        const dialogRef = this.dialog.open(WordEditDialog, {
            data: word,
            width: '800px'
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result !== undefined) {
                this.#wordGridStore.load();
            }
        });
    }

    openDelete(word: Word) {
        const dialogRef = this.dialog.open(WordDeleteDialog, {
            data: word,
            position: {
                top: '25vh'
            }
        });

        dialogRef.afterClosed().subscribe(wordId => {
            if (wordId !== undefined) {
                this.#wordGridStore.delete(wordId);
            }
        });
    }

    /** The label for the checkbox on the passed row */
    checkboxLabel(row?: Word): string {
        if (!row) {
            return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
        }
        return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.wordTypeId}`;
    }

    /** Whether the number of selected elements matches the total number of rows. */
    isAllSelected(): any {
        const numSelected = this.selection.selected.length;
        const numRows = this.data().length;
        return numSelected === numRows;
    }

    /** Selects all rows if they are not all selected; otherwise clear selection. */
    masterToggle(): void {
        this.isAllSelected() ? this.selection.clear() : this.data().forEach(row => this.selection.select(row));
    }

    openCreate() {
        const dialogRef = this.dialog.open(WordNewDialog, {
            width: '800px'
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.#wordGridStore.load();
            }
        });
    }

    deleteSelected(): void {
        const selectedWords = [...this.selection.selected];
        if (selectedWords.length === 0) {
            return;
        }

        const dialogRef = this.dialog.open(WordDeleteSelectedDialogComponent, {
            data: { count: selectedWords.length },
            width: '420px'
        });

        dialogRef.afterClosed().subscribe(confirm => {
            if (confirm) {
                const ids = selectedWords.map(word => word.wordTypeId);
                this.#wordGridStore.deleteMany(ids);
                this.selection.clear();
            }
        });
    }
}
