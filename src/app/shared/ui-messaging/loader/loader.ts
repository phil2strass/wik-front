import { getState, signalStoreFeature, withHooks } from '@ngrx/signals';
import { Signal, effect, inject } from '@angular/core';
import { LoadingService } from './loading.service';

export function withLoader() {
    return signalStoreFeature(
        withHooks({
            onInit(store) {
                const loadingService = inject(LoadingService);
                effect(() => {
                    const state = getState(store);
                    if (!hasLoaderState(state)) {
                        return;
                    }
                    const status = state.status();
                    if (status === 'loading') {
                        loadingService.start();
                    } else if (status === 'loaded') {
                        loadingService.stop();
                    }
                });
            }
        })
    );
}

interface LoaderState {
    status: Signal<'init' | 'loading' | 'loaded'>;
}

function hasLoaderState(state: unknown): state is LoaderState {
    return !!state && typeof (state as LoaderState).status === 'function';
}
