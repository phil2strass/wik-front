import { Component, inject } from '@angular/core';
import { MessageStore } from './message.store';
import { MessageService } from './message.service';

@Component({
    selector: 'app-message',
    template: ``
})
export class MessageComponent {
    constructor() {
        const messageStore = inject(MessageStore);
        const messageService = inject(MessageService);
        messageStore.messages$.subscribe(message => {
            messageService[message.type](message.text);
        });
    }
}
