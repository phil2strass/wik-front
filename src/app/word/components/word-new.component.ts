import { CommonModule } from '@angular/common';
import { Component, OnDestroy, effect, inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WordFormComponent } from '@root/app/word/components/word-form.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslatePipe } from '@ngx-translate/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { ReactiveFormsModule } from '@angular/forms';
import { WordStore } from '../word-store';
import { DataStore } from '@shared/data/data-store';
import { SecurityStore } from '@shared/security/security-store';
import { Gender, Langue } from '@shared/data/models/langue.model';
import { ProfilStorage } from '@shared/models/user.model';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-word-new',
    template: `
        <div class="word-new__container">
            <mat-card class="word-new__card cardWithShadow b-1 rounded p-30">
                <app-word-form
                    #wordFormRef
                    [form]="form"
                    mode="create"
                    [useCard]="false"
                    [translationForms]="translationFormGroups"></app-word-form>

                <section *ngIf="shouldShowTranslationBlocks()" class="word-new__translations">
                    <h5 class="word-new__translations-title">Traductions</h5>
                    <div class="word-new__translations-grid">
                        <mat-card
                            class="word-new__translation-card cardWithShadow b-1 rounded p-24"
                            *ngFor="let block of translationBlocks"
                            [formGroup]="block.form">
                            <div class="word-new__translation-title">
                                {{ block.langueName }}
                                <span *ngIf="block.isMotherTongue" class="word-new__translation-badge">Langue maternelle</span>
                            </div>
                            <mat-label class="f-s-14 f-w-600 m-b-8 d-block m-t-20">
                                Mot
                                <span class="text-error">*</span>
                            </mat-label>
                            <mat-form-field appearance="outline" class="w-100 p-0" color="primary">
                                <input type="text" matInput formControlName="name" />
                            </mat-form-field>
                            <ng-container *ngIf="showTranslationDetails()">
                                <mat-label class="f-s-14 f-w-600 m-b-8 d-block m-t-20">Pluriel</mat-label>
                                <mat-form-field appearance="outline" class="w-100 p-0" color="primary">
                                    <input type="text" matInput formControlName="plural" />
                                </mat-form-field>
                                <div *ngIf="block.genders.length" class="word-new__translation-genders">
                                    <mat-radio-group
                                        formControlName="genderId"
                                        class="d-flex flex-wrap gap-24 justify-content-start mt-2">
                                        <mat-card
                                            *ngFor="let gender of block.genders"
                                            class="cardWithShadow b-1 rounded d-flex gap-30 align-items-center flex-row">
                                            <mat-radio-button class="p-r-16 p-l-6 p-y-2" color="primary" [value]="gender.id">
                                                {{ gender.name }}
                                            </mat-radio-button>
                                        </mat-card>
                                    </mat-radio-group>
                                    <div
                                        class="mat-error word-form__gender-error"
                                        *ngIf="block.form.get('genderId')?.hasError('required') && block.form.get('genderId')?.touched">
                                        Veuillez sélectionner un genre.
                                    </div>
                                </div>
                            </ng-container>
                        </mat-card>
                    </div>
                </section>
                <div class="word-new__footer w-100">
                    <mat-progress-bar
                        *ngIf="isLoading()"
                        class="word-new__loader-bar"
                        mode="indeterminate"></mat-progress-bar>
                    <div class="d-flex gap-20 m-t-12 justify-content-end">
                        <button
                            mat-flat-button
                            color="primary"
                            (click)="wordFormRef.save()"
                            [disabled]="form.invalid || isLoading()">
                            {{ 'word.create' | translate }}
                        </button>
                    </div>
                </div>
            </mat-card>
        </div>
    `,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        WordFormComponent,
        MatButtonModule,
        MatCardModule,
        TranslatePipe,
        MatProgressBarModule,
        MatFormFieldModule,
        MatInputModule,
        MatRadioButton,
        MatRadioGroup
    ],
    styles: [
        `
            .word-new__loader-bar {
                height: 4px;
                margin-bottom: 12px;
            }

            .word-new__container {
                display: flex;
                justify-content: flex-start;
                padding-left: 32px;
            }

            .word-new__card {
                width: 100%;
                max-width: 640px;
                padding-bottom: 24px;
            }

            .word-new__footer {
                margin-top: 12px;
            }

            .word-new__translations {
                margin-top: 24px;
                border-top: 1px solid rgba(0, 0, 0, 0.08);
                padding-top: 24px;
            }

            .word-new__translations-grid {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .word-new__translation-title {
                font-weight: 600;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .word-new__translation-badge {
                font-size: 12px;
                background-color: rgba(25, 118, 210, 0.1);
                color: #1976d2;
                border-radius: 999px;
                padding: 2px 8px;
            }

            .word-new__translation-genders {
                margin-top: 8px;
            }
        `
    ]
})
export class WordNewComponent implements OnDestroy {
    protected readonly form: FormGroup;
    #formBuilder = inject(FormBuilder);
    #wordStore = inject(WordStore);
    #dataStore = inject(DataStore);
    #securityStore = inject(SecurityStore);
    protected readonly status = this.#wordStore.status;
    translationBlocks: TranslationBlock[] = [];
    #translationFormsByLangue = new Map<number, FormGroup>();
    #translationFormSubscriptions = new Map<number, Subscription>();
    #typeSubscription?: Subscription;

