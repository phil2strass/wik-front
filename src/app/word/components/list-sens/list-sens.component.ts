import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { DataStore } from '@shared/data/data-store';
import { Configuration } from '@shared/config/configuration';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { SecurityStore } from '@shared/security/security-store';
import { MaterialModule } from '@root/app/material.module';
import { Word } from '../../models/word.model';

@Component({
    selector: 'app-list-sens',
    templateUrl: './list-sens.component.html',
    styleUrls: ['./list-sens.component.scss'],
    standalone: true,
    imports: [CommonModule, MaterialModule, TranslateModule]
})
export class ListSensComponent {
    readonly #dataStore = inject(DataStore);
    readonly #http = inject(HttpClient);
    readonly #baseUrl = inject(Configuration).baseUrl;
    readonly #messageService = inject(MessageService);
    readonly #securityStore = inject(SecurityStore);

    protected readonly types = this.#dataStore.types;
    protected readonly selectedTypeId = signal<number | null>(null);
    protected readonly words = signal<Word[]>([]);
    protected readonly status = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');
    protected readonly senseCounts = signal<Record<number, number>>({});

    onTypeChange(typeId: number | null): void {
        this.selectedTypeId.set(typeId ?? null);

        if (typeId == null) {
            this.words.set([]);
            this.senseCounts.set({});
            this.status.set('idle');
            return;
        }

        this.loadWords(typeId);
    }

    trackByWord = (_index: number, word: Word): number => word.wordLangueTypeId ?? _index;

    displayWord(word: Word): string {
        const display = word.displayName?.trim();
        return display ? display : word.name;
    }

    private loadWords(typeId: number): void {
        this.status.set('loading');

        let params = new HttpParams()
            .set('typeId', typeId.toString())
            .set('page', '0')
            .set('size', '200')
            .set('sort', 'name,asc');

        const langueId = this.#securityStore.langueSelected();
        if (langueId != null) {
            params = params.set('langueId', langueId.toString());
        }

        this.#http.get<Word[]>(`${this.#baseUrl}word/search`, { params }).subscribe({
            next: data => {
                const words = Array.isArray(data) ? data : [];
                this.words.set(words);
                this.fetchSenseCounts(words);
                this.status.set('loaded');
            },
            error: err => {
                this.status.set('error');
                this.words.set([]);
                this.senseCounts.set({});
                this.#messageService.error(err?.error ?? err);
            }
        });
    }

    private fetchSenseCounts(words: Word[]): void {
        const ids = words
            .map(word => word.wordLangueTypeId)
            .filter(id => typeof id === 'number');
        if (ids.length === 0) {
            this.senseCounts.set({});
            return;
        }
        let params = new HttpParams();
        ids.forEach(id => {
            params = params.append('wordLangueTypeIds', id.toString());
        });
        this.#http.get<Record<string, number>>(`${this.#baseUrl}sens/count`, { params }).subscribe({
            next: data => {
                const mapped: Record<number, number> = {};
                if (data && typeof data === 'object') {
                    Object.entries(data).forEach(([key, value]) => {
                        const numericKey = Number(key);
                        if (Number.isFinite(numericKey)) {
                            mapped[numericKey] = Number(value);
                        }
                    });
                }
                this.senseCounts.set(mapped);
            },
            error: () => this.senseCounts.set({})
        });
    }
}
