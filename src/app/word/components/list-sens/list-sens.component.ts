import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subscription, timer } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { DataStore } from '@shared/data/data-store';
import { Configuration } from '@shared/config/configuration';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { SecurityStore } from '@shared/security/security-store';
import { MaterialModule } from '@root/app/material.module';
import { Word } from '../../models/word.model';
import { CHAT_GPT_BATCH_COUNT, CHAT_GPT_BATCH_SIZE } from '@shared/config/ai-config';

@Component({
    selector: 'app-list-sens',
    templateUrl: './list-sens.component.html',
    styleUrls: ['./list-sens.component.scss'],
    standalone: true,
    imports: [CommonModule, MaterialModule, TranslateModule]
})
export class ListSensComponent implements OnDestroy {
    readonly #dataStore = inject(DataStore);
    readonly #http = inject(HttpClient);
    readonly #baseUrl = inject(Configuration).baseUrl;
    readonly #messageService = inject(MessageService);
    readonly #securityStore = inject(SecurityStore);

    protected readonly types = this.#dataStore.types;
    protected readonly selectedTypeId = signal<number | null>(null);
    protected readonly words = signal<Word[]>([]);
    protected readonly status = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');
    protected readonly wordBlocks = computed(() => this.chunkWords(this.words(), CHAT_GPT_BATCH_SIZE));
    protected readonly aiLoading = signal(false);
    protected readonly aiJobStatus = signal<{
        status: string;
        batches: number;
        completedBatches: number;
        jobId: string;
        errors?: any[];
        importErrors?: any[];
    } | null>(null);
    protected readonly aiJobFirstError = computed(() => this.aiJobStatus()?.errors?.[0] ?? null);
    protected readonly aiJobFirstImportError = computed(() => this.aiJobStatus()?.importErrors?.[0] ?? null);
    private readonly separatorLine = '--------------------';
    #aiJobPollSub?: Subscription;

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

    ngOnDestroy(): void {
        this.#aiJobPollSub?.unsubscribe();
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

    triggerChatGpt(): void {
        const typeId = this.selectedTypeId();
        if (typeId == null) {
            this.#messageService.error('Type manquant');
            return;
        }
        if (this.status() !== 'loaded') {
            this.#messageService.error('Liste non chargée');
            return;
        }
        const total = this.words().length;
        if (total === 0) {
            this.#messageService.error('Aucun mot à traiter');
            return;
        }
        const batchSize = CHAT_GPT_BATCH_SIZE;
        const batchCount = CHAT_GPT_BATCH_COUNT;
        const count = Math.min(total, batchSize * batchCount);
        const langueId = this.#securityStore.langueSelected();
        if (langueId == null) {
            this.#messageService.error('Langue non sélectionnée');
            return;
        }
        const params = new HttpParams()
            .set('langueId', langueId.toString())
            .set('typeId', typeId.toString())
            .set('count', count.toString())
            .set('batchSize', batchSize.toString())
            .set('batchCount', batchCount.toString())
            .set('import', 'true');

        this.aiLoading.set(true);
        this.#http.post<any>(`${this.#baseUrl}ai/sens/generate-missing-async`, null, { params }).subscribe({
            next: res => {
                const jobId = res?.jobId ?? '';
                const batches = res?.batches ?? 0;
                this.#messageService.info(`ChatGPT lancé (${batches} lots)${jobId ? `, job ${jobId}` : ''}`);
                if (jobId) {
                    this.startJobPolling(jobId);
                }
            },
            error: err => {
                this.#messageService.error(err?.error ?? "Erreur lors de l'appel ChatGPT");
            },
            complete: () => this.aiLoading.set(false)
        });
    }

    private startJobPolling(jobId: string): void {
        this.#aiJobPollSub?.unsubscribe();
        this.aiJobStatus.set({ status: 'PENDING', batches: 0, completedBatches: 0, jobId });
        this.#aiJobPollSub = timer(0, 2000)
            .pipe(
                switchMap(() => this.#http.get<any>(`${this.#baseUrl}ai/sens/jobs/${jobId}`)),
                takeWhile(res => res?.status !== 'DONE' && res?.status !== 'FAILED', true)
            )
            .subscribe({
                next: res => {
                    this.aiJobStatus.set({
                        status: res?.status ?? 'UNKNOWN',
                        batches: res?.batches ?? 0,
                        completedBatches: res?.completedBatches ?? 0,
                        jobId,
                        errors: Array.isArray(res?.errors) ? res.errors : [],
                        importErrors: Array.isArray(res?.importResult?.errors) ? res.importResult.errors : []
                    });
                    if (res?.status === 'DONE') {
                        const errorCount = Array.isArray(res?.errors) ? res.errors.length : 0;
                        const importErrorCount = Array.isArray(res?.importResult?.errors) ? res.importResult.errors.length : 0;
                        if (errorCount > 0 || importErrorCount > 0) {
                            this.#messageService.error(`ChatGPT terminé avec ${errorCount + importErrorCount} erreur(s)`);
                        } else {
                            this.#messageService.info(`ChatGPT terminé (${res?.items ?? 0} mots)`);
                        }
                        const typeId = this.selectedTypeId();
                        if (typeId != null) {
                            this.loadWords(typeId);
                        }
                        this.#aiJobPollSub?.unsubscribe();
                    } else if (res?.status === 'FAILED') {
                        this.#messageService.error(res?.error ?? 'ChatGPT échoué');
                        this.#aiJobPollSub?.unsubscribe();
                    }
                },
                error: () => {
                    this.#messageService.error("Erreur lors du suivi ChatGPT");
                    this.#aiJobPollSub?.unsubscribe();
                }
            });
    }
}