    constructor() {
        this.form = this.#formBuilder.group({
            name: ['', Validators.required],
            typeId: [null, Validators.required],
            genderId: [null],
            plural: ['']
        });
        const typeControl = this.form.get('typeId');
        if (typeControl) {
            this.#typeSubscription = typeControl.valueChanges.subscribe(() => this.updateTranslationGenderValidators());
        }

        effect(() => {
            const loading = this.isLoading();
            if (loading && this.form.enabled) {
                this.form.disable({ emitEvent: false });
            } else if (!loading && this.form.disabled) {
                this.form.enable({ emitEvent: false });
            }
            this.setTranslationFormsDisabled(loading);
        });

        effect(() => {
            const profil = this.#securityStore.loadedProfil();
            const langues = this.#dataStore.langues();
            this.updateTranslationBlocks(profil, langues);
        });
    }

    protected get translationFormGroups(): FormGroup[] {
        return this.translationBlocks.map(block => block.form);
    }

    shouldShowTranslationBlocks(): boolean {
        return this.translationBlocks.length > 0 && !!this.form.get('typeId')?.value;
    }

    showTranslationDetails(): boolean {
        return this.form.get('typeId')?.value === 1;
    }

    isLoading(): boolean {
        return this.status() === 'loading';
    }

    private updateTranslationBlocks(profil: ProfilStorage | undefined, langues: Langue[]) {
        if (!profil || !langues || langues.length === 0) {
            this.translationBlocks = [];
            this.#translationFormsByLangue.clear();
            this.clearTranslationFormSubscriptions();
            return;
        }

        const langueSelectedId = this.#securityStore.langueSelected();
        const blockDefinitions: { id: number; isMotherTongue: boolean }[] = [];

        if (profil.langueMaternelle) {
            blockDefinitions.push({ id: profil.langueMaternelle, isMotherTongue: true });
        }

        if (Array.isArray(profil.langues)) {
            profil.langues.forEach(langueId => {
                if (langueId) {
                    blockDefinitions.push({ id: langueId, isMotherTongue: false });
                }
            });
        }

        const seen = new Set<number>();
        const blocks: TranslationBlock[] = [];

        for (const definition of blockDefinitions) {
            if (!definition.id || seen.has(definition.id)) {
                continue;
            }
            if (langueSelectedId && definition.id === langueSelectedId) {
                continue;
            }
            const langueData = langues.find(langue => langue.id === definition.id);
            if (!langueData) {
                continue;
            }
            seen.add(definition.id);
            let form = this.#translationFormsByLangue.get(definition.id);
            if (!form) {
                form = this.#formBuilder.group({
                    langueId: [definition.id],
                    name: [''],
                    plural: [''],
                    genderId: [null]
                });
                this.#translationFormsByLangue.set(definition.id, form);
            }
            this.trackTranslationFormSubscription(definition.id, form);
            blocks.push({
                langueId: definition.id,
                langueName: langueData.name,
                langueIso: langueData.iso,
                genders: langueData.genders ?? [],
                isMotherTongue: definition.isMotherTongue,
                form
            });
        }

        Array.from(this.#translationFormsByLangue.keys()).forEach(id => {
            if (!seen.has(id)) {
                this.#translationFormsByLangue.delete(id);
                this.releaseTranslationFormSubscription(id);
            }
        });

        this.translationBlocks = blocks;
        this.setTranslationFormsDisabled(this.isLoading());
        this.updateTranslationGenderValidators();
    }

    private setTranslationFormsDisabled(disabled: boolean) {
        this.translationBlocks.forEach(block => {
            if (disabled && block.form.enabled) {
                block.form.disable({ emitEvent: false });
            } else if (!disabled && block.form.disabled) {
                block.form.enable({ emitEvent: false });
            }
        });
        this.updateTranslationGenderValidators();
    }

    ngOnDestroy(): void {
        this.#typeSubscription?.unsubscribe();
        this.clearTranslationFormSubscriptions();
    }

    private trackTranslationFormSubscription(langueId: number, form: FormGroup): void {
        this.releaseTranslationFormSubscription(langueId);
        const sub = form.valueChanges.subscribe(() => this.updateTranslationGenderValidators());
        this.#translationFormSubscriptions.set(langueId, sub);
    }

    private releaseTranslationFormSubscription(langueId: number): void {
        const sub = this.#translationFormSubscriptions.get(langueId);
        sub?.unsubscribe();
        this.#translationFormSubscriptions.delete(langueId);
    }

    private clearTranslationFormSubscriptions(): void {
        Array.from(this.#translationFormSubscriptions.values()).forEach(sub => sub.unsubscribe());
        this.#translationFormSubscriptions.clear();
    }

    private updateTranslationGenderValidators(): void {
        const typeId = this.form.get('typeId')?.value;
        const requiresGenderByType = Number(typeId) === 1;
        this.translationBlocks.forEach(block => {
            const genderControl = block.form.get('genderId');
            const nameControl = block.form.get('name');
            if (!genderControl || !nameControl) {
                return;
            }
            const hasName = this.hasNameValue(nameControl.value);
            const shouldRequire = requiresGenderByType && this.requiresGenderForIso(block.langueIso) && hasName;
            if (shouldRequire) {
                genderControl.setValidators([Validators.required]);
            } else {
                genderControl.clearValidators();
            }
            genderControl.updateValueAndValidity({ emitEvent: false });
        });
    }

    private hasNameValue(value: unknown): boolean {
        if (typeof value === 'string') {
            return value.trim().length > 0;
        }
        return false;
    }

    private requiresGenderForIso(iso?: string | null): boolean {
        if (!iso) {
            return false;
        }
        const normalized = iso.trim().toUpperCase();
        return normalized === 'FR' || normalized === 'DE';
    }
}

type TranslationBlock = {
    langueId: number;
    langueName: string;
    langueIso: string;
    genders: Gender[];
    isMotherTongue: boolean;
    form: FormGroup;
};
