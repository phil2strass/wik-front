import { computed, inject, PLATFORM_ID } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { HttpClient } from '@angular/common/http';
import { Configuration } from '@shared/config/configuration';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { pipe, switchMap } from 'rxjs';
import { tap } from 'rxjs/operators';
import { mapResponse } from '@ngrx/operators';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { Profil, ProfilPhoto, ProfilStorage, User } from '@shared/models/user.model';
import { SecurityStore } from '@shared/security/security-store';

export interface ProfilState {
    status: 'init' | 'loading' | 'loaded' | 'updated';
    statusPhoto: 'init' | 'loading' | 'loaded' | 'updated';
    profil: Profil;
}

const emptyProfil: Profil = {
    name: undefined,
    photo: undefined,
    langueSelected: undefined,
    langueMaternelle: undefined,
    langues: undefined
};

const initialState: ProfilState = {
    status: 'init' as 'init' | 'loading' | 'loaded' | 'updated',
    statusPhoto: 'init' as 'init' | 'loading' | 'loaded' | 'updated',
    profil: emptyProfil
};

export const ProfilStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    withComputed(state => ({
        status: computed(() => state.status()),
        profil: computed(() => state.profil())
    })),
    withMethods(store => {
        const httpClient = inject(HttpClient);
        const baseUrl = inject(Configuration).baseUrl;
        const messageService = inject(MessageService);
        const securityStore = inject(SecurityStore);

        return {
            update: rxMethod<Profil>(
                pipe(
                    tap(() => patchState(store, { status: 'loading' })),
                    switchMap(profil =>
                        httpClient.put<Profil>(baseUrl + 'user/profil', profil).pipe(
                            mapResponse({
                                next: (profil: Profil) => {
                                    messageService.info('Bien enregistré');
                                    patchState(store, { profil: profil });
                                    securityStore.loadProfil();
                                    patchState(store, { status: 'updated' });
                                    setTimeout(() => {
                                        patchState(store, { status: 'loaded' });
                                    }, 0);
                                },
                                error: () => {
                                    messageService.error('Erreur rencontrée');
                                    patchState(store, { status: 'loaded' });
                                }
                            })
                        )
                    )
                )
            ),
            uploadPhoto: rxMethod<FormData>(
                pipe(
                    tap(() => patchState(store, { statusPhoto: 'loading' })),
                    switchMap(formData =>
                        httpClient.post<Profil>(baseUrl + 'user/upload-photo', formData).pipe(
                            mapResponse({
                                next: (profil: Profil) => {
                                    patchState(store, { profil: profil });
                                    securityStore.loadProfil();
                                },
                                error: () => {
                                    messageService.error('Erreur rencontrée');
                                }
                            }),
                            tap(() => patchState(store, { statusPhoto: 'loaded' }))
                        )
                    )
                )
            ),
            removePhoto: rxMethod<void>(
                pipe(
                    tap(() => patchState(store, { statusPhoto: 'loading' })),
                    switchMap(() =>
                        httpClient.delete<Profil>(baseUrl + 'user/photo').pipe(
                            mapResponse({
                                next: (profil: Profil) => {
                                    patchState(store, { profil: profil });
                                    securityStore.loadProfil();
                                },
                                error: () => {
                                    messageService.error('Erreur rencontrée');
                                }
                            }),
                            tap(() => patchState(store, { statusPhoto: 'loaded' }))
                        )
                    )
                )
            )
        };
    }),
    withHooks(store => {
        const httpClient = inject(HttpClient);
        const baseUrl = inject(Configuration).baseUrl;
        const messageService = inject(MessageService);

        patchState(store, { status: 'loading' });

        httpClient
            .get<Profil>(baseUrl + 'user/profil')
            .pipe(
                mapResponse({
                    next: (profil: Profil) => {
                        patchState(store, { profil: profil ?? emptyProfil });
                    },
                    error: () => {
                        messageService.error('Erreur rencontrée');
                    }
                }),
                tap(() => patchState(store, { status: 'loaded' }))
            )
            .subscribe();

        return {};
    })
);
