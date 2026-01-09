import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExampleService } from '../../services/example.service';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { Langue } from '@shared/data/models/langue.model';

export type ExampleTranslationDialogData = {
    wordLangueTypeId: number;
    wordLabel: string;
    langue?: Langue;
    languages?: Langue[];
};

@Component({
    selector: 'app-example-translation-dialog',
    standalone: true,
    templateUrl: './example-translation-dialog.component.html',
    styleUrls: ['./example-dialog.component.scss', './example-translation-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        MatDialogContent,
        MatDialogActions,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        ReactiveFormsModule,
        TranslateModule
    ]
})
export class ExampleTranslationDialogComponent {
    #fb = inject(FormBuilder);
    #exampleService = inject(ExampleService);
    #messageService = inject(MessageService);
    #translate = inject(TranslateService);

    contentControl = this.#fb.control('', [Validators.required, Validators.maxLength(500)]);
    loading = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: ExampleTranslationDialogData,
        private dialogRef: MatDialogRef<ExampleTranslationDialogComponent>
    ) {}

    cancel(): void {
        this.dialogRef.close();
    }

    submit(): void {
        if (this.contentControl.invalid) {
            this.contentControl.markAsTouched();
            return;
        }
        const content = (this.contentControl.value ?? '').toString().trim();
        if (!content) {
            this.contentControl.setErrors({ required: true });
            this.contentControl.markAsTouched();
            return;
        }
        if (!this.data.wordLangueTypeId) {
            return;
        }
        this.loading = true;
        this.#exampleService
            .createExample(this.data.wordLangueTypeId, content)
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: () => {
                    this.#messageService.info(this.#translate.instant('word.examples.save'));
                    this.dialogRef.close(true);
                },
                error: err => {
                    this.#messageService.error(err?.error ?? 'Erreur lors de la sauvegarde');
                }
            });
    }
}
