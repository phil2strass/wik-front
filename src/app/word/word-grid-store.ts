import { computed, effect, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MessageService } from 'src/app/shared/ui-messaging/message/message.service';
import { pipe, switchMap } from 'rxjs';
import { tap } from 'rxjs/operators';
import { mapResponse } from '@ngrx/operators';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { Configuration } from '../shared/config/configuration';
import { Word } from './models/word.model';
import { SecurityStore } from '@shared/security/security-store';

const WORD_GRID_PAGE_SIZE_KEY = 'word-grid-page-size';
const DEFAULT_PAGE_SIZE = 10;

const readStoredPageSize = (): number => {
    if (typeof window === 'undefined') {
        return DEFAULT_PAGE_SIZE;
    }
    const stored = window.localStorage.getItem(WORD_GRID_PAGE_SIZE_KEY);
    const parsed = stored ? Number(stored) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PAGE_SIZE;
};

const persistPageSize = (size: number): void => {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.setItem(WORD_GRID_PAGE_SIZE_KEY, size.toString());
};

export const WordGridStore = signalStore(
    { providedIn: 'root' },
    withState({
        status: 'init' as 'init' | 'loading' | 'loaded',
        pageIndex: 0,
        pageSize: readStoredPageSize(),
        sortField: 'name',
        sortDirection: 'asc',
        resultsLength: 0,
        data: [] as Word[],
        typeFilter: null as number | null
    }),
    withComputed(state => ({
        status: computed(() => state.status()),
        data: computed(() => state.data()),
        pageSize: computed(() => state.pageSize()),
        resultsLength: computed(() => state.resultsLength()),
        typeFilter: computed(() => state.typeFilter())
    })),
    withMethods(store => {
        const httpClient = inject(HttpClient);
        const baseUrl = inject(Configuration).baseUrl;
        const messageService = inject(MessageService);
        const securityStore = inject(SecurityStore);

        const load = () => {
            patchState(store, { status: 'loading' });

            const langueSelectedId = securityStore.langueSelected();

            let params = new HttpParams();
            if (langueSelectedId != null) {
                params = params.set('langueId', langueSelectedId.toString());
            }
            const typeFilter = store.typeFilter();
            if (typeFilter != null) {
                params = params.set('typeId', typeFilter.toString());
            }
            params = params
                .set('page', store.pageIndex().toString())
                .set('size', store.pageSize().toString())
                .set('sort', store.sortField() + ',' + store.sortDirection());

            httpClient
                .get<Word>(`${baseUrl}word/search`, { params, observe: 'response' })
                .pipe(
                    mapResponse({
                        next: (response: any) => {
                            const data = Array.isArray(response.body) ? (response.body as Word[]) : [];
                            const totalCountHeader = response.headers.get('X-Total-Count');
                            const resultsLength = totalCountHeader ? Number(totalCountHeader) : 0;
                            patchState(store, { data, resultsLength });
                        },
                        error: (err: any) => {
                            messageService.error(err.error);
                        }
                    }),
                    tap(() => patchState(store, { status: 'loaded' }))
                )
                .subscribe();
        };

        return {
            load,
            setSort: (field: string, direction: 'asc' | 'desc') => {
                patchState(store, { sortField: field, sortDirection: direction });
                patchState(store, { pageIndex: 0 });
                load();
            },
            setPage: (pageIndex: number, pageSize: number) => {
                if (store.pageSize() !== pageSize) {
                    persistPageSize(pageSize);
                }
                patchState(store, { pageIndex, pageSize });
                load();
            },
            setTypeFilter: (typeId: number | null) => {
                patchState(store, { typeFilter: typeId, pageIndex: 0 });
                load();
            },
            delete: rxMethod<number>(
                pipe(
                    tap(() => patchState(store, { status: 'loading' })),
                    switchMap(wordLangueTypeId =>
                        httpClient.delete(`${baseUrl}word/${wordLangueTypeId}`).pipe(
                            mapResponse({
                                next: () => {
                                    messageService.info('Suppression réussie');
                                    load();
                                },
                                error: (err: any) => {
                                    messageService.error(err.error);
                                }
                            }),
                            tap(() => patchState(store, { status: 'loaded' }))
                        )
                    )
                )
            ),
            deleteMany: rxMethod<number[]>(
                pipe(
                    tap(() => patchState(store, { status: 'loading' })),
                    switchMap(wordLangueTypeIds =>
                        httpClient.post(`${baseUrl}word/bulk-delete`, wordLangueTypeIds).pipe(
                            mapResponse({
                                next: () => {
                                    messageService.info('Suppression réussie');
                                    load();
                                },
                                error: (err: any) => {
                                    messageService.error(err.error);
                                }
                            }),
                            tap(() => patchState(store, { status: 'loaded' }))
                        )
                    )
                )
            )
        };
    }),
    withHooks({
        onInit(store) {
            const securityStore = inject(SecurityStore);
            const langueSelectedId = securityStore.langueSelected;
            let langueIdActuelle: number | undefined = undefined;

            effect(() => {
                const langueId = langueSelectedId();
                if (langueId !== langueIdActuelle) {
                    langueIdActuelle = langueId;
                    store.load();
                }
            });
        }
    })
);
