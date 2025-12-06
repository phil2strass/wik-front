import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorSnackbarComponent } from './error-snackbar.component';
import { SuccessSnackbarComponent } from './success-snackbar.component';

@Injectable({ providedIn: 'root' })
export class MessageService {
    #snackBar = inject(MatSnackBar);

    info(message: string) {
        this.#snackBar.openFromComponent(SuccessSnackbarComponent, {
            data: { message },
            duration: 3000,
            horizontalPosition: 'right',
            panelClass: ['snackbar-success']
        });
    }

    error(error: any) {
        const text =
            typeof error === 'string'
                ? error
                : error?.message || error?.error?.message || "Une erreur s'est produite";
        this.#snackBar.openFromComponent(ErrorSnackbarComponent, {
            data: { message: text },
            duration: 5000,
            horizontalPosition: 'right',
            panelClass: ['snackbar-error']
        });
    }
}
