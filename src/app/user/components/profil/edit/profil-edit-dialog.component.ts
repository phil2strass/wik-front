import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatButton } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { Langue } from '@shared/data/models/langue.model';
import { Profil } from '@shared/models/user.model';

export interface EditProfilDialogData {
    profil: Profil;
    langues: Langue[];
}

@Component({
    selector: 'app-edit-profil-dialog',
    standalone: true,
    template: `
        <h2 mat-dialog-title>Modifier le profil</h2>
        <mat-dialog-content class="mat-typography">
            <form [formGroup]="form" class="w-100">
                <div class="row m-b-12">
                    <div class="col-md-12">
                        <mat-label class="f-s-14 f-w-600 m-b-8 d-block">Votre nom</mat-label>
                        <mat-form-field appearance="outline" class="w-100">
                            <input matInput formControlName="name" />
                        </mat-form-field>
                    </div>
                </div>

                <div class="row m-b-12">
                    <div class="col-md-12">
                        <mat-label class="f-s-14 f-w-600 m-b-8 d-block">Langue maternelle</mat-label>
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-select formControlName="langueMaternelle">
                                @for (language of langues; track language) {
                                    <mat-option [value]="language.id">{{ language.name }}</mat-option>
                                }
                            </mat-select>
                        </mat-form-field>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-12">
                        <mat-label class="f-s-14 f-w-600 m-b-8 d-block">J'apprends</mat-label>
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-select formControlName="langues" multiple>
                                @for (language of langues; track language) {
                                    <mat-option [value]="language.id">{{ language.name }}</mat-option>
                                }
                            </mat-select>
                        </mat-form-field>
                    </div>
                </div>
            </form>
        </mat-dialog-content>
        <div mat-dialog-actions class="d-flex justify-content-end gap-12">
            <button mat-button mat-dialog-close>Annuler</button>
            <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Enregistrer</button>
        </div>
    `,
    imports: [CommonModule, MatDialogModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatSelect, MatOption, MatButton]
})
export class EditProfilDialogComponent {
    form: FormGroup;
    langues: Langue[] = [];

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: EditProfilDialogData,
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<EditProfilDialogComponent>
    ) {
        this.langues = data.langues || [];
        const p = data.profil || ({} as Profil);
        this.form = this.fb.group({
            name: [p.name ?? '', Validators.required],
            langueMaternelle: [p.langueMaternelle ?? null, Validators.required],
            langues: [p.langues ?? [], Validators.required]
        });
    }

    save() {
        if (this.form.valid) {
            this.dialogRef.close(this.form.getRawValue());
        }
    }
}
