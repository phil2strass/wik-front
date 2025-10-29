import { inject, Injectable } from '@angular/core';
import { MessageStore } from './message.store';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationComponent } from './confirmation.component';
import { map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MessageService {
    #messageStore = inject(MessageStore);

    info(message: string) {
        this.#messageStore.add({ text: message, type: 'info' });
    }

    error(error: any) {
        if (error.message) {
            this.#messageStore.add({ text: error.message, type: 'error' });
        } else {
            this.#messageStore.add({ text: "Une erreur s'est produite", type: 'error' });
        }
    }
}
