import { Component, Inject, inject, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_SNACK_BAR_DATA, MatSnackBar } from '@angular/material/snack-bar';
import { MessageStore } from './message.store';

@Component({
    selector: 'app-message-error',
    template: `
        <i class="fas fa-exclamation-triangle"></i>
        {{ data.message }}
    `,
    imports: [MatButtonModule]
})
export class MessageErrorComponent {
    constructor(@Inject(MAT_SNACK_BAR_DATA) public data: any) {}
}

@Component({
    selector: 'app-message-info',
    template: `
        {{ data.message }}
    `,
    imports: [MatButtonModule]
})
export class MessageInfoComponent {
    constructor(@Inject(MAT_SNACK_BAR_DATA) public data: any) {}
}

@Component({
    selector: 'app-message',
    template: ``,
    imports: [MatButtonModule]
})
export class MessageComponent {
    readonly #matSnackBar = inject(MatSnackBar);

    constructor(messageStore: MessageStore) {
        messageStore.messages$.subscribe(message => {
            if (message.type == 'error') {
                this.#matSnackBar.openFromComponent(MessageErrorComponent, {
                    data: { message: message.text },
                    horizontalPosition: 'right',
                    duration: 3000,
                    panelClass: 'snackbar-error',
                    announcementMessage: ''
                });
            } else if (message.type == 'info') {
                this.#matSnackBar.openFromComponent(MessageInfoComponent, {
                    data: { message: message.text },
                    horizontalPosition: 'right',
                    duration: 3000,
                    panelClass: 'snackbar-info',
                    announcementMessage: ''
                });
            }
        });
    }
}
