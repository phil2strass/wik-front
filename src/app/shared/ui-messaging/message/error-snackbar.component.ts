import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-error-snackbar',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    template: `
        <div class="snackbar-error__container">
            <mat-icon fontIcon="error_outline" class="snackbar-error__icon"></mat-icon>
            <div class="snackbar-error__content">
                <div class="snackbar-error__title">Une erreur est survenue</div>
                <div class="snackbar-error__message">{{ data.message }}</div>
            </div>
        </div>
    `
})
export class ErrorSnackbarComponent {
    constructor(@Inject(MAT_SNACK_BAR_DATA) public data: { message: string }) {}
}
