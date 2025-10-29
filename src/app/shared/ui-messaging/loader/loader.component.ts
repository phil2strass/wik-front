import { NgStyle } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LoadingService } from './loading.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-loader',
    template: `
        @if (visibility()) {
            <div class="fullscreen-spinner">
                <mat-spinner></mat-spinner>
            </div>
        }
    `,
    imports: [MatProgressBarModule, MatProgressSpinner]
})
export class LoaderComponent {
    readonly #loadingService = inject(LoadingService);
    protected readonly visibility = computed(() => (this.#loadingService.loading() ? true : false));
}
