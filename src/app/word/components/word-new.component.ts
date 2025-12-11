import { CommonModule } from '@angular/common';
import { Component, OnDestroy, effect, inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WordFormComponent } from '@root/app/word/components/word-form/word-form.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslatePipe } from '@ngx-translate/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { ReactiveFormsModule } from '@angular/forms';
import { WordStore } from '../word-store';
import { DataStore } from '@shared/data/data-store';
import { SecurityStore } from '@shared/security/security-store';
import { Gender, Langue } from '@shared/data/models/langue.model';
import { ProfilStorage } from '@shared/models/user.model';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { Categorie } from '../models/categorie.model';
import { CategorieService } from '../services/categorie.service';
import { MessageService } from '@shared/ui-messaging/message/message.service';

@Component({
    selector: 'app-word-new',
    template: `
                <div class="word-new__container">
                    <mat-card class="word-new__card cardWithShadow b-1 rounded p-30">
                        <div class="word-new__card-title">{{ 'word.create' | translate }}</div>
                        <div class="word-new__categories-wrapper" [formGroup]="form">
                            <mat-form-field appearance="outline" class="word-new__categories-field" color="primary">
                                <mat-label>Catégories</mat-label>
                                <mat-select formControlName="categorieIds" [disabled]="isLoading()" multiple>
                                    @for (cat of categories; track cat.id) {
                                        <mat-option [value]="cat.id">{{ cat.name }}</mat-option>
                                    }
                                </mat-select>
                            </mat-form-field>
                        </div>
                        <app-word-form
                            #wordFormRef
                            [form]="form"
                            mode="create"
                            [useCard]="false"
                    [showTitle]="false"
                    [inlineLayout]="true"
                    [translationForms]="translationFormGroups"></app-word-form>

                <div *ngIf="shouldShowTranslationButtons()" class="word-new__translations-actions">
                    <button
                        mat-stroked-button
                        color="primary"
                        type="button"
                        *ngFor="let block of translationBlocks"
                        (click)="addTranslation(block)">
                        + traduction {{ translatedLang(block) }}
                    </button>
                </div>
                <section *ngIf="hasTranslationForms()" class="word-new__translations">
                    <div class="word-new__translations-grid">
                        <div
                            class="word-new__translation-card"
                            *ngFor="let block of translationBlocks"
                            [hidden]="!block.forms.length">
                            <ng-container *ngFor="let formGroup of block.forms; let idx = index">
                                <div class="word-new__translation-form" [formGroup]="formGroup">
                                    <div class="word-new__translation-form-header">
                                        <span>{{ translatedLang(block) }} {{ idx + 1 }}</span>
                                        <button
                                            mat-icon-button
                                            color="warn"
                                            type="button"
                                            class="word-new__translation-delete"
                                            (click)="removeTranslation(block, idx)">
                                            <mat-icon>delete</mat-icon>
                                        </button>
                                    </div>
                                    <div class="word-new__translation-inline">
                                        <mat-form-field appearance="outline" class="word-new__translation-field" color="primary">
                                            <mat-label>{{ 'word.form.name.label' | translate }}</mat-label>
                                            <input type="text" matInput formControlName="name" />
                                        </mat-form-field>
                                        @if (showTranslationDetails()) {
                                            <mat-form-field appearance="outline" class="word-new__translation-field" color="primary">
                                                <mat-label>{{ 'word.form.plural.label' | translate }}</mat-label>
                                                <input type="text" matInput formControlName="plural" />
                                            </mat-form-field>
                                        }
                                        @if (showTranslationDetails() && block.genders.length) {
                                            <mat-form-field appearance="outline" class="word-new__translation-field word-new__translation-gender" color="primary">
                                                <mat-label>{{ 'word.form.gender.label' | translate }}</mat-label>
                                                <mat-select formControlName="genderId">
                                                    @for (gender of block.genders; track gender.id) {
                                                        <mat-option [value]="gender.id">{{ gender.name }}</mat-option>
                                                    }
                                                </mat-select>
                                            </mat-form-field>
                                        }
                                    </div>
                                    @if (showTranslationDetails() && block.genders.length) {
                                        <div
                                            class="mat-error word-form__gender-error"
                                            *ngIf="formGroup.get('genderId')?.hasError('required') && formGroup.get('genderId')?.touched">
                                            Veuillez sélectionner un genre.
                                        </div>
                                    }
                                </div>
                            </ng-container>
                        </div>
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
        MatSelectModule,
        MatOptionModule,
        MatIconModule,
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
                max-width: 100%;
                position: relative;
                padding-top: 24px;
                padding-bottom: 8px;
            }

            .word-new__card .mat-mdc-card-content {
                padding-top: 0;
            }

            .word-new__categories-wrapper {
                margin-bottom: 8px;
            }

            .word-new__categories-field {
                width: 320px;
                margin-bottom: 8px;
            }

            .word-new__footer {
                margin-top: 12px;
            }

            .word-new__translations {
                margin-top: 8px;
                padding-top: 12px;
                padding-bottom: 12px;
                border-top: 1px solid rgba(0, 0, 0, 0.08);
                border-bottom: 1px solid rgba(0, 0, 0, 0.08);
            }

            .word-new__translations-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .word-new__translations-grid {
                display: flex;
                flex-direction: column;
                gap: 10px;
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

            .word-new__translation-form {
                margin-top: 6px;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .word-new__translation-card + .word-new__translation-card {
                padding-top: 10px;
                border-top: 1px solid rgba(0, 0, 0, 0.08);
            }

            .word-new__translation-inline {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                align-items: flex-end;
            }

            .word-new__translation-field {
                flex: 0 0 240px;
                min-width: 240px;
            }

            .word-new__translation-gender {
                flex: 0 0 240px;
            }

            .word-new__translation-form-header {
                font-weight: 600;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                justify-content: flex-start;
                gap: 8px;
            }

            .word-new__translation-delete {
                padding: 0;
                width: 32px;
                height: 32px;
                margin-left: 8px;
            }

            .word-new__card-title {
                position: absolute;
                top: 0;
                left: 16px;
                transform: translateY(-50%);
                background: #fff;
                padding: 4px 10px;
                font-weight: 600;
                font-size: 1.05rem;
                line-height: 1.2;
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
    #translate = inject(TranslateService);
    #categorieService = inject(CategorieService);
    #messageService = inject(MessageService);
    protected readonly status = this.#wordStore.status;
    translationBlocks: TranslationBlock[] = [];
    #translationFormsByLangue = new Map<number, FormGroup[]>();
    #translationFormSubscriptions = new Map<FormGroup, Subscription>();
    #typeSubscription?: Subscription;
    categories: Categorie[] = [];

    constructor() {
        this.form = this.#formBuilder.group({
            name: ['', Validators.required],
            typeId: [null, Validators.required],
            genderId: [null],
            plural: [''],
            categorieIds: [[1]]
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

        this.loadCategories();

        effect(() => {
            if (this.#wordStore.action() === 'created') {
                this.resetTranslationForms();
            }
        });
    }

    protected get translationFormGroups(): FormGroup[] {
        return this.translationBlocks.flatMap(block => block.forms);
    }

    shouldShowTranslationButtons(): boolean {
        return this.translationBlocks.length > 0 && !!this.form.get('typeId')?.value;
    }

    hasTranslationForms(): boolean {
        return this.translationBlocks.some(block => block.forms.length > 0);
    }

    showTranslationDetails(): boolean {
        return this.form.get('typeId')?.value === 1;
    }

    isLoading(): boolean {
        return this.status() === 'loading';
    }

    private loadCategories(): void {
        this.#categorieService.list().subscribe({
            next: data => (this.categories = data),
            error: err => this.#messageService.error(err?.error ?? 'Erreur lors du chargement des catégories')
        });
    }

    private createTranslationForm(langueId: number): FormGroup {
        return this.#formBuilder.group({
            langueId: [langueId],
            name: [''],
            plural: [''],
            genderId: [null]
        });
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
            let forms = this.#translationFormsByLangue.get(definition.id);
            if (!forms) {
                forms = [];
                this.#translationFormsByLangue.set(definition.id, forms);
            }
            forms.forEach(form => this.trackTranslationFormSubscription(form));
            blocks.push({
                langueId: definition.id,
                langueName: langueData.name,
                langueIso: langueData.iso,
                genders: langueData.genders ?? [],
                isMotherTongue: definition.isMotherTongue,
                forms: [...forms]
            });
        }

        Array.from(this.#translationFormsByLangue.entries()).forEach(([id, forms]) => {
            if (!seen.has(id)) {
                forms.forEach(form => this.releaseTranslationFormSubscription(form));
                this.#translationFormsByLangue.delete(id);
            }
        });

        this.translationBlocks = blocks;
        this.setTranslationFormsDisabled(this.isLoading());
        this.updateTranslationGenderValidators();
    }

    private resetTranslationForms(): void {
        this.clearTranslationFormSubscriptions();
        this.#translationFormsByLangue.clear();
        const profil = this.#securityStore.loadedProfil();
        const langues = this.#dataStore.langues();
        this.updateTranslationBlocks(profil, langues);
    }

    translatedLang(block: TranslationBlock): string {
        const iso = block.langueIso?.toLowerCase();
        if (iso) {
            const key = `word.lang.${iso}`;
            const translated = this.#translate.instant(key);
            if (translated && translated !== key) {
                return translated;
            }
        }
        return block.langueName;
    }

    headerLangLabel(): string {
        const selectedId = this.#securityStore.langueSelected();
        const langues = this.#dataStore.langues();
        const langue = langues?.find(l => l.id === selectedId);
        const iso = langue?.iso?.toLowerCase();
        if (iso) {
            const key = `word.lang.${iso}`;
            const translated = this.#translate.instant(key);
            if (translated && translated !== key) {
                return translated;
            }
        }
        return langue?.name ?? '';
    }

    private setTranslationFormsDisabled(disabled: boolean) {
        this.translationBlocks.forEach(block => {
            block.forms.forEach(form => {
                if (disabled && form.enabled) {
                    form.disable({ emitEvent: false });
                } else if (!disabled && form.disabled) {
                    form.enable({ emitEvent: false });
                }
            });
        });
        this.updateTranslationGenderValidators();
    }

    addTranslation(block: TranslationBlock): void {
        const form = this.createTranslationForm(block.langueId);
        const forms = this.#translationFormsByLangue.get(block.langueId) ?? [];
        forms.push(form);
        this.#translationFormsByLangue.set(block.langueId, forms);
        this.trackTranslationFormSubscription(form);
        const updatedBlocks = this.translationBlocks.map(b =>
            b.langueId === block.langueId ? { ...b, forms: [...forms] } : b
        );
        this.translationBlocks = updatedBlocks;
        this.setTranslationFormsDisabled(this.isLoading());
    }

    removeTranslation(block: TranslationBlock, index: number): void {
        const forms = this.#translationFormsByLangue.get(block.langueId);
        if (!forms || !forms[index]) {
            return;
        }
        const [removed] = forms.splice(index, 1);
        this.releaseTranslationFormSubscription(removed);
        this.#translationFormsByLangue.set(block.langueId, forms);
        this.translationBlocks = this.translationBlocks.map(b =>
            b.langueId === block.langueId ? { ...b, forms: [...forms] } : b
        );
    }

    ngOnDestroy(): void {
        this.#typeSubscription?.unsubscribe();
        this.clearTranslationFormSubscriptions();
    }

    private trackTranslationFormSubscription(form: FormGroup): void {
        this.releaseTranslationFormSubscription(form);
        const sub = form.valueChanges.subscribe(() => this.updateTranslationGenderValidators());
        this.#translationFormSubscriptions.set(form, sub);
    }

    private releaseTranslationFormSubscription(form: FormGroup): void {
        const sub = this.#translationFormSubscriptions.get(form);
        sub?.unsubscribe();
        this.#translationFormSubscriptions.delete(form);
    }

    private clearTranslationFormSubscriptions(): void {
        Array.from(this.#translationFormSubscriptions.values()).forEach(sub => sub.unsubscribe());
        this.#translationFormSubscriptions.clear();
    }

    private updateTranslationGenderValidators(): void {
        const typeId = this.form.get('typeId')?.value;
        const requiresGenderByType = Number(typeId) === 1;
        this.translationBlocks.forEach(block => {
            block.forms.forEach(formGroup => {
                const genderControl = formGroup.get('genderId');
                const nameControl = formGroup.get('name');
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
    forms: FormGroup[];
};
