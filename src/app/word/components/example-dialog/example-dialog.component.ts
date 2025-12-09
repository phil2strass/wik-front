import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { IconModule } from '@root/app/icon/icon.module';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExampleService } from '../../services/example.service';
import { WordExample } from '../../models/example.model';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Langue } from '@shared/data/models/langue.model';
import { ExampleDeleteDialogComponent } from './example-delete-dialog.component';

export type ExampleDialogData = {
    wordTypeId: number;
    wordLabel: string;
    langue?: Langue;
};

@Component({
    selector: 'app-example-dialog',
    standalone: true,
    templateUrl: './example-dialog.component.html',
    styleUrls: ['./example-dialog.component.scss'],
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
export class ExampleDialogComponent {
    #fb = inject(FormBuilder);
    #exampleService = inject(ExampleService);
    #messageService = inject(MessageService);
    #translate = inject(TranslateService);
    #dialog = inject(MatDialog);

    examplesForm: FormArray<FormGroup> = this.#fb.array<FormGroup>([]);
    loading = false;
    editingIndex: number | null = null;
    addingNew = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: ExampleDialogData,
        private dialogRef: MatDialogRef<ExampleDialogComponent>
    ) {
        this.loadExamples();
    }

    get forms(): FormArray<FormGroup> {
        return this.examplesForm;
    }

    addExample(): void {
        this.forms.push(
            this.#fb.group({
                id: [null],
                content: ['', [Validators.required, Validators.maxLength(500)]]
            })
        );
        this.editingIndex = this.forms.length - 1;
        this.addingNew = true;
    }

    loadExamples(): void {
        this.loading = true;
        this.examplesForm.clear();
        this.#exampleService
            .getExamples(this.data.wordTypeId)
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: (examples: WordExample[]) => {
                    this.editingIndex = null;
                    this.addingNew = false;
                    if (examples.length) {
                        examples.forEach(example =>
                            this.forms.push(
                                this.#fb.group({
                                    id: [example.id],
                                    content: [example.content, [Validators.required, Validators.maxLength(500)]]
                                })
                            )
                        );
                    }
                },
                error: err => {
                    this.#messageService.error(err?.error ?? 'Erreur lors du chargement des exemples');
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

    saveExample(index: number): void {
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
            ? this.#exampleService.updateExample(id, content)
            : this.#exampleService.createExample(this.data.wordTypeId, content);

        request$
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: example => {
                    group.patchValue({ id: example.id });
                    this.#messageService.info('Exemple enregistré');
                    this.addingNew = false;
                    this.editingIndex = null;
                },
                error: err => {
                    this.#messageService.error(err?.error ?? 'Erreur lors de la sauvegarde');
                }
            });
    }

    deleteExample(index: number): void {
        const group = this.forms.at(index);
        if (!group || this.loading) {
            return;
        }
        const id = group.get('id')?.value;
        const dialogRef = this.#dialog.open(ExampleDeleteDialogComponent, {
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
            this.#exampleService
                .deleteExample(id)
                .pipe(finalize(() => (this.loading = false)))
                .subscribe({
                    next: () => {
                        this.forms.removeAt(index);
                        this.editingIndex = null;
                        this.#messageService.info('Exemple supprimé');
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
