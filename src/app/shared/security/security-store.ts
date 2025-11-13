import { computed, inject, PLATFORM_ID } from '@angular/core';
import { KeycloakService } from './internal/keycloak-service';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Configuration } from '../config/configuration';
import { mapResponse } from '@ngrx/operators';
import { finalize } from 'rxjs';
import { Langue } from '@shared/data/models/langue.model';
import { Profil, ProfilStorage, User } from '@shared/models/user.model';

export interface SecurityState {
    loaded: boolean;
    user: User | undefined;
}

const initialState: SecurityState = {
    loaded: false,
    user: undefined
};

export const ANONYMOUS_USER: User = {
    id: '',
    email: 'nomail',
    profil: undefined,
    anonymous: true,
    bearer: ''
};

export const SecurityStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    withComputed(state => ({
        loadedUser: computed(() => (state.loaded() ? state.user() : undefined)),
        loadedProfil: computed(() => {
            const user = state.user();
            return state.loaded() && user ? user.profil : undefined;
        }),
        signedIn: computed(() => state.loaded() && !state.user()?.anonymous),
        langues: computed(() => {
            const user = state.user();
            return user && user.profil ? user.profil.langues : [];
        }),
        langueSelected: computed(() => {
            const user = state.user();
            return user && user.profil ? user.profil.langueSelected : 2;
        })
    })),
    withMethods(store => {
        const keycloakService = inject(KeycloakService);
        const httpClient = inject(HttpClient);
        const baseUrl = inject(Configuration).baseUrl;

        return {
            async signIn() {
                localStorage.removeItem('profil');
                await keycloakService.keycloak.login({
                    // Use a clean redirect URI without hash or transient params
                    redirectUri: window.location.origin + window.location.pathname
                });
            },
            async signOut() {
                await keycloakService.logout();
            },
            updateProfil(profilStorage: ProfilStorage) {
                localStorage.setItem('profil', JSON.stringify(profilStorage));
                patchState(store, state => ({
                    loaded: true,
                    user: state.user ? { ...state.user, profil: profilStorage } : undefined
                }));
            },
            updateLangueSelected(langue: Langue) {
                patchState(store, state => ({
                    user: state.user
                        ? { ...state.user, profil: state.user.profil ? { ...state.user.profil, langueSelected: langue.id } : undefined }
                        : undefined
                }));
                if (store.user()?.profil) {
                    localStorage.setItem('profil', JSON.stringify(store.user()?.profil));
                }
                httpClient.put(baseUrl + 'user/profil/langue', langue.id).subscribe();
            },
            async loadProfil() {
                httpClient
                    .get<ProfilStorage>(baseUrl + 'user')
                    .pipe(
                        mapResponse({
                            next: profilFromDB => {
                                this.updateProfil(profilFromDB);
                            },
                            error: () => {
                                console.log('error');
                            }
                        }),
                        finalize(() => {
                            patchState(store, { loaded: true });
                        })
                    )
                    .subscribe();
            }
        };
    }),
    withHooks(store => {
        const keycloakService = inject(KeycloakService);
        const isServer = isPlatformServer(inject(PLATFORM_ID));

        return {
            async onInit() {
                if (isServer) {
                    patchState(store, { user: ANONYMOUS_USER, loaded: true });
                    return;
                }
                const isLoggedIn = await keycloakService.init();

                if (isLoggedIn && keycloakService.profile) {
                    const { sub, email, token } = keycloakService.profile;
                    const user: User = {
                        id: sub,
                        email,
                        profil: undefined,
                        anonymous: false,
                        bearer: token
                    };
                    // Allow navigation immediately; profile details can load afterward
                    patchState(store, { user, loaded: true });

                    let data = localStorage.getItem('profil');
                    if (data) {
                        const profilLocalStorage = JSON.parse(data);
                        patchState(store, state => ({
                            loaded: true,
                            user: state.user ? { ...state.user, profil: profilLocalStorage } : undefined
                        }));
                    } else {
                        store.loadProfil();
                    }
                } else {
                    patchState(store, { user: ANONYMOUS_USER, loaded: true });
                }
            }
        };
    })
);
