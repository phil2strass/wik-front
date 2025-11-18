import { computed, effect, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'src/app/shared/ui-messaging/message/message.service';
import { pipe, switchMap } from 'rxjs';
import { tap } from 'rxjs/operators';
import { mapResponse } from '@ngrx/operators';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { Configuration } from '../shared/config/configuration';
import { withLoader } from '../shared/ui-messaging/loader/loader';
import { Gender } from '@shared/data/models/langue.model';
import { SecurityStore } from '@shared/security/security-store';
import { Validators } from '@angular/forms';
import { DataStore } from '@shared/data/data-store';

export interface Word {
    name: string;
    langueId: number | undefined;
    typeId: number | undefined;
    genderId: number | undefined;
    plural: string;
    genders: Gender[];
}

const initialWordState: Word = {
    name: '',
    langueId: undefined,
    typeId: undefined,
    genderId: undefined,
    plural: '',
    genders: []
};

export const WordStore = signalStore(
    { providedIn: 'root' },
    withState({
        word: initialWordState,
        status: 'init' as 'init' | 'loading' | 'loaded',
        action: 'wait' as 'wait' | 'created' | 'updated'
    }),
    withComputed(state => ({
        status: computed(() => state.status()),
        action: computed(() => {
            if (state.status() === 'loading') return 'wait';
            return state.action();
        }),
        genders: computed(() => state.word().genders)
    })),
    withMethods(store => {
        const httpClient = inject(HttpClient);
        const baseUrl = inject(Configuration).baseUrl;
        const messageService = inject(MessageService);

        return {
            actionInit: () => {
                patchState(store, { action: 'wait' });
            },
            create: rxMethod<Word>(
                pipe(
                    tap(() => patchState(store, { status: 'loading' })),
                    switchMap(word =>
                        httpClient.post<Word>(baseUrl + 'word', word).pipe(
                            mapResponse({
                                next: () => {
                                    messageService.info('Created');
                                    patchState(store, { action: 'created' });
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
            update: rxMethod<Word>(
                pipe(
                    tap(() => patchState(store, { status: 'loading' })),
                    switchMap(word =>
                        httpClient.put<Word>(baseUrl + 'word', word).pipe(
                            mapResponse({
                                next: () => {
                                    messageService.info('Bien enregistré !');
                                    patchState(store, { action: 'updated' });
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
            test() {
                patchState(store, { status: 'loading' });
                setTimeout(() => {
                    patchState(store, { status: 'loaded' });
                }, 3000);
            }
        };
    }),
    withHooks({
        onInit(store) {
            const dataStore = inject(DataStore);
            const securityStore = inject(SecurityStore);
            const langueSelectedId = securityStore.langueSelected;
            let langueIdActuelle: number = -1;

            effect(() => {
                const langueId = langueSelectedId();
                const langues = dataStore.langues();

                if (langues.length > 0 && langueId && langueId != langueIdActuelle) {
                    langueIdActuelle = langueId;
                    const genders = langues.filter((langue: any) => langue.id === langueIdActuelle)?.[0]?.genders;
                    patchState(store, { word: { ...store.word(), genders } });
                }
            });
        }
    }),
    withLoader()
);
