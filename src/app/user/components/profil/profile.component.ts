import { AfterViewInit, ChangeDetectorRef, Component, effect, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatOption, MatSelect } from '@angular/material/select';
import { DataStore } from '@shared/data/data-store';
import { ProfilStore } from './profil-store';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { ProfilPhotoComponent } from './photo/profil-photo.component';
import { MatCard, MatCardContent } from '@angular/material/card';
import { mockPosts, topcards } from '@root/app/pages/apps/profile-content/profileData';
import { MatDialog } from '@angular/material/dialog';
import { Profil, ProfilPhoto } from '@shared/models/user.model';
import { EditProfilDialogComponent } from '@root/app/user/components/profil/edit/profil-edit-dialog.component';

@Component({
    selector: 'app-user-profil',
    templateUrl: './profile.component.html',
    encapsulation: ViewEncapsulation.None,
    imports: [
        MatFormField,
        ReactiveFormsModule,
        MatInput,
        ProfilPhotoComponent,
        MatCard,
        MatCardContent,
        MatLabel,
        MatSelect,
        MatOption,
        MatButton
    ]
})
export class ProfileComponent {
    readonly #dataStore = inject(DataStore);
    protected readonly langues = this.#dataStore.langues;

    readonly #profilStore = inject(ProfilStore);
    protected readonly profil = this.#profilStore.profil;
    protected readonly status = this.#profilStore.status;
    messageService = inject(MessageService);

    #formBuilder = inject(FormBuilder);

    form: FormGroup | undefined;
    photo: ProfilPhoto | undefined;

    constructor(private dialog: MatDialog) {
        effect(() => {
            // Avoid creating the form before data is loaded to prevent flicker
            const status = this.status();
            if (status === 'init' || status === 'loading') {
                this.form = undefined;
                return;
            }

            const profil = this.profil();
            if (profil.name === undefined) {
                this.form = this.#formBuilder.group({
                    name: ['', Validators.required],
                    langueMaternelle: [null, Validators.required],
                    langues: [[], Validators.required]
                });
            } else {
                this.form = undefined;
            }
        });
    }

    get loading(): boolean {
        return this.status() == 'loading';
    }

    save() {
        if (this.form?.valid) {
            this.#profilStore.update(this.form?.getRawValue());
        } else {
            this.messageService.error('Vous avez des erreurs');
        }
    }

    protected readonly posts = mockPosts;

    // Helpers to resolve language names in template without inline lambdas
    langueNameById(id?: number | null): string {
        if (!id) return '-';
        const all = this.langues();
        const item = all?.find(x => x.id === id);
        return item?.name ?? '-';
    }

    languesNamesByIds(ids?: number[] | null): string {
        if (!ids || ids.length === 0) return '-';
        const all = this.langues();
        const names = ids.map(id => all?.find(x => x.id === id)?.name).filter((v): v is string => !!v);
        return names.length ? names.join(', ') : '-';
    }

    openEditDialog() {
        const current = this.profil();
        const dialogRef = this.dialog.open(EditProfilDialogComponent, {
            width: '600px',
            autoFocus: false,
            data: {
                profil: current,
                langues: this.langues()
            }
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.#profilStore.update(result as Profil);
            }
        });
    }
}
