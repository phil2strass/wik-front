import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExampleService } from '../../services/example.service';
import { WordExample } from '../../models/example.model';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';

export type ExampleDialogData = {
    wordTypeId: number;
    wordLabel: string;
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
        ReactiveFormsModule,
        TranslateModule
    ]
})
export class ExampleDialogComponent {
    #fb = inject(FormBuilder);
    #exampleService = inject(ExampleService);
    #messageService = inject(MessageService);

    examplesForm: FormArray<FormGroup> = this.#fb.array<FormGroup>([]);
    loading = false;
    editingIndex: number | null = null;

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
                    if (!examples.length) {
                        this.addExample();
                        return;
                    }
                    examples.forEach(example =>
                        this.forms.push(
                            this.#fb.group({
                                id: [example.id],
                                content: [example.content, [Validators.required, Validators.maxLength(500)]]
                            })
                        )
                    );
                },
                error: err => {
                    this.#messageService.error(err?.error ?? 'Erreur lors du chargement des exemples');
                    this.addExample();
                }
            });
    }

    startEdit(index: number): void {
        this.editingIndex = index;
    }

    cancelEdit(): void {
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
                    this.editingIndex = null;
                },
                error: err => {
                    this.#messageService.error(err?.error ?? 'Erreur lors de la sauvegarde');
                }
            });
    }

    close(): void {
        this.dialogRef.close();
    }
}
