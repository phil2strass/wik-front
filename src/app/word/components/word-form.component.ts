import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnChanges, OnDestroy, SimpleChanges, effect, ElementRef, inject, Input, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, FormGroupDirective, NgForm, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ErrorStateMatcher, MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { WordStore } from '../word-store';
import { DataStore } from '@shared/data/data-store';
import { Gender } from '@shared/data/models/langue.model';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { TranslatePipe } from '@ngx-translate/core';
import { SecurityStore } from '@shared/security/security-store';
import { MatCard } from '@angular/material/card';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { Subscription } from 'rxjs';

class WordFormErrorStateMatcher implements ErrorStateMatcher {
    constructor(private readonly isSubmitted: () => boolean) {}

    isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
        if (!control) return false;
        const interacted = control.touched && control.dirty;
        const submitted = form?.submitted || this.isSubmitted();
        return control.invalid && (interacted || submitted);
    }
}

@Component({
    selector: 'app-word-form',
    template: `
        @if (formReady) {
            <form [formGroup]="formGroup" (ngSubmit)="onFormSubmit($event)">
                @if (useCard) {
                    <div class="row">
                        <div class="col-lg-8">
                            <mat-card class="cardWithShadow b-1 rounded p-30">
                                <h4 *ngIf="showTitle" Ctitle>{{ titleTranslationKey | translate }}</h4>
                                <mat-form-field appearance="outline" class="w-100 p-0 m-t-20" color="primary">
                                    <mat-label>Mot</mat-label>
                                    <input
                                        #nameInput
                                        type="text"
                                        matInput
                                        [errorStateMatcher]="errorMatcher"
                                        formControlName="name" />
                                    <mat-error *ngIf="showError('name', 'required')">Veuillez saisir un mot.</mat-error>
                                    <mat-error *ngIf="showError('name', 'duplicate')">
                                        Ce mot existe déjà pour ce type.
                                    </mat-error>
                                </mat-form-field>
                                @if (selectedType() && showPlural) {
                                    <mat-form-field appearance="outline" class="w-100 p-0 m-t-20" color="primary">
                                        <mat-label>Pluriel</mat-label>
                                        <input
                                            type="text"
                                            matInput
                                    [errorStateMatcher]="errorMatcher"
                                formControlName="plural" />
                                    </mat-form-field>
                                }
                                @if (showTypeField) {
                                    <mat-form-field appearance="outline" class="w-100 m-t-20">
                                        <mat-label>Type</mat-label>
                                        <mat-select
                                            formControlName="typeId"
                                            [disabled]="disableTypeSelection"
                                            disableOptionCentering
                                            [errorStateMatcher]="errorMatcher">
                                            @for (type of types(); track type) {
                                                <mat-option [value]="type.id">{{ type.name }}</mat-option>
                                            }
                                        </mat-select>
                                        <mat-error *ngIf="showError('typeId', 'required')">Veuillez saisir un type.</mat-error>
                                    </mat-form-field>
                                }
                                @if (selectedType()) {
                                    <mat-radio-group
                                        formControlName="genderId"
                                        aria-labelledby="example-radio-group-label"
                                        class="d-flex flex-wrap gap-24 justify-content-start 100 mt-2">
                                        @for (gender of genders(); track gender) {
                                            <mat-card
                                                class="cardWithShadow b-1 rounded d-flex gap-30 align-items-center flex-row">
                                                <mat-radio-button
                                                    class="p-r-16 p-l-6 p-y-2"
                                                    color="primary"
                                                    [value]="gender.id">
                                                {{ gender.name }}
                                            </mat-radio-button>
                                        </mat-card>
                                    }
                                </mat-radio-group>
                                <div class="mat-error word-form__gender-error" *ngIf="showError('genderId', 'required')">
                                    Veuillez sélectionner un genre.
                                </div>
                            }
                        </mat-card>
                        </div>
                    </div>
                } @else {
                    <div class="word-form__content w-100">
                        <h4 *ngIf="showTitle" Ctitle>{{ titleTranslationKey | translate }}</h4>
                        <mat-form-field appearance="outline" class="w-100 p-0 m-t-20" color="primary">
                            <mat-label>Mot</mat-label>
                            <input
                                #nameInput
                                type="text"
                                matInput
                                [errorStateMatcher]="errorMatcher"
                                formControlName="name" />
                            <mat-error *ngIf="showError('name', 'required')">Veuillez saisir un mot.</mat-error>
                            <mat-error *ngIf="showError('name', 'duplicate')">
                                Ce mot existe déjà pour ce type.
                            </mat-error>
                        </mat-form-field>
                        @if (selectedType() && showPlural) {
                            <mat-form-field appearance="outline" class="w-100 p-0 m-t-20" color="primary">
                                <mat-label>Pluriel</mat-label>
                                <input
                                    type="text"
                                    matInput
                                    [errorStateMatcher]="errorMatcher"
                                    formControlName="plural" />
                            </mat-form-field>
                        }
                        @if (showTypeField) {
                            <mat-form-field appearance="outline" class="w-100 m-t-20">
                                <mat-label>Type</mat-label>
                                    <mat-select
                                        formControlName="typeId"
                                        [disabled]="disableTypeSelection"
                                    disableOptionCentering
                                    [errorStateMatcher]="errorMatcher">
                                    @for (type of types(); track type) {
                                        <mat-option [value]="type.id">{{ type.name }}</mat-option>
                                    }
                                </mat-select>
                                <mat-error *ngIf="showError('typeId', 'required')">Veuillez saisir un type.</mat-error>
                            </mat-form-field>
                        }
                        @if (selectedType()) {
                            <mat-radio-group
                                formControlName="genderId"
                                aria-labelledby="example-radio-group-label"
                                class="d-flex flex-wrap gap-24 justify-content-start 100 mt-2">
                                @for (gender of genders(); track gender) {
                                    <mat-card
                                        class="cardWithShadow b-1 rounded d-flex gap-30 align-items-center flex-row">
                                        <mat-radio-button
                                            class="p-r-16 p-l-6 p-y-2"
                                            color="primary"
                                            [value]="gender.id">
                                            {{ gender.name }}
                                        </mat-radio-button>
                                    </mat-card>
                                }
                            </mat-radio-group>
                            <div class="mat-error word-form__gender-error" *ngIf="showError('genderId', 'required')">
                                Veuillez sélectionner un genre.
                            </div>
                                }
                            </div>
                        }
            </form>
        }
    `,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        ReactiveFormsModule,
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
export class WordFormComponent implements AfterViewInit, OnChanges, OnDestroy {
    @ViewChild('nameInput') nameInput!: ElementRef;
    @ViewChild(FormGroupDirective) formDirective?: FormGroupDirective;
    submitted = false;
    protected readonly errorMatcher = new WordFormErrorStateMatcher(() => this.submitted);
    #form!: FormGroup;
    formReady = false;
    #nameChangesSub?: Subscription;
    #typeChangesSub?: Subscription;
    #langueChangesSub?: Subscription;
    @Input({ required: true })
    set form(value: FormGroup) {
        if (!value) {
            throw new Error('WordFormComponent requires a FormGroup input.');
        }
        this.#form = value;
        this.formReady = true;
        this.registerNameValueChanges();
        this.registerGenderValidationListeners();
        this.updateGenderRequirement();
    }
    get formGroup(): FormGroup {
        if (!this.#form) {
            throw new Error('WordFormComponent requires a FormGroup input.');
        }
        return this.#form;
    }
    @Input() mode: 'create' | 'update' = 'update';
    @Input() useCard = true;
    @Input() translationForms: FormGroup[] | undefined;
    @Input() disableTypeSelection = false;
    @Input() showTypeField = true;
    @Input() showPlural = true;
    @Input() genderOptional = false;
    @Input() showTitle = true;
    @Input() handleSubmit = true;
    private _gendersOverride: Gender[] | null = null;
    @Input()
    set gendersOverride(value: Gender[] | null | undefined) {
        this._gendersOverride = value ?? null;
        if (this.formReady) {
            this.updateGenderRequirement();
        }
    }

    readonly #dataStore = inject(DataStore);
    protected readonly langues = this.#dataStore.langues;
    protected readonly types = this.#dataStore.types;

    readonly #securityStore = inject(SecurityStore);
    protected readonly langueSelectedId = this.#securityStore.langueSelected;

    readonly #wordStore = inject(WordStore);
    protected readonly action = this.#wordStore.action;
    protected readonly storeError = this.#wordStore.error;

    messageService = inject(MessageService);

    protected genders(): Gender[] {
        if (this._gendersOverride) {
            return this._gendersOverride;
        }
        const storeGenders = this.#wordStore.genders();
        return Array.isArray(storeGenders) ? storeGenders : [];
    }

    constructor() {
        effect(() => {
            if (this.mode === 'create' && this.action() == 'created') {
                this.clean();
                this.#wordStore.actionInit();
            }
        });

        effect(() => {
            const duplicateError = this.storeError();
            if (this.mode !== 'create' || !this.formReady) {
                return;
            }
            const control = this.formGroup?.get('name');
            if (!control) {
                return;
            }
            const currentErrors = { ...(control.errors ?? {}) };
            if (duplicateError === 'mot.exists') {
                currentErrors['duplicate'] = true;
                control.setErrors(currentErrors);
                control.markAsTouched();
            } else if (currentErrors['duplicate']) {
                delete currentErrors['duplicate'];
                const hasErrors = Object.keys(currentErrors).length > 0;
                control.setErrors(hasErrors ? currentErrors : null);
            }
        });

        effect(() => {
            if (!this.formReady) {
                return;
            }
            this.langueSelectedId();
            this.langues();
            this.updateGenderRequirement();
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
    ngOnDestroy() {
        this.#nameChangesSub?.unsubscribe();
        this.#typeChangesSub?.unsubscribe();
        this.#langueChangesSub?.unsubscribe();
    }

    selectedType(): boolean {
        if (this.genderOptional) {
            return false;
        }
        return this.formGroup?.get('typeId')?.value === 1;
    }

    save() {
        const translationInvalid = this.ensureTranslationFormsValid();
        if (this.formGroup?.invalid || translationInvalid) {
            this.submitted = true;
            this.formGroup?.markAllAsTouched();
            return;
        }
        this.submitted = false;
        const data: any = { ...this.formGroup.getRawValue() };
        if (this.mode === 'create') {
            data.langueId = this.langueSelectedId();
            if (this.translationForms?.length) {
                const typeId = data.typeId;
                const translations = this.translationForms
                    .map(group => group.getRawValue())
                    .filter(value => value && value.name && value.name.trim().length > 0)
                    .map(value => ({
                        name: value.name.trim(),
                        langueId: value.langueId,
                        plural: value.plural ?? '',
                        genderId: value.genderId ?? null,
                        typeId
                    }));
                if (translations.length > 0) {
                    data.trads = translations;
                }
            }
            this.#wordStore.create(data);
        } else {
            this.#wordStore.update(data);
        }
    }

    onFormSubmit(event: Event): void {
        if (this.handleSubmit) {
            this.save();
        } else {
            event.preventDefault();
            event.stopPropagation();
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
        this.translationForms?.forEach(group => {
            const langueId = group.get('langueId')?.value;
            group.reset(
                {
                    langueId,
                    name: '',
                    plural: '',
                    genderId: null
                },
                { emitEvent: false }
            );
        });
        this.submitted = false;
        setTimeout(() => this.focusOnName());
    }

    showError(controlName: string, error: string) {
        const control = this.formGroup?.get(controlName);
        const interacted = control?.touched && control?.dirty;
        return !!control && control.hasError(error) && (interacted || this.submitted);
    }

    private focusOnName() {
        if (this.nameInput) {
            this.nameInput.nativeElement.focus();
        }
    }

    private registerNameValueChanges() {
        this.#nameChangesSub?.unsubscribe();
        const control = this.formGroup?.get('name');
        if (!control) return;
        this.#nameChangesSub = control.valueChanges.subscribe(() => {
            this.#wordStore.clearError();
        });
    }

    private ensureTranslationFormsValid(): boolean {
        if (!this.translationForms || this.translationForms.length === 0) {
            return false;
        }
        let invalid = false;
        this.translationForms.forEach(group => {
            if (group.invalid) {
                invalid = true;
                group.markAllAsTouched();
            }
        });
        return invalid;
    }

    private registerGenderValidationListeners() {
        this.#typeChangesSub?.unsubscribe();
        this.#langueChangesSub?.unsubscribe();
        const typeControl = this.formGroup?.get('typeId');
        if (typeControl) {
            this.#typeChangesSub = typeControl.valueChanges.subscribe(() => this.updateGenderRequirement());
        }
        const langueControl = this.formGroup?.get('langueId');
        if (langueControl) {
            this.#langueChangesSub = langueControl.valueChanges.subscribe(() => this.updateGenderRequirement());
        }
    }

    private updateGenderRequirement() {
        if (!this.formReady) {
            return;
        }
        const genderControl = this.formGroup?.get('genderId');
        if (!genderControl) {
            return;
        }
        const requireGender = this.genderOptional ? false : this.shouldRequireGenderSelection();
        if (requireGender) {
            genderControl.setValidators([Validators.required]);
        } else {
            genderControl.clearValidators();
        }
        genderControl.updateValueAndValidity({ emitEvent: false });
    }

    private shouldRequireGenderSelection(): boolean {
        const typeValue = this.formGroup?.get('typeId')?.value;
        if (typeValue == null) {
            return false;
        }
        const typeId = Number(typeValue);
        if (!Number.isFinite(typeId) || typeId !== 1) {
            return false;
        }
        const langueIso = this.findLangueIso(this.resolveActiveLangueId());
        return this.requiresGenderForIso(langueIso);
    }

    private resolveActiveLangueId(): number | null {
        const langueControl = this.formGroup?.get('langueId');
        if (langueControl) {
            const value = langueControl.value;
            if (typeof value === 'number') {
                return value;
            }
            if (value != null) {
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : null;
            }
            return null;
        }
        const selected = this.langueSelectedId();
        return selected ?? null;
    }

    private findLangueIso(langueId: number | null): string | null {
        if (langueId == null) {
            return null;
        }
        const langues = this.langues();
        const langue = langues?.find(l => l.id === langueId);
        return langue?.iso ?? null;
    }

    private requiresGenderForIso(iso?: string | null): boolean {
        if (!iso) {
            return false;
        }
        const normalized = iso.trim().toUpperCase();
        return normalized === 'FR' || normalized === 'DE';
    }
}
