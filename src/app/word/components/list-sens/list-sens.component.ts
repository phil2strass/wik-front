import { Component, computed, inject, signal } from '@angular/core';
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
    protected readonly wordBlocks = computed(() => this.chunkWords(this.words(), 25));
    private readonly separatorLine = '--------------------';

    onTypeChange(typeId: number | null): void {
        this.selectedTypeId.set(typeId ?? null);

        if (typeId == null) {
            this.words.set([]);
            this.status.set('idle');
            return;
        }

        this.loadWords(typeId);
    }

    trackByWord = (_index: number, word: Word): number => word.wordLangueTypeId ?? _index;

    displayWord(word: Word): string {
        const display = word.displayName?.trim();
        const label = display ? display : word.name;
        const id = word.wordLangueTypeId;
        return id != null ? `${id} ${label}` : label;
    }

    private chunkWords(words: Word[], size: number): Word[][] {
        const blocks: Word[][] = [];
        for (let index = 0; index < words.length; index += size) {
            blocks.push(words.slice(index, index + size));
        }
        return blocks;
    }

    private loadWords(typeId: number): void {
        this.status.set('loading');

        const langueId = this.#securityStore.langueSelected();
        if (langueId == null) {
            this.status.set('error');
            this.words.set([]);
            this.#messageService.error('Langue non sélectionnée');
            return;
        }
        let params = new HttpParams()
            .set('typeId', typeId.toString())
            .set('langueId', langueId.toString());

        this.#http.get<Word[]>(`${this.#baseUrl}word/without-senses`, { params }).subscribe({
            next: data => {
                this.words.set(Array.isArray(data) ? data : []);
                this.status.set('loaded');
            },
            error: err => {
                this.status.set('error');
                this.words.set([]);
                this.#messageService.error(err?.error ?? err);
            }
        });
    }

    downloadTxt(): void {
        if (this.status() !== 'loaded' || this.words().length === 0) {
            return;
        }

        const blocks = this.wordBlocks();
        const lines: string[] = [];

        blocks.forEach((block, index) => {
            block.forEach(word => {
                lines.push(this.displayWord(word));
            });
            if (index < blocks.length - 1) {
                lines.push(this.separatorLine);
            }
        });

        const content = `${lines.join('\n')}\n`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const typeId = this.selectedTypeId();
        const filename = typeId != null ? `liste-type-${typeId}.txt` : 'liste-type.txt';

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        URL.revokeObjectURL(url);
    }
}
