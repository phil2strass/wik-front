import { Routes } from '@angular/router';
import { userGuard } from '../user/services/user.guard';
import { WordNewComponent } from './components/word-new.component';
import { WordGridComponent } from './components/list/word-grid.component';
import { WordComponent } from './components/word.component';
import { ProfilSidebarComponent } from '../user/components/profil-sidebar.component';
import { SidebarComponent } from '../layouts/full/vertical/sidebar/sidebar.component';

export default [
    {
        path: '',
        canActivate: [userGuard],
        children: [
            {
                path: '',
                component: SidebarComponent,
                outlet: 'sidebar'
            },
            {
                path: 'new',
                component: WordNewComponent
            },
            {
                path: 'list',
                component: WordGridComponent
            }
        ]
    }
] satisfies Routes;
