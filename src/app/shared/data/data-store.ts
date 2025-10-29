import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { DataService } from './data.service';
import { Langue } from './models/langue.model';
import { Type } from './models/type.model';

export interface DataState {
    langues: Langue[];
    types: Type[];
}

const initialState: DataState = {
    langues: [],
    types: []
};

export const DataStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    withComputed(state => ({
        langues: computed(() => state.langues()),
        types: computed(() => state.types())
    })),
    withHooks(store => {
        const dataService = inject(DataService);

        return {
            onInit() {
                if (store.langues() && store.langues().length === 0) {
                    dataService.getLanguages().subscribe((lang: Langue[]) => {
                        patchState(store, {
                            langues: lang
                        });
                    });
                }
                if (store.types() && store.types().length === 0) {
                    dataService.getTypes().subscribe((type: Type[]) => {
                        patchState(store, {
                            types: type
                        });
                    });
                }
            },
            onDestroy() {}
        };
    })
);
