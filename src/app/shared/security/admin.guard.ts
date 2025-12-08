import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SecurityStore } from './security-store';

export const adminGuard: CanActivateFn = () => {
    const securityStore = inject(SecurityStore);
    const router = inject(Router);
    const user = securityStore.loadedUser();

    if (!user || user.anonymous) {
        return securityStore.signIn().then(() => false);
    }

    if (!securityStore.isAdmin()) {
        return router.parseUrl('/welcome');
    }

    return true;
};
