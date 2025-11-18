import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { AfterViewInit, Component, OnChanges, SimpleChanges, effect, ElementRef, inject, Input, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { WordStore } from '../word-store';
import { DataStore } from '@shared/data/data-store';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { TranslatePipe } from '@ngx-translate/core';
import { SecurityStore } from '@shared/security/security-store';
import { MatCard } from '@angular/material/card';
import { NgxDropzoneModule } from 'ngx-dropzone';

@Component({
    selector: 'app-word-form',
    template: `
        <form [formGroup]="formGroup" (ngSubmit)="save()">
            @if (useCard) {
                <div class="row">
                    <div class="col-lg-8">
                        <mat-card class="cardWithShadow b-1 rounded p-30">
                            <ng-container *ngTemplateOutlet="formFields"></ng-container>
                        </mat-card>
                    </div>
                </div>
            } @else {
                <div class="word-form__content w-100">
                    <ng-container *ngTemplateOutlet="formFields"></ng-container>
                </div>
            }
        </form>
        <ng-template #formFields>
            <h4 Ctitle>{{ titleTranslationKey | translate }}</h4>
            <mat-label class="f-s-14 f-w-600 m-b-8 d-block m-t-20">
                Mot
                <span class="text-error">*</span>
            </mat-label>
            <mat-form-field appearance="outline" class="w-100 p-0" color="primary">
                <input #nameInput type="text" matInput formControlName="name" />
                <mat-error *ngIf="showError('name', 'required')">Veuillez saisir un mot.</mat-error>
            </mat-form-field>
            @if (selectedType()) {
                <mat-label class="f-s-14 f-w-600 m-b-8 d-block m-t-20">Pluriel</mat-label>
                <mat-form-field appearance="outline" class="w-100 p-0" color="primary">
                    <input type="text" matInput formControlName="plural" />
                </mat-form-field>
            }
            <mat-label class="f-s-14 f-w-600 m-b-8 d-block m-t-20">
                Type
                <span class="text-error">*</span>
            </mat-label>
            <mat-form-field appearance="outline" class="w-100">
                <mat-select formControlName="typeId" disableOptionCentering>
                    @for (type of types(); track type) {
                        <mat-option [value]="type.id">{{ type.name }}</mat-option>
                    }
                </mat-select>
                <mat-error *ngIf="showError('typeId', 'required')">Veuillez saisir un type.</mat-error>
            </mat-form-field>
            @if (selectedType()) {
                <mat-radio-group
                    formControlName="genderId"
                    aria-labelledby="example-radio-group-label"
                    class="d-flex flex-wrap gap-24 justify-content-start 100 mt-2">
                    @for (gender of genders(); track gender) {
                        <mat-card class="cardWithShadow b-1 rounded d-flex gap-30 align-items-center flex-row">
                            <mat-radio-button class="p-r-16 p-l-6 p-y-2" color="primary" [value]="gender.id">
                                {{ gender.name }}
                            </mat-radio-button>
                        </mat-card>
                    }
                </mat-radio-group>
            }
        </ng-template>
    `,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        NgTemplateOutlet,
        MatFormFieldModule,
        MatInputModule,
        MatRadioButton,
        MatRadioGroup,
        MatOption,
        MatSelect,
        TranslatePipe,
        MatCard,
        NgxDropzoneModule
    ]
})
export class WordFormComponent implements AfterViewInit, OnChanges {
    @ViewChild('nameInput') nameInput!: ElementRef;
    @ViewChild(FormGroupDirective) formDirective?: FormGroupDirective;
    submitted = false;
    #form!: FormGroup;
    @Input({ required: true })
    set form(value: FormGroup) {
        if (!value) {
            throw new Error('WordFormComponent requires a FormGroup input.');
        }
        this.#form = value;
    }
    get formGroup(): FormGroup {
        if (!this.#form) {
            throw new Error('WordFormComponent requires a FormGroup input.');
        }
        return this.#form;
    }
    @Input() mode: 'create' | 'update' = 'update';
    @Input() useCard = true;

    readonly #dataStore = inject(DataStore);
    protected readonly langues = this.#dataStore.langues;
    protected readonly types = this.#dataStore.types;

    readonly #securityStore = inject(SecurityStore);
    protected readonly langueSelectedId = this.#securityStore.langueSelected;

    readonly #wordStore = inject(WordStore);
    protected readonly action = this.#wordStore.action;
    protected readonly genders = this.#wordStore.genders;

    messageService = inject(MessageService);

    constructor() {
        effect(() => {
            if (this.mode === 'create' && this.action() == 'created') {
                this.clean();
                this.#wordStore.actionInit();
            }
        });
    }

    get titleTranslationKey(): string {
        return this.mode === 'create' ? 'word.create' : 'word.edit';
    }

    ngAfterViewInit() {
        setTimeout(() => this.focusOnName());
    }

    ngOnChanges(changes: SimpleChanges) {
        if ('form' in changes && !this.#form) {
            throw new Error('WordFormComponent requires a FormGroup input.');
        }
    }

    selectedType(): boolean {
        return this.formGroup?.get('typeId')?.value === 1;
    }

    save() {
        if (this.formGroup?.invalid) {
            this.submitted = true;
            this.formGroup.markAllAsTouched();
            return;
        }
        this.submitted = false;
        const data = { ...this.formGroup.getRawValue() };
        if (this.mode === 'create') {
            data.langueId = this.langueSelectedId();
            this.#wordStore.create(data);
        } else {
            this.#wordStore.update(data);
        }
    }

    clean() {
        const defaultValue = {
            name: '',
            typeId: null,
            genderId: null,
            plural: ''
        };
        this.formGroup?.reset(defaultValue);
        this.formDirective?.resetForm(defaultValue);
        this.submitted = false;
        setTimeout(() => this.focusOnName());
    }

    showError(controlName: string, error: string) {
        const control = this.formGroup?.get(controlName);
        return !!control && control.hasError(error) && (control.touched || this.submitted);
    }

    private focusOnName() {
        if (this.nameInput) {
            this.nameInput.nativeElement.focus();
        }
    }
}
