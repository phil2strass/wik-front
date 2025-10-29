import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { SecurityStore } from '@shared/security/security-store';

export const userGuard: CanActivateFn = () => {
    const securityStore = inject(SecurityStore);
    const user = securityStore.loadedUser;

    if (!user() || user()?.anonymous == true) {
        return securityStore.signIn().then(() => false);
    }
    return true;
};
