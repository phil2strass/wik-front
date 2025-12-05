import { Component, inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WordFormComponent } from '@root/app/word/components/word-form.component';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { WordStore } from '../word-store';

@Component({
    selector: 'app-word-new',
    template: `
        <div class="word-new__container">
            <app-word-form #wordFormRef [form]="form" mode="create"></app-word-form>
            <div class="word-new__footer w-100">
                <mat-progress-bar
                    *ngIf="isLoading()"
                    class="word-new__loader-bar"
                    mode="indeterminate"></mat-progress-bar>
                <div class="d-flex gap-20 m-t-12 justify-content-end">
                    <button
                        mat-flat-button
                        color="primary"
                        (click)="wordFormRef.save()"
                        [disabled]="form.invalid || isLoading()">
                        {{ 'word.create' | translate }}
                    </button>
                </div>
            </div>
        </div>
    `,
    encapsulation: ViewEncapsulation.None,
    imports: [WordFormComponent, MatButtonModule, TranslatePipe, MatProgressBarModule],
    styles: [
        `
            .word-new__loader-bar {
                height: 4px;
                margin-bottom: 12px;
            }

            .word-new__footer {
                max-width: 640px;
            }
        `
    ]
})
export class WordNewComponent {
    protected readonly form: FormGroup;
    #formBuilder = inject(FormBuilder);
    #wordStore = inject(WordStore);
    protected readonly status = this.#wordStore.status;

    constructor() {
        this.form = this.#formBuilder.group({
            name: ['', Validators.required],
            typeId: [null, Validators.required],
            genderId: [null],
            plural: ['']
        });
    }

    isLoading(): boolean {
        return this.status() === 'loading';
    }
}
