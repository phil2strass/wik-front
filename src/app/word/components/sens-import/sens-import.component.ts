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

    form: FormGroup = this.#fb.group({});

    loading = signal(false);
    #selectedFile: File | null = null;

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement | null;
        const file = input?.files?.[0];
        if (!file) {
            return;
        }
        this.#selectedFile = file;
    }

    submit(): void {
        if (!this.#selectedFile) {
            this.#messages.error('Fichier requis');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const text = typeof reader.result === 'string' ? reader.result : '';
            if (!text) {
                this.#messages.error('Fichier vide');
                return;
            }
            let parsed: unknown;
            try {
                const trimmed = text.trim();
                const hasMultipleLines = /\r?\n/.test(trimmed);
                if (!hasMultipleLines) {
                    try {
                        parsed = JSON.parse(trimmed);
                    } catch {
                        parsed = this.parseJsonl(trimmed);
                    }
                } else {
                    parsed = this.parseJsonl(trimmed);
                }
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
        };
        reader.onerror = () => this.#messages.error('Erreur lors de la lecture du fichier');
        reader.readAsText(this.#selectedFile);
    }

    clear(): void {
        this.#selectedFile = null;
        this.form.reset();
    }

    private extractJsonArray(raw: string): string | null {
        if (!raw) {
            return null;
        }
        let text = raw.trim();
        if (text.startsWith('```')) {
            text = text.replace(/^```[a-zA-Z]*\s*/m, '').replace(/```$/m, '').trim();
        }
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start < 0 || end < start) {
            return null;
        }
        return text.substring(start, end + 1);
    }

    private parseJsonl(text: string): unknown[] {
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        const items: any[] = [];
        for (const line of lines) {
            const parsedLine = JSON.parse(line);
            const responseBody = parsedLine?.response?.body;
            if (Array.isArray(responseBody)) {
                items.push(...responseBody);
                continue;
            }
            const content = parsedLine?.response?.body?.choices?.[0]?.message?.content;
            if (typeof content === 'string') {
                const jsonArray = this.extractJsonArray(content);
                if (jsonArray) {
                    const parsedContent = JSON.parse(jsonArray);
                    if (Array.isArray(parsedContent)) {
                        items.push(...parsedContent);
                    } else if (parsedContent) {
                        items.push(parsedContent);
                    }
                }
                continue;
            }
            if (responseBody) {
                items.push(responseBody);
            }
        }
        return items;
    }
}
