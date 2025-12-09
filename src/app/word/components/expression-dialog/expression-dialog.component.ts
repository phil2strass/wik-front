import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExpressionService } from '../../services/expression.service';
import { WordExpression } from '../../models/expression.model';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IconModule } from '@root/app/icon/icon.module';
import { ExpressionDeleteDialogComponent } from './expression-delete-dialog.component';

export type ExpressionDialogData = {
    wordTypeId: number;
    wordLabel: string;
};

@Component({
    selector: 'app-expression-dialog',
    standalone: true,
    templateUrl: './expression-dialog.component.html',
    styleUrls: ['./expression-dialog.component.scss', '../example-dialog/example-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatTooltipModule,
        ReactiveFormsModule,
        TranslateModule,
        IconModule
    ]
})
export class ExpressionDialogComponent {
    #fb = inject(FormBuilder);
    #expressionService = inject(ExpressionService);
    #messageService = inject(MessageService);
    #translate = inject(TranslateService);
    #dialog = inject(MatDialog);

    expressionsForm: FormArray<FormGroup> = this.#fb.array<FormGroup>([]);
    loading = false;
    editingIndex: number | null = null;
    addingNew = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: ExpressionDialogData,
        private dialogRef: MatDialogRef<ExpressionDialogComponent>
    ) {
        this.loadExpressions();
    }

    get forms(): FormArray<FormGroup> {
        return this.expressionsForm;
    }

    addExpression(): void {
        this.forms.push(
            this.#fb.group({
                id: [null],
                content: ['', [Validators.required, Validators.maxLength(500)]]
            })
        );
        this.editingIndex = this.forms.length - 1;
        this.addingNew = true;
    }

    loadExpressions(): void {
        this.loading = true;
        this.expressionsForm.clear();
        this.#expressionService
            .getExpressions(this.data.wordTypeId)
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: (expressions: WordExpression[]) => {
                    this.editingIndex = null;
                    this.addingNew = false;
                    if (expressions.length) {
                        expressions.forEach(expression =>
                            this.forms.push(
                                this.#fb.group({
                                    id: [expression.id],
                                    content: [expression.content, [Validators.required, Validators.maxLength(500)]]
                                })
                            )
                        );
                    }
                },
                error: err => {
                    this.#messageService.error(err?.error ?? 'Erreur lors du chargement des expressions');
                }
            });
    }

    startEdit(index: number): void {
        this.editingIndex = index;
    }

    cancelEdit(): void {
        if (this.editingIndex !== null) {
            const idx = this.editingIndex;
            const group = this.forms.at(idx);
            const id = group?.get('id')?.value;
            const content = (group?.get('content')?.value ?? '').toString().trim();
            const contentControl = group?.get('content');
            contentControl?.markAsPristine();
            contentControl?.markAsUntouched();
            contentControl?.updateValueAndValidity({ onlySelf: true, emitEvent: false });
            if (group && !id) {
                if (!content) {
                    this.forms.removeAt(idx);
                } else {
                    group.get('content')?.setValue(content);
                }
                this.addingNew = false;
            }
        }
        this.editingIndex = null;
    }

    saveExpression(index: number): void {
        const group = this.forms.at(index);
        if (!group) {
            return;
        }
        if (group.invalid) {
            group.markAllAsTouched();
            return;
        }
        const { id, content } = group.value as { id: number | null; content: string };
        this.loading = true;
        const request$ = id
            ? this.#expressionService.updateExpression(id, content)
            : this.#expressionService.createExpression(this.data.wordTypeId, content);

        request$
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: expression => {
                    group.patchValue({ id: expression.id });
                    this.#messageService.info('Expression enregistrée');
                    this.addingNew = false;
                    this.editingIndex = null;
                },
                error: err => {
                    this.#messageService.error(err?.error ?? 'Erreur lors de la sauvegarde');
                }
            });
    }

    deleteExpression(index: number): void {
        const group = this.forms.at(index);
        if (!group || this.loading) {
            return;
        }
        const id = group.get('id')?.value;
        const dialogRef = this.#dialog.open(ExpressionDeleteDialogComponent, {
            width: '420px',
            data: { content: group.get('content')?.value ?? '' }
        });

        dialogRef.afterClosed().subscribe(confirm => {
            if (!confirm) {
                return;
            }
            if (!id) {
                this.forms.removeAt(index);
                if (this.editingIndex === index) {
                    this.editingIndex = null;
                }
                this.addingNew = false;
                return;
            }
            this.loading = true;
            this.#expressionService
                .deleteExpression(id)
                .pipe(finalize(() => (this.loading = false)))
                .subscribe({
                    next: () => {
                        this.forms.removeAt(index);
                        this.editingIndex = null;
                        this.addingNew = false;
                        this.#messageService.info('Expression supprimée');
                    },
                    error: err => {
                        this.#messageService.error(err?.error ?? 'Erreur lors de la suppression');
                    }
                });
        });
    }

    close(): void {
        this.dialogRef.close();
    }
}
