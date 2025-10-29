import { Routes } from '@angular/router';
import { ProfileComponent } from './components/profil/profile.component';
import { authGuard } from '@shared/security/auth.guard';

export default [
    {
        path: '',
        canActivate: [authGuard],
        children: [
            {
                path: 'profil',
                component: ProfileComponent
            }
        ]
    }
] satisfies Routes;
