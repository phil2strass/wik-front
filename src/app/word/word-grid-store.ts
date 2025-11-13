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

export const WordGridStore = signalStore(
    { providedIn: 'root' },
    withState({
        status: 'init' as 'init' | 'loading' | 'loaded',
        pageIndex: 0,
        pageSize: 10,
        sortField: 'name',
        sortDirection: 'asc',
        resultsLength: 0,
        data: []
    }),
    withComputed(state => ({
        status: computed(() => state.status()),
        data: computed(() => state.data()),
        pageSize: computed(() => state.pageSize()),
        resultsLength: computed(() => state.resultsLength())
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
            params = params
                .set('page', store.pageIndex().toString())
                .set('size', store.pageSize().toString())
                .set('sort', store.sortField() + ',' + store.sortDirection());

            httpClient
                .get<Word>(`${baseUrl}word/search`, { params, observe: 'response' })
                .pipe(
                    mapResponse({
                        next: (response: any) => {
                            const data = response.body;
                            const resultsLength = response.headers.get('X-Total-Count');
                            patchState(store, { data });
                            patchState(store, { resultsLength });
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
                patchState(store, { pageIndex, pageSize });
                load();
            },
            delete: rxMethod<number>(
                pipe(
                    tap(() => patchState(store, { status: 'loading' })),
                    switchMap(wordTypeId =>
                        httpClient.delete(`${baseUrl}word/${wordTypeId}`).pipe(
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
