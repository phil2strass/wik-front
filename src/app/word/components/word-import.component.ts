import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { HttpClient } from '@angular/common/http';
import { Configuration } from '@shared/config/configuration';
import { TranslateModule } from '@ngx-translate/core';
import { SecurityStore } from '@shared/security/security-store';
import { Langue } from '@shared/data/models/langue.model';

@Component({
    selector: 'app-word-import',
    standalone: true,
    template: `
        <div class="word-import__container">
            <mat-card class="word-import__card cardWithShadow b-1 rounded p-30">
                <h3 class="m-b-12">{{ 'word.import.title' | translate }}</h3>
                <form [formGroup]="form" class="word-import__form">
                    <mat-form-field appearance="outline" class="w-100" color="primary">
                        <mat-label>{{ 'word.import.label' | translate }}</mat-label>
                        <textarea
                            matInput
                            formControlName="payload"
                            rows="16"
                            placeholder='[
  { "name": "abacus", "type": 1, "plural": null, "translations": [ ... ] }
]'></textarea>
                        <mat-error *ngIf="form.controls['payload'].hasError('required')">
                            {{ 'word.import.required' | translate }}
                        </mat-error>
                    </mat-form-field>
                    <div class="d-flex gap-12 justify-content-end">
                        <button mat-stroked-button color="warn" type="button" (click)="clear()">
                            {{ 'common.actions.reset' | translate }}
                        </button>
                        <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="loading()">
                            {{ 'word.import.submit' | translate }}
                        </button>
                    </div>
                </form>
            </mat-card>
        </div>
    `,
    styles: [
        `
            .word-import__container {
                display: flex;
                justify-content: center;
                padding: 24px;
            }
            .word-import__card {
                width: 100%;
                max-width: 900px;
            }
            .word-import__form {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
        `
    ],
    encapsulation: ViewEncapsulation.None,
    imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, TranslateModule]
})
export class WordImportComponent {
    #fb = inject(FormBuilder);
    #http = inject(HttpClient);
    #config = inject(Configuration);
    #messages = inject(MessageService);
    #securityStore = inject(SecurityStore);

    form: FormGroup = this.#fb.group({
        payload: ['', Validators.required]
    });

    loading = signal(false);

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        let parsed: unknown;
        try {
            parsed = JSON.parse(this.form.value.payload);
            if (!Array.isArray(parsed)) {
                throw new Error('payload.notArray');
            }
        } catch (e) {
            this.#messages.error('JSON invalide');
            return;
        }
        const defaultLangueId = this.#securityStore.langueSelected();
        const payload = (parsed as any[]).map(item => {
            if (!item || typeof item !== 'object') {
                return item;
            }
            if (!item.langue_id && defaultLangueId) {
                return { ...item, langue_id: defaultLangueId };
            }
            return item;
        });
        this.loading.set(true);
        this.#http.post<{ created: number }>(`${this.#config.baseUrl}word/import-json`, payload).subscribe({
            next: res => {
                this.#messages.info(`Import OK (${res?.created ?? 0} mots créés)`);
            },
            error: err => {
                this.#messages.error(err?.error ?? "Erreur lors de l'import");
            },
            complete: () => this.loading.set(false)
        });
    }

    clear(): void {
        this.form.reset({ payload: '' });
    }
}
