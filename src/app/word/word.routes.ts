import { Routes } from '@angular/router';
import { userGuard } from '../user/services/user.guard';
import { WordNewComponent } from './components/word-new.component';
import { WordGridComponent } from './components/list/word-grid.component';
import { WordComponent } from './components/word.component';
import { ProfilSidebarComponent } from '../user/components/profil-sidebar.component';
import { SidebarComponent } from '../layouts/full/vertical/sidebar/sidebar.component';
import { adminGuard } from '@shared/security/admin.guard';
import { WordImportComponent } from './components/word-import.component';

export default [
    {
        path: '',
        canActivate: [userGuard, adminGuard],
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
            },
            {
                path: 'import',
                component: WordImportComponent
            },
            {
                path: 'categories',
                loadComponent: () => import('./components/category-list.component').then(m => m.CategoryListComponent)
            }
        ]
    }
] satisfies Routes;
