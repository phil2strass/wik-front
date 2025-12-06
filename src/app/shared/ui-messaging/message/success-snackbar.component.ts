import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-success-snackbar',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    template: `
        <div class="snackbar-success__container">
            <mat-icon fontIcon="check_circle" class="snackbar-success__icon"></mat-icon>
            <div class="snackbar-success__content">
                <div class="snackbar-success__title">Succès</div>
                <div class="snackbar-success__message">{{ data.message }}</div>
            </div>
        </div>
    `
})
export class SuccessSnackbarComponent {
    constructor(@Inject(MAT_SNACK_BAR_DATA) public data: { message: string }) {}
}
