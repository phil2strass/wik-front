import { computed, inject, PLATFORM_ID } from '@angular/core';
import { KeycloakService } from './internal/keycloak-service';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Configuration } from '../config/configuration';
import { mapResponse } from '@ngrx/operators';
import { finalize } from 'rxjs';
import { Langue } from '@shared/data/models/langue.model';
import { ProfilStorage, User } from '@shared/models/user.model';

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
    bearer: '',
    roles: [],
    groups: []
};

function normalizeLangueId(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    if (value && typeof value === 'object' && 'id' in (value as { id?: unknown })) {
        const parsed = Number((value as { id?: unknown }).id);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}

function normalizeProfil(profil?: ProfilStorage | null): ProfilStorage | undefined {
    if (!profil) {
        return undefined;
    }
    const langueMaternelle = normalizeLangueId(profil.langueMaternelle);
    const langueSelected = normalizeLangueId(profil.langueSelected);
    const langues = Array.isArray(profil.langues)
        ? profil.langues
              .map(langue => normalizeLangueId(langue))
              .filter((id): id is number => id !== undefined)
        : [];

    return {
        ...profil,
        langueMaternelle: langueMaternelle ?? undefined,
        langueSelected: langueSelected ?? undefined,
        langues
    };
}

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
        isAdmin: computed(() => {
            const user = state.user();
            const roles = user?.roles ?? [];
            const groups = user?.groups ?? [];
            return (
                roles.some(role => role.toUpperCase() === 'ADMIN') ||
                groups.some(group => group.toLowerCase() === 'admin')
            );
        }),
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
                const normalizedProfil = normalizeProfil(profilStorage);
                if (normalizedProfil) {
                    localStorage.setItem('profil', JSON.stringify(normalizedProfil));
                } else {
                    localStorage.removeItem('profil');
                }
                patchState(store, state => ({
                    loaded: true,
                    user: state.user ? { ...state.user, profil: normalizedProfil } : undefined
                }));
            },
            updateLangueSelected(langue: Langue) {
                let normalizedProfil: ProfilStorage | undefined;
                patchState(store, state => {
                    const updatedProfil = state.user?.profil ? { ...state.user.profil, langueSelected: langue.id } : undefined;
                    normalizedProfil = normalizeProfil(updatedProfil);
                    return {
                        user: state.user ? { ...state.user, profil: normalizedProfil } : undefined
                    };
                });
                if (normalizedProfil) {
                    localStorage.setItem('profil', JSON.stringify(normalizedProfil));
                } else {
                    localStorage.removeItem('profil');
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
                        bearer: token,
                        roles: keycloakService.profile.roles ?? [],
                        groups: keycloakService.profile.groups ?? []
                    };
                    // Allow navigation immediately; profile details can load afterward
                    patchState(store, { user, loaded: true });

                    let data = localStorage.getItem('profil');
                    let loadedFromStorage = false;
                    if (data) {
                        try {
                            const profilLocalStorage = normalizeProfil(JSON.parse(data));
                            if (profilLocalStorage) {
                                patchState(store, state => ({
                                    loaded: true,
                                    user: state.user ? { ...state.user, profil: profilLocalStorage } : undefined
                                }));
                                loadedFromStorage = true;
                            }
                        } catch {
                            loadedFromStorage = false;
                        }
                    }
                    if (!loadedFromStorage) {
                        store.loadProfil();
                    }
                } else {
                    patchState(store, { user: ANONYMOUS_USER, loaded: true });
                }
            }
        };
    })
);
