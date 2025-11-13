import { Component, effect, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Word } from '../models/word.model';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { DataStore } from '@shared/data/data-store';
import { Gender, Langue } from '@shared/data/models/langue.model';
import { Type } from '@shared/data/models/type.model';
import { WordStore } from '../word-store';

@Component({
    selector: 'word-edit-dialog',
    template: `
        <h2 mat-dialog-title>{{ data.name }} - {{ type?.name }}</h2>
        <mat-dialog-content>
            <form [formGroup]="form">
                <div class="max-w-3xl border-gray-200 pt-3">
                    <label class="block font-medium text-sm text-gray-900">Mot</label>
                    <mat-form-field class="w-1/2 mt-2" appearance="fill">
                        <input #nameInput matInput formControlName="name" />
                        @if (form.get('name')?.hasError('required')) {
                            <mat-error>Veuillez saisir un mot.</mat-error>
                        }
                    </mat-form-field>
                </div>
                @if (isNom()) {
                    <div class="max-w-3xl border-gray-200 pt-3">
                        <label class="block font-medium text-sm text-gray-900">Pluriel</label>
                        <mat-form-field class="w-1/2 mt-2" appearance="fill">
                            <input matInput formControlName="plural" />
                        </mat-form-field>
                    </div>
                }
                <div class="max-w-3xl pt-3 mb-5">
                    @if (isNom() && genders) {
                        <div class="block">
                            <mat-radio-group formControlName="genderId" class="w-1/2 mt-2" appearance="fill">
                                @for (gender of genders; track gender) {
                                    <mat-radio-button [value]="gender.id">{{ gender.name }}</mat-radio-button>
                                }
                            </mat-radio-group>
                        </div>
                    }
                </div>
            </form>
        </mat-dialog-content>
        <mat-dialog-actions>
            <button matButton (click)="onNoClick()">Annuler</button>
            <button matButton (click)="save()" [disabled]="form.invalid || !form.dirty || loading">Enregistrer</button>
        </mat-dialog-actions>
    `,
    imports: [
        MatFormFieldModule,
        MatInputModule,
        FormsModule,
        MatButtonModule,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatRadioButton,
        ReactiveFormsModule,
        MatRadioGroup
    ]
})
export class WordEditDialog {
    readonly dialogRef = inject(MatDialogRef<WordEditDialog>);
    readonly data = inject<Word>(MAT_DIALOG_DATA);

    readonly #dataStore = inject(DataStore);
    protected readonly langues = this.#dataStore.langues;
    protected readonly types = this.#dataStore.types;

    readonly #wordStore = inject(WordStore);
    protected readonly action = this.#wordStore.action;
    protected readonly status = this.#wordStore.status;

    #formBuilder = inject(FormBuilder);
    form: FormGroup;

    genders: Gender[] | null;
    type: Type | undefined;

    constructor() {
        this.form = this.#formBuilder.group({
            wordTypeId: [this.data.wordTypeId, Validators.required],
            name: [this.data.name, Validators.required],
            langueId: [this.data.langue, Validators.required],
            typeId: [this.data.type.id, Validators.required],
            genderId: [this.data.gender?.id],
            plural: [this.data.plural]
        });
        if (this.data.gender) {
            this.genders = this.langues().filter((langue: Langue) => langue.id == this.data.langue)[0].genders;
        }
        this.type = this.types().find(type => type.id == this.data.type.id);

        effect(() => {
            if (this.action() == 'updated') {
                this.#wordStore.actionInit();
                this.dialogRef.close(true);
            }
        });
    }

    get loading(): boolean {
        return this.status() == 'loading';
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    save() {
        const data = this.form?.getRawValue();
        this.#wordStore.update(data);
    }

    isNom(): boolean {
        return this.form?.get('typeId')?.value === 1;
    }
}
