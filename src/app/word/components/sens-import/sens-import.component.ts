import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { Configuration } from '@shared/config/configuration';
import { MessageService } from '@shared/ui-messaging/message/message.service';

@Component({
    selector: 'app-sens-import',
    standalone: true,
    templateUrl: './sens-import.component.html',
    styleUrls: ['./sens-import.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        TranslateModule
    ]
})
export class SensImportComponent {
    #fb = inject(FormBuilder);
    #http = inject(HttpClient);
    #config = inject(Configuration);
    #messages = inject(MessageService);

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
            const isObject = parsed && typeof parsed === 'object';
            if (!isObject) {
                throw new Error('payload.notObject');
            }
            if (Array.isArray(parsed) && parsed.length === 0) {
                throw new Error('payload.empty');
            }
        } catch (e) {
            this.#messages.error('JSON invalide');
            return;
        }

        this.loading.set(true);
        this.#http.post<{ createdSenses: number; createdExamples: number }>(`${this.#config.baseUrl}sens/import-json`, parsed).subscribe({
            next: res => {
                const senses = res?.createdSenses ?? 0;
                const examples = res?.createdExamples ?? 0;
                this.#messages.info(`Import OK (${senses} sens, ${examples} exemples)`);
                this.clear();
            },
            error: err => {
                this.#messages.error(err?.error ?? 'Erreur lors de l\'import');
            },
            complete: () => this.loading.set(false)
        });
    }

    clear(): void {
        this.form.reset({ payload: '' });
    }
}
