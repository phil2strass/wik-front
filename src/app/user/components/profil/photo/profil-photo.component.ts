import { Component, EventEmitter, inject, Input, Output, ViewEncapsulation } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { ProfilStore } from '../profil-store';
import { NgOptimizedImage } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { environment } from '@root/environments/environment';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ProfilPhotoDialogComponent } from '@root/app/user/components/profil/photo/profil-photo-dialog.component';
import { ConfirmDeletePhotoComponent } from '@root/app/user/components/profil/photo/confirm-delete-photo.component';
import { ProfilPhoto } from '@shared/models/user.model';

@Component({
    selector: 'app-profil-photo',
    template: `
        <h5 class="f-s-21 f-w-600 m-b-16">Photo de profil</h5>
        <div class="mt-3 relative">
            @if (photo) {
                <img
                    ngSrc="{{ basePhotoUrl }}profil/{{ photo.grande }}.jpg"
                    alt="Photo de profil"
                    width="314"
                    height="310"
                    priority
                    style="width: 100%; height: auto; object-fit: contain; position: relative; z-index: 1;" />
            } @else {
                <div class="bg-gray-200" style="width: 100%; aspect-ratio: 314 / 310; position: relative; z-index: 1;"></div>
            }
            @if (loading) {
                <div style="position: absolute; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center;">
                    <div style="position: absolute; inset: 0; background: rgba(255,255,255,0.5);"></div>
                    <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
                </div>
            }
        </div>
        <div>
            <div class="p-y-8">
                <a mat-button (click)="openProfilPhotoDialog()" class="w-50">
                    @if (profil().photo) {
                        Nouvelle photo
                    } @else {
                        Ajouter votre photo
                    }
                </a>
                @if (profil().photo) {
                    <a mat-button (click)="confirmDelete()" class="w-50">Supprimer</a>
                }
            </div>
        </div>
    `,
    encapsulation: ViewEncapsulation.None,
    imports: [MatCardModule, ReactiveFormsModule, MatButton, NgOptimizedImage, MatProgressSpinner]
})
export class ProfilPhotoComponent {
    @Input({ required: true }) photo!: ProfilPhoto | undefined;
    @Output() addPhoto = new EventEmitter<ProfilPhoto | null>();

    readonly #profilStore = inject(ProfilStore);
    protected readonly status = this.#profilStore.statusPhoto;
    protected readonly profil = this.#profilStore.profil;

    basePhotoUrl = environment.basePhotoUrl;

    constructor(public dialog: MatDialog) {}

    get loading(): boolean {
        return this.status() == 'loading';
    }

    openProfilPhotoDialog(): void {
        const dialogRef = this.dialog.open(ProfilPhotoDialogComponent, {
            width: '500px',
            autoFocus: false
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                const formData = new FormData();
                formData.append('original', result.original, result.original.name);
                formData.append('thumbnail', result.thumbnail, 'thumbnail.png');
                this.#profilStore.uploadPhoto(formData);
            }
        });
    }

    confirmDelete() {
        const ref = this.dialog.open(ConfirmDeletePhotoComponent, { width: '420px', autoFocus: false });
        ref.afterClosed().subscribe(result => {
            if (result) {
                this.addPhoto.emit(null);
                this.#profilStore.removePhoto();
            }
        });
    }
}
