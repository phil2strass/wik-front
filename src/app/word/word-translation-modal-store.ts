import { computed, effect, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { HttpClient } from '@angular/common/http';
import { mapResponse } from '@ngrx/operators';
import { tap } from 'rxjs/operators';
import { Configuration } from '@shared/config/configuration';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { DataStore } from '@shared/data/data-store';
import { Langue } from '@shared/data/models/langue.model';
import { Type } from '@shared/data/models/type.model';
import { Word, WordTranslationValue } from './models/word.model';

export type TranslationModalStatus = 'init' | 'loading' | 'loaded' | 'error';

export interface WordTranslationModalInit {
    parentWord: Word;
    langue: Langue;
    languages?: Langue[];
    initialTypeId: number | null;
}

export interface WordMeaning {
    wordLangueTypeId: number;
    index: number;
}

export interface WordMeaningTranslation {
    wordLangueTypeId: number;
    index: number;
    wordLangueTypeIdTarget: number | null;
    targetWordLangueTypeId: number | null;
    langueId: number;
    typeId: number;
    name: string;
    genderId: number | null;
    plural: string;
    commentaire?: string | null;
}

interface WordTranslationModalState {
    status: TranslationModalStatus;
    error: string | null;

    parentWordLangueTypeId: number | null;
    baseTypeNames: string[];
    explicitTypeIds: number[];

    languages: Langue[];
    typeOptionIds: number[];
    types: Type[];

    selectedLangueId: number | null;
    selectedTypeId: number | null;
    referenceLangueId: number | null;

    meanings: WordMeaning[];
    meaningTranslations: WordMeaningTranslation[];
    pendingEditMeaningId: number | null;
}

const initialState: WordTranslationModalState = {
    status: 'init',
    error: null,

    parentWordLangueTypeId: null,
    baseTypeNames: [],
    explicitTypeIds: [],

    languages: [],
    typeOptionIds: [],
    types: [],

    selectedLangueId: null,
    selectedTypeId: null,
    referenceLangueId: null,

    meanings: [],
    meaningTranslations: [],
    pendingEditMeaningId: null
};

const normalizeString = (value?: string | null): string =>
    (value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

const resolveBaseTypeNames = (parentWord: Word): string[] => {
    const raw = parentWord.types;
    if (typeof raw === 'string' && raw.trim().length > 0) {
        return raw
            .split(',')
            .map(v => v.trim())
            .filter(v => v.length > 0);
    }
    const single = parentWord.type?.name;
    return single ? [single] : [];
};

const resolveTypeIdsFromBaseTypes = (baseTypes: string[], storeTypes: Type[]): number[] => {
    if (!baseTypes.length || !Array.isArray(storeTypes) || !storeTypes.length) {
        return [];
    }
    const normalizedMap = new Map<string, number>();
    storeTypes.forEach(type => {
        const norm = normalizeString(type.name);
        if (norm) {
            normalizedMap.set(norm, type.id);
        }
    });
    const ids: number[] = [];
    baseTypes.forEach(name => {
        const norm = normalizeString(name);
        const id = norm ? normalizedMap.get(norm) : undefined;
        if (typeof id === 'number') {
            ids.push(id);
        }
    });
    return ids;
};

const uniqSorted = (values: number[]): number[] => Array.from(new Set(values)).sort((a, b) => a - b);

const arraysEqual = <T>(a: T[], b: T[]): boolean => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

export const WordTranslationModalStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    withComputed(state => ({
        status: computed(() => state.status()),
        error: computed(() => state.error()),
        languages: computed(() => state.languages()),
        types: computed(() => state.types()),
        typeOptionIds: computed(() => state.typeOptionIds()),
        selectedLangueId: computed(() => state.selectedLangueId()),
        selectedTypeId: computed(() => state.selectedTypeId()),
        referenceLangueId: computed(() => state.referenceLangueId()),
        selectedLanguage: computed(() => state.languages().find(l => l.id === state.selectedLangueId()) ?? null),
        meanings: computed(() => state.meanings()),
        meaningTranslations: computed(() => state.meaningTranslations()),
        pendingEditMeaningId: computed(() => state.pendingEditMeaningId())
    })),
    withMethods(store => {
        const httpClient = inject(HttpClient);
        const baseUrl = inject(Configuration).baseUrl;
        const messageService = inject(MessageService);

        let requestId = 0;

        const patchSelection = (langueId: number | null, typeId: number | null): void => {
            patchState(store, { selectedLangueId: langueId, selectedTypeId: typeId, pendingEditMeaningId: null });
        };

        const loadMeaningTranslations = (): void => {
            const langueId = store.selectedLangueId();
            const typeId = store.selectedTypeId();
            const parentWordLangueTypeId = store.parentWordLangueTypeId();
            if (langueId == null || parentWordLangueTypeId == null || typeId == null) {
                patchState(store, { meanings: [], meaningTranslations: [], status: 'loaded', error: null });
                return;
            }

            patchState(store, { status: 'loading', error: null });
            const localRequestId = ++requestId;
            const url = `${baseUrl}word/meanings/${parentWordLangueTypeId}/translations/${langueId}`;
            httpClient
                .get<WordMeaningTranslation[]>(url)
                .pipe(
                    tap(() => {
                        if (localRequestId === requestId && store.status() === 'loading') {
                            patchState(store, { status: 'loaded' });
                        }
                    })
                )
                .subscribe({
                    next: (payload: WordMeaningTranslation[]) => {
                        if (localRequestId !== requestId) {
                            return;
                        }
                        const normalized = Array.isArray(payload) ? payload : [];
                        const meaningMap = new Map<number, WordMeaning>();
                        normalized.forEach(t => {
                            if (t?.wordLangueTypeId == null) return;
                            if (!meaningMap.has(t.wordLangueTypeId)) {
                                meaningMap.set(t.wordLangueTypeId, {
                                    wordLangueTypeId: t.wordLangueTypeId,
                                    index: t.index
                                });
                            }
                        });
                        const meanings: WordMeaning[] = Array.from(meaningMap.values()).sort(
                            (a, b) => (a.index ?? 0) - (b.index ?? 0)
                        );
                        patchState(store, {
                            meanings,
                            meaningTranslations: normalized,
                            status: 'loaded',
                            error: null
                        });
                    },
                    error: (err: any) => {
                        if (localRequestId !== requestId) {
                            return;
                        }
                        const errorMessage =
                            typeof err?.error === 'string' ? err.error : err?.error?.message ?? err?.message ?? null;
                        patchState(store, { status: 'error', error: errorMessage ?? 'Erreur lors du chargement des traductions' });
                        messageService.error(err?.error ?? 'Erreur lors du chargement des traductions');
                    }
                });
        };

        return {
            init: (initData: WordTranslationModalInit): void => {
                const languages = initData.languages ?? [initData.langue];
                const explicitTypeIds: number[] = [];
                if (initData.initialTypeId != null) {
                    explicitTypeIds.push(initData.initialTypeId);
                }
                if (initData.parentWord?.type?.id != null) {
                    explicitTypeIds.push(initData.parentWord.type.id);
                }
                const baseTypeNames = resolveBaseTypeNames(initData.parentWord);

                patchState(store, {
                    status: 'init',
                    error: null,
                    parentWordLangueTypeId: initData.parentWord.wordLangueTypeId,
                    languages,
                    baseTypeNames,
                    explicitTypeIds: uniqSorted(explicitTypeIds),
                    meanings: [],
                    meaningTranslations: [],
                    referenceLangueId: initData.parentWord?.langue ?? null,
                    pendingEditMeaningId: null
                });

                const selectedLangueId = initData.langue?.id ?? languages[0]?.id ?? null;
                const fallbackTypeId = initData.initialTypeId ?? initData.parentWord?.type?.id ?? null;
                patchSelection(selectedLangueId, fallbackTypeId);
                loadMeaningTranslations();
            },
            selectLanguage: (langueId: number): void => {
                if (langueId === store.selectedLangueId()) {
                    return;
                }
                patchSelection(langueId, store.selectedTypeId());
                loadMeaningTranslations();
            },
            selectType: (typeId: number | null): void => {
                if (typeId === store.selectedTypeId()) {
                    return;
                }
                patchSelection(store.selectedLangueId(), typeId);
                loadMeaningTranslations();
            },
            reloadTranslations: (): void => {
                loadMeaningTranslations();
            },
            addMeaning: (): void => {
                const parentWordLangueTypeId = store.parentWordLangueTypeId();
                const typeId = store.selectedTypeId();
                const langueId = store.selectedLangueId();
                const referenceLangueId = store.referenceLangueId();
                if (parentWordLangueTypeId == null || typeId == null || langueId == null) {
                    return;
                }
                patchState(store, { status: 'loading', error: null, pendingEditMeaningId: null });
                const localRequestId = ++requestId;
                const url = `${baseUrl}word/meanings/${parentWordLangueTypeId}`;
                httpClient.post<WordMeaning>(url, { langueId: referenceLangueId }).pipe(
                    mapResponse({
                        next: created => {
                            if (localRequestId !== requestId) return;
                            patchState(store, { pendingEditMeaningId: created?.wordLangueTypeId ?? null });
                            loadMeaningTranslations();
                        },
                        error: (err: any) => {
                            if (localRequestId !== requestId) return;
                            patchState(store, { status: 'error', error: err?.error ?? 'Erreur lors de la création du sens' });
                            messageService.error(err?.error ?? 'Erreur lors de la création du sens');
                        }
                    })
                ).subscribe();
            },
            deleteMeaning: (wordLangueTypeId: number): void => {
                if (!wordLangueTypeId) {
                    return;
                }
                patchState(store, { status: 'loading', error: null, pendingEditMeaningId: null });
                const localRequestId = ++requestId;
                const url = `${baseUrl}word/meanings/${wordLangueTypeId}`;
                httpClient.delete<void>(url).pipe(
                    mapResponse({
                        next: () => {
                            if (localRequestId !== requestId) return;
                            loadMeaningTranslations();
                        },
                        error: (err: any) => {
                            if (localRequestId !== requestId) return;
                            patchState(store, { status: 'error', error: err?.error ?? 'Erreur lors de la suppression du sens' });
                            messageService.error(err?.error ?? 'Erreur lors de la suppression du sens');
                        }
                    })
                ).subscribe();
            }
        };
    }),
    withHooks({
        onInit(store) {
            const dataStore = inject(DataStore);

            effect(() => {
                const storeTypes = dataStore.types();
                const status = store.status();
                const baseTypeNames = store.baseTypeNames();
                const explicitTypeIds = store.explicitTypeIds();

                const baseTypeIds = resolveTypeIdsFromBaseTypes(baseTypeNames, storeTypes);
                const ids = uniqSorted([...explicitTypeIds, ...baseTypeIds]);
                const optionTypes = ids
                    .map(id => storeTypes.find(t => t.id === id))
                    .filter((t): t is Type => !!t);

                const shouldPatchIds = !arraysEqual(store.typeOptionIds(), ids);
                const shouldPatchTypes = store.types().length !== optionTypes.length;
                if (shouldPatchIds || shouldPatchTypes) {
                    patchState(store, { typeOptionIds: ids, types: optionTypes });
                }

                const selectedTypeId = store.selectedTypeId();
                if (selectedTypeId == null && ids.length > 0) {
                    patchState(store, { selectedTypeId: ids[0] });
                    store.reloadTranslations();
                }
            });
        }
    })
);
