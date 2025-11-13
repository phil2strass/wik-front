import { ChangeDetectorRef, Component, effect, ElementRef, inject, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { NgIf } from '@angular/common';
import { WordStore } from '../../word-store';
import { DataStore } from '../../../shared/data/data-store';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MessageService } from '../../../shared/ui-messaging/message/message.service';
import { TranslatePipe } from '@ngx-translate/core';
import { SecurityStore } from '@shared/security/security-store';
import { Gender } from '@shared/data/models/langue.model';

@Component({
    selector: 'app-word-new',
    template: `
        <h1 class="text-2xl font-medium text-gray-900">{{ 'mot.nouveau' | translate }}</h1>

        <form *ngIf="form" [formGroup]="form">
            <div class="max-w-3xl border-gray-200 pt-4 pb-2">
                <label class="block font-medium text-sm text-gray-900">Mot</label>
                <mat-form-field class="w-1/2 mt-2" appearance="fill">
                    <input #nameInput matInput formControlName="name" />
                    <mat-error *ngIf="form.get('name')?.hasError('required')">Veuillez saisir un mot.</mat-error>
                </mat-form-field>
            </div>
            <div class="max-w-3xl border-gray-200 pt-4 pb-2" *ngIf="selectedType()">
                <label class="block font-medium text-sm text-gray-900">Pluriel</label>
                <mat-form-field class="w-1/2 mt-2" appearance="fill">
                    <input matInput formControlName="plural" />
                </mat-form-field>
            </div>
            <div class="max-w-3xl border-b border-gray-200 pt-4 pb-2 mb-5">
                <label class="block font-medium text-sm text-gray-900">Type</label>
                <mat-form-field class="w-1/2 mt-2" appearance="fill">
                    <mat-select formControlName="typeId">
                        @for (type of types(); track type) {
                            <mat-option [value]="type.id">{{ type.name }}</mat-option>
                        }
                    </mat-select>
                    <mat-error *ngIf="form.get('typeId')?.hasError('required')">Veuillez choisir un type.</mat-error>
                </mat-form-field>
                <div class="block" *ngIf="selectedType()">
                    <mat-radio-group formControlName="genderId" class="w-1/2 mt-2" appearance="fill">
                        @for (gender of genders(); track gender) {
                            <mat-radio-button [value]="gender.id">{{ gender.name }}</mat-radio-button>
                        }
                    </mat-radio-group>
                </div>
            </div>
        </form>
        <button mat-flat-button (click)="save()">Save</button>
    `,
    encapsulation: ViewEncapsulation.None,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        ReactiveFormsModule,
        MatRadioButton,
        MatRadioGroup,
        MatOption,
        MatSelect,
        NgIf,
        MatButton,
        TranslatePipe
    ]
})
export class WordNewComponent {
    @ViewChild('nameInput') nameInput!: ElementRef;

    readonly #dataStore = inject(DataStore);
    protected readonly langues = this.#dataStore.langues;
    protected readonly types = this.#dataStore.types;

    readonly #securityStore = inject(SecurityStore);
    protected readonly langueSelectedId = this.#securityStore.langueSelected;

    readonly #wordStore = inject(WordStore);
    protected readonly action = this.#wordStore.action;
    protected readonly genders = this.#wordStore.genders;

    messageService = inject(MessageService);

    #formBuilder = inject(FormBuilder);
    form: FormGroup | undefined;

    constructor() {
        this.form = this.#formBuilder.group({
            name: ['', Validators.required],
            typeId: [null, Validators.required],
            genderId: [null],
            plural: ['']
        });

        effect(() => {
            if (this.action() == 'created') {
                this.clean();
            }
        });
    }

    /*
    ngAfterViewInit() {
        setTimeout(() => this.focusOnName());
    }

     */

    selectedType(): boolean {
        return this.form?.get('typeId')?.value === 1;
    }

    save() {
        if (this.form?.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const data = this.form?.getRawValue();
        data.langueId = this.langueSelectedId();
        this.#wordStore.create(data);
    }

    clean() {
        if (this.form) {
            this.form.reset({
                name: '',
                typeId: null,
                genderId: null,
                plural: ''
            });
            this.form.markAsUntouched();
            this.form.markAsPristine();

            //setTimeout(() => this.focusOnName(), 0);
        }
    }

    private focusOnName() {
        if (this.nameInput) {
            this.nameInput.nativeElement.focus();
        }
    }
}
