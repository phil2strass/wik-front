import { getState, signalStoreFeature, withHooks } from '@ngrx/signals';
import { effect, inject } from '@angular/core';
import { LoadingService } from './loading.service';

export function withLoader() {
    return signalStoreFeature(
        withHooks({
            onInit(store) {
                const loadingService = inject(LoadingService);
                effect(() => {
                    const state = getState(store) as MyState;

                    if (state.status == 'loading') {
                        loadingService.start();
                    } else if (state.status == 'loaded') {
                        loadingService.stop();
                    }
                });
            }
        })
    );
}

interface MyState {
    status: string;
    [key: string]: any;
}
