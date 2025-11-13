import { Component, inject, ViewChild } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { animate, style, transition, trigger } from '@angular/animations';
import { MatSelectModule } from '@angular/material/select';
import { DataStore } from '../../../shared/data/data-store';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog } from '@angular/material/dialog';
import { Word } from '../../models/word.model';
import { WordDeleteDialog } from '../word-delete.component';
import { WordGridStore } from '../../word-grid-store';
import { WordEditDialog } from '../word-edit.component';

@Component({
    selector: 'app-word-list',
    template: `
        <h1 class="text-2xl font-medium text-gray-900">Les mots</h1>

        <div class="example-container mat-elevation-z8">
            @if (status() == 'loading') {
                <div class="example-loading-shade">
                    <mat-spinner @fadeInOut></mat-spinner>
                </div>
            }

            <div class="example-table-container">
                <!--
                <mat-select (selectionChange)="onTypeChange($event.value)">
                    @for (type of types(); track type) {
                        <mat-option [value]="type.id">{{ type.name }}</mat-option>
                    }
                </mat-select>
                
                <mat-form-field appearance="fill">
                    <mat-label>Filter</mat-label>
                    <input matInput (keyup)="applyFilter($event)" placeholder="Filter" #input />
                    <button mat-icon-button matSuffix aria-label="Effacer le filtre">
                        <mat-icon>close</mat-icon>
                    </button>
                </mat-form-field>
                -->

                <table mat-table [dataSource]="data()" class="example-table" matSort matSortActive="name" matSortDisableClear matSortDirection="asc">
                    <ng-container matColumnDef="name">
                        <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
                        <td mat-cell *matCellDef="let row">{{ row.name }}</td>
                    </ng-container>

                    <!-- Star Column -->
                    <ng-container matColumnDef="star" stickyEnd>
                        <th mat-header-cell *matHeaderCellDef style="width: 50px;" aria-label="row actions">&nbsp;</th>
                        <td mat-cell *matCellDef="let row">
                            <div class="flex gap-2">
                                <a
                                    (click)="openEdit(row)"
                                    class="w-[50px] h-[50px] flex items-center justify-center rounded-lg hover:bg-gray-100 transition duration-200 cursor-pointer text-gray-500 border border-gray-200">
                                    <i class="fa-regular fa-pen-to-square text-xl text-sky-600" aria-hidden="true"></i>
                                </a>

                                <a
                                    (click)="openDelete(row)"
                                    class="w-[50px] h-[50px] flex items-center justify-center rounded-lg hover:bg-gray-100 transition duration-200 cursor-pointer text-gray-500 border border-gray-200">
                                    <i class="fa-regular fa-trash-can text-xl text-sky-600" aria-hidden="true"></i>
                                </a>
                            </div>
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
                aria-label="Sélection page des mots"></mat-paginator>
        </div>
    `,
    imports: [MatProgressSpinnerModule, MatTableModule, MatSortModule, MatPaginatorModule, MatFormFieldModule, MatSelectModule, ReactiveFormsModule],
    animations: [
        trigger('fadeInOut', [
            transition(':enter', [style({ opacity: 0 }), animate('400ms ease-in', style({ opacity: 1 }))]),
            transition(':leave', [animate('400ms ease-out', style({ opacity: 0 }))])
        ])
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

    displayedColumns: string[] = ['name', 'star'];

    langueId: number = -1;

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

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
            data: word
        });

        dialogRef.afterClosed().subscribe(wordId => {
            if (wordId !== undefined) {
                this.#wordGridStore.delete(wordId);
            }
        });
    }
}
