import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { SecurityStore } from '@shared/security/security-store';

export const authGuard: CanActivateFn = () => {
    const security = inject(SecurityStore);

    // Wait for initialization to finish to avoid redirect loops
    if (!security.loaded()) {
        return false;
    }

    if (security.signedIn()) {
        return true;
    }

    // Loaded but not signed in -> trigger login once
    security.signIn();
    return false;
};
