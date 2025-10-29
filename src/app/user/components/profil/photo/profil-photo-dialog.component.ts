import { Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import { ProfilStore } from '@root/app/user/components/profil/profil-store';

class CropDialogComponent {}

@Component({
    selector: 'app-profil-photo-dialog',
    template: `
        <mat-dialog-content class="mat-typography">
            <div class="d-flex align-items-center justify-content-between m-b-16">
                <h4 class="f-s-16 f-w-600 m-b-16">Photo de profil</h4>
                <button mat-icon-button mat-dialog-close class="d-flex justify-content-center">
                    <i-tabler name="x" class="icon-20 d-flex"></i-tabler>
                </button>
            </div>

            <input type="file" accept="image/*" (change)="fileChangeEvent($event)" />

            @if (imageChangedEvent) {
                <image-cropper
                    [imageChangedEvent]="imageChangedEvent"
                    [maintainAspectRatio]="true"
                    [aspectRatio]="1 / 1"
                    [resizeToWidth]="300"
                    format="png"
                    (imageCropped)="imageCropped($event)"></image-cropper>
            }
        </mat-dialog-content>
        <div mat-dialog-actions>
            <button mat-flat-button class="bg-error text-white" (click)="onCancel()">Annuler</button>
            <button mat-flat-button color="primary" (click)="onSave()">Enregistrer</button>
        </div>
    `,
    imports: [MaterialModule, CommonModule, FormsModule, TablerIconsModule, ImageCropperComponent]
})
export class ProfilPhotoDialogComponent {
    readonly #profilStore = inject(ProfilStore);
    protected readonly status = this.#profilStore.statusPhoto;

    imageChangedEvent: any = '';
    originalFile!: File;
    croppedImage: Blob;

    constructor(private dialogRef: MatDialogRef<ProfilPhotoDialogComponent>) {}

    fileChangeEvent(event: any): void {
        this.imageChangedEvent = event;
        this.originalFile = event.target.files[0];
        console.log('Image originale:', this.originalFile);
    }

    imageCropped(event: ImageCroppedEvent): void {
        this.croppedImage = event.blob!;
    }

    onCancel(): void {
        this.dialogRef.close(null);
    }

    onSave(): void {
        this.dialogRef.close({
            original: this.originalFile,
            thumbnail: this.croppedImage
        });
    }
}
