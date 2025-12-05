import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ERROR_MESSAGE_CONTEXT } from './error-message.context';
import { MessageService } from '../ui-messaging/message/message.service';
import { SILENT_LOAD_CONTEXT } from './silent-load.context';

export const errorInterceptor: HttpInterceptorFn = (req, handle) => {
    const uiMessage = inject(MessageService);

    return handle(req).pipe(
        catchError(err => {
            if (req.context.has(SILENT_LOAD_CONTEXT)) {
                return throwError(() => err);
            }

            const fallbackMessage = req.context.get(ERROR_MESSAGE_CONTEXT);
            const serverMessage = err?.error || err?.message;
            uiMessage.error(serverMessage ?? fallbackMessage);
            return throwError(() => err);
        })
    );
};
