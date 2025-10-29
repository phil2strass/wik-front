import { HttpInterceptorFn } from '@angular/common/http';
import { KeycloakService } from './internal/keycloak-service';
import { inject } from '@angular/core';
import { ANONYMOUS_CONTEXT } from '../http/anonymous.context';
import { from, switchMap } from 'rxjs';

export const securityInterceptor: HttpInterceptorFn = (req, next) => {
    const keycloakService = inject(KeycloakService);
    const token = keycloakService.profile?.token;

    if (!token) {
        return next(req);
    }
    if (req.context.has(ANONYMOUS_CONTEXT)) {
        return next(req);
    }

    return from(keycloakService.updateToken(30)).pipe(
        // <= ici tu forces un refresh si token expire dans 30s
        switchMap(() => {
            const token = keycloakService.profile?.token;
            if (!token) {
                return next(req);
            }

            const clonedReq = req.clone({
                headers: req.headers.set('Authorization', `Bearer ${token}`)
            });

            return next(clonedReq);
        })
    );
};
