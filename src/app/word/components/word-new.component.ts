import { CommonModule } from '@angular/common';
import { Component, effect, inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WordFormComponent } from '@root/app/word/components/word-form.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslatePipe } from '@ngx-translate/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { WordStore } from '../word-store';

@Component({
    selector: 'app-word-new',
    template: `
        <div class="word-new__container">
            <mat-card class="word-new__card cardWithShadow b-1 rounded p-30">
                <app-word-form #wordFormRef [form]="form" mode="create" [useCard]="false"></app-word-form>
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
            </mat-card>
        </div>
    `,
    encapsulation: ViewEncapsulation.None,
    imports: [CommonModule, WordFormComponent, MatButtonModule, MatCardModule, TranslatePipe, MatProgressBarModule],
    styles: [
        `
            .word-new__loader-bar {
                height: 4px;
                margin-bottom: 12px;
            }

            .word-new__container {
                display: flex;
                justify-content: flex-start;
                padding-left: 32px;
            }

            .word-new__card {
                width: 100%;
                max-width: 640px;
                padding-bottom: 24px;
            }

            .word-new__footer {
                margin-top: 12px;
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

        effect(() => {
            const loading = this.isLoading();
            if (loading && this.form.enabled) {
                this.form.disable({ emitEvent: false });
            } else if (!loading && this.form.disabled) {
                this.form.enable({ emitEvent: false });
            }
        });
    }

    isLoading(): boolean {
        return this.status() === 'loading';
    }
}
