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

@Component({
    selector: 'app-word-import',
    standalone: true,
    templateUrl: './word-import.component.html',
    styleUrls: ['./word-import.component.scss'],
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
                this.clear();
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
