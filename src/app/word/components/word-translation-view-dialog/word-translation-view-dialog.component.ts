import { Component, Inject, ElementRef, QueryList, ViewChildren, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { HttpClient } from '@angular/common/http';
import { Configuration } from '../../../shared/config/configuration';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { Word, WordTranslationValue } from '../../models/word.model';
import { Langue } from '@shared/data/models/langue.model';
import { Observable } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatRippleModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DataStore } from '@shared/data/data-store';
import { WordMeaningTranslation, WordTranslationModalStore } from '../../word-translation-modal-store';
import { WordTranslationDeleteConfirmDialogComponent } from '../word-translation-delete-confirm-dialog.component';
import { ExampleTranslationDialogComponent } from '@root/app/word/components/example-dialog/example-translation-dialog.component';
import { WordTranslationEntryDialogComponent } from '@root/app/word/components/word-translation-entry-dialog.component';

type WordTranslationEditDialogData = {
    parentWord: Word;
    langue: Langue;
    languages?: Langue[];
    translations?: WordTranslationValue[];
    typeId: number | null;
    sourceLangueName?: string;
    sourceLangueIso?: string;
};

@Component({
    selector: 'app-word-translation-edit-dialog',
    templateUrl: './word-translation-view-dialog.component.html',
    styleUrls: ['./word-translation-view-dialog.component.scss'],
    standalone: true,
    providers: [WordTranslationModalStore],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatButtonModule,
        MatListModule,
        MatIconModule,
        MatChipsModule,
        MatRippleModule,
        MatProgressBarModule,
        MatFormFieldModule,
        MatInputModule,
        MatTooltipModule,
        TranslateModule
    ]
})
export class WordTranslationEditDialogComponent {
    @ViewChildren('translationInput') translationInputs!: QueryList<ElementRef<HTMLInputElement>>;
    title: string;
    targetWordLabel = '';
    translationForms: FormGroup[] = [];
    selectedIndex = 0;
    editingForm: FormGroup | null = null;
    private editingSnapshot: unknown | null = null;
    private formsByMeaningId = new Map<number, FormGroup[]>();
    saving = false;
    requiresGenderField: boolean;
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: WordTranslationEditDialogData,
        private dialogRef: MatDialogRef<WordTranslationEditDialogComponent>,
        private dialog: MatDialog,
        private fb: FormBuilder,
        private http: HttpClient,
        private configuration: Configuration,
        private messageService: MessageService,
        private translate: TranslateService
    ) {
        this.translationModalStore.init({
            parentWord: data.parentWord,
            langue: data.langue,
            languages: data.languages,
            initialTypeId: data.typeId
        });
        this.targetWordLabel = this.formatLocalizedWord(
            data.parentWord,
            data.sourceLangueIso ?? data.langue.iso
        );
        this.title = `${this.targetWordLabel} ->`;
        this.requiresGenderField = this.shouldRequireGender(this.activeLang, this.activeTypeId);
        this.selectedIndex = -1;

        effect(() => {
            this.requiresGenderField = this.shouldRequireGender(this.activeLang, this.activeTypeId);
        });

        effect(() => {
            const currentEditing = this.editingForm;
            const status = this.translationModalStore.status();
            const meanings = this.translationModalStore.meaningTranslations();
            const pendingEditMeaningId = this.translationModalStore.pendingEditMeaningId();
            if (status !== 'loaded') {
                return;
            }
            this.syncMeaningForms(meanings);
            if (!currentEditing) {
                this.selectedIndex = this.translationForms.length ? 0 : -1;
            } else {
                const idx = this.formIndex(currentEditing);
                if (idx >= 0) {
                    this.selectedIndex = idx;
                }
            }
            if (pendingEditMeaningId != null && !currentEditing) {
                const form = this.formsByMeaningId.get(pendingEditMeaningId)?.[0];
                if (form) {
                    this.startEditing(form);
                }
            }
            if (currentEditing && !this.translationForms.includes(currentEditing)) {
                this.editingForm = null;
                this.editingSnapshot = null;
            }
        });
    }

    private readonly dataStore = inject(DataStore);
    private readonly translationModalStore = inject(WordTranslationModalStore);

    get languages(): Langue[] {
        return this.translationModalStore.languages();
    }

    get activeLang(): Langue {
        return this.translationModalStore.selectedLanguage() ?? this.data.langue;
    }

    get activeTypeId(): number | null {
        return this.translationModalStore.selectedTypeId();
    }

    get loading(): boolean {
        return this.saving || this.translationModalStore.status() === 'loading';
    }

    get displayWordLabel(): string {
        return this.meaningMode ? `${this.targetWordLabel} 1` : this.targetWordLabel;
    }

    get meaningMode(): boolean {
        return this.translationModalStore.meanings().length > 1;
    }

    get typeOptions(): number[] {
        return this.translationModalStore.typeOptionIds();
    }

    get baseTypes(): string[] {
        const raw = this.data.parentWord.types;
        if (typeof raw === 'string' && raw.trim().length > 0) {
            return raw
                .split(',')
                .map(v => v.trim())
                .filter(v => v.length > 0);
        }
        const single = this.data.parentWord.type?.name;
        return single ? [single] : [];
    }

    get selectedForm(): FormGroup | null {
        if (!this.translationForms.length) {
            return null;
        }
        const form = this.translationForms[this.selectedIndex] ?? null;
        return form ?? null;
    }

    get filteredTranslationForms(): FormGroup[] {
        if (this.activeTypeId == null) {
            return this.translationForms;
        }
        return this.translationForms.filter(f => this.translationTypeId(f) === this.activeTypeId);
    }

    get meaningGroups(): { meaningId: number; index: number; forms: FormGroup[] }[] {
        const typeFiltered = this.filteredTranslationForms;
        const meaningMap = new Map<number, { meaningId: number; index: number; forms: FormGroup[] }>();
        const meaningDefinitions = this.translationModalStore.meanings();
        const indexMap = new Map<number, number>();
        meaningDefinitions.forEach(def => {
            indexMap.set(def.wordLangueTypeId, def.index);
            meaningMap.set(def.wordLangueTypeId, { meaningId: def.wordLangueTypeId, index: def.index, forms: [] });
        });

        typeFiltered.forEach(form => {
            const meaningId = this.extractNumber(form.get('baseWordLangueTypeId')?.value);
            if (!meaningId) return;
            const index = indexMap.get(meaningId) ?? this.extractNumber(form.get('meaningIndex')?.value) ?? 1;
            const entry =
                meaningMap.get(meaningId) ??
                (() => {
                    const created = { meaningId, index, forms: [] as FormGroup[] };
                    meaningMap.set(meaningId, created);
                    return created;
                })();
            entry.forms.push(form);
        });

        return Array.from(meaningMap.values()).sort((a, b) => a.index - b.index);
    }

    addHomonym(): void {
        if (this.loading) {
            return;
        }
        const sourceForm = this.selectedForm ?? this.editingForm ?? this.translationForms[0] ?? null;
        const sourceMeaningId =
            this.extractNumber(sourceForm?.get('baseWordLangueTypeId')?.value) ?? this.data.parentWord.wordLangueTypeId;
        if (!sourceMeaningId) {
            this.messageService.error('Selectionnez un sens existant pour creer un homonyme.');
            return;
        }

        this.saving = true;
        this.http.post(`${this.configuration.baseUrl}word/meanings/${sourceMeaningId}`, {}).subscribe({
            next: () => {
                this.messageService.info('Homonyme ajouté');
                this.translationModalStore.reloadTranslations();
            },
            error: err => {
                this.messageService.error(err?.error ?? 'Erreur lors de la creation de l\'homonyme');
            },
            complete: () => {
                this.saving = false;
            }
        });
    }

    addTranslationForMeaning(meaningId: number, meaningIndex?: number): void {
        if (!meaningId) {
            return;
        }
        if (this.loading) {
            return;
        }
        const dialogRef = this.dialog.open(WordTranslationEntryDialogComponent, {
            width: '420px',
            data: {
                titleKey: 'word.translation.addTitle',
                confirmKey: 'word.translation.add',
                labelKey: 'word.translation.label'
            }
        });
        dialogRef.afterClosed().subscribe((value?: string | null) => {
            if (!value) {
                return;
            }
            const idx = meaningIndex ?? this.meaningIndexFromMap(meaningId) ?? 1;
            const langueId = this.activeLang?.id ?? this.data.langue.id;
            const typeId = this.activeTypeId ?? this.data.typeId ?? null;
            if (!langueId || !typeId) {
                this.messageService.error('Langue ou type manquant pour ajouter une traduction.');
                return;
            }
            const payload = {
                wordLangueTypeId: null,
                name: value,
                plural: '',
                langueId,
                typeId,
                genderId: null,
                baseWordTypeId: this.data.parentWord.wordLangueTypeId,
                baseWordLangueTypeId: meaningId,
                targetWordLangueTypeId: null,
                meaningIndex: idx
            };
            this.saving = true;
            this.http.post(`${this.configuration.baseUrl}word/${this.data.parentWord.wordLangueTypeId}/translation`, payload).subscribe({
                next: () => {
                    this.messageService.info('Bien enregistré !');
                    this.translationModalStore.reloadTranslations();
                },
                error: err => {
                    this.messageService.error(err?.error ?? 'Erreur lors de la sauvegarde');
                },
                complete: () => {
                    this.saving = false;
                }
            });
        });
    }

    openEditTranslationDialog(form: FormGroup, event?: Event): void {
        event?.stopPropagation();
        if (this.loading) {
            return;
        }
        const currentName = typeof form.get('name')?.value === 'string' ? (form.get('name')?.value as string).trim() : '';
        const dialogRef = this.dialog.open(WordTranslationEntryDialogComponent, {
            width: '420px',
            data: {
                titleKey: 'word.translation.editTitle',
                confirmKey: 'word.translation.save',
                labelKey: 'word.translation.label',
                initialValue: currentName
            }
        });
        dialogRef.afterClosed().subscribe((value?: string | null) => {
            if (!value) {
                return;
            }
            const payload = form.getRawValue();
            payload.name = value;
            this.saving = true;
            this.http.put(`${this.configuration.baseUrl}word`, payload).subscribe({
                next: () => {
                    this.messageService.info('Bien enregistré !');
                    this.translationModalStore.reloadTranslations();
                },
                error: err => {
                    this.messageService.error(err?.error ?? 'Erreur lors de la sauvegarde');
                },
                complete: () => {
                    this.saving = false;
                }
            });
        });
    }

    confirmDeleteMeaning(meaningId: number): void {
        if (!meaningId || this.loading) {
            return;
        }
        const dialogRef = this.dialog.open(WordTranslationDeleteConfirmDialogComponent, {
            width: '420px',
            data: {
                title: 'Supprimer l\'homonyme',
                message: 'Voulez-vous vraiment supprimer cet homonyme ?',
                confirmLabel: 'Supprimer'
            }
        });
        dialogRef.afterClosed().subscribe(confirm => {
            if (!confirm) {
                return;
            }
            this.translationModalStore.deleteMeaning(meaningId);
        });
    }

    selectTranslation(index: number): void {
        if (index >= 0 && index < this.translationForms.length) {
            this.selectedIndex = index;
        }
    }

    selectTranslationByForm(form: FormGroup): void {
        const idx = this.formIndex(form);
        if (idx >= 0) {
            this.selectedIndex = idx;
        }
    }

    startEditing(form: FormGroup, event?: Event): void {
        if (this.loading) {
            return;
        }
        const alreadyEditing = this.editingForm === form;

        if (alreadyEditing) {
            event?.stopPropagation();
            this.focusInput(form, false);
            return;
        }
        event?.stopPropagation();
        this.editingForm = form;
        this.editingSnapshot = form.getRawValue();
        const idx = this.formIndex(form);
        if (idx >= 0) {
            this.selectedIndex = idx;
        }
        this.focusInput(form, !alreadyEditing);
    }

    deleteTranslation(form: FormGroup, event: Event): void {
        event.stopPropagation();
        if (this.loading) {
            return;
        }
        if (!form) return;

        const name = typeof form.get('name')?.value === 'string' ? (form.get('name')?.value as string).trim() : '';
        const confirmRef = this.dialog.open(WordTranslationDeleteConfirmDialogComponent, {
            width: '420px',
            data: { name: name || null }
        });

        confirmRef.afterClosed().subscribe(confirm => {
            if (!confirm) {
                return;
            }

            if (this.editingForm === form) {
                this.editingForm = null;
                this.editingSnapshot = null;
            }

            const wordLangueTypeId = this.extractNumber(form.get('wordLangueTypeId')?.value);
            const resolvedWordTypeId = wordLangueTypeId ?? this.lookupWordTypeId(form);
            const sourceMeaningId = this.resolveSourceMeaningId(form);
            const targetMeaningId = this.resolveTargetMeaningId(form, resolvedWordTypeId);
            if (!resolvedWordTypeId || !sourceMeaningId || !targetMeaningId) {
                const idx = this.translationForms.indexOf(form);
                if (idx >= 0) {
                    this.translationForms.splice(idx, 1);
                    if (this.selectedIndex >= this.translationForms.length) {
                        this.selectedIndex = this.translationForms.length - 1;
                    }
                }
                if (this.hasPersistedEntry(form, resolvedWordTypeId)) {
                    this.messageService.error(this.translate.instant('Erreur lors de la suppression'));
                }
                return;
            }

            this.saving = true;
            this.http
                .delete(
                    `${this.configuration.baseUrl}word/meanings/${sourceMeaningId}/translations/meaning/${targetMeaningId}`
                )
                .subscribe({
                next: () => {
                    this.messageService.info('Suppression réussie');
                    this.translationModalStore.reloadTranslations();
                },
                error: err => {
                    this.messageService.error(err?.error ?? 'Erreur lors de la suppression');
                },
                complete: () => {
                    this.saving = false;
                }
            });
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    validateEdit(form: FormGroup, event?: Event): void {
        event?.stopPropagation();
        if (this.loading) {
            return;
        }
        if (form.invalid) {
            form.markAllAsTouched();
            return;
        }
        const nameValue = form.get('name')?.value;
        if (typeof nameValue !== 'string' || nameValue.trim().length === 0) {
            form.get('name')?.setErrors({ required: true });
            form.markAllAsTouched();
            return;
        }

        this.saving = true;
        const payload = form.getRawValue();
        const hasId = !!payload.wordLangueTypeId;
        const request$: Observable<unknown> = hasId
            ? this.http.put(`${this.configuration.baseUrl}word`, payload)
            : this.http.post(`${this.configuration.baseUrl}word/${this.data.parentWord.wordLangueTypeId}/translation`, payload);
        request$.subscribe({
            next: () => {
                this.messageService.info('Bien enregistré !');
                this.editingForm = null;
                this.editingSnapshot = null;
                this.translationModalStore.reloadTranslations();
            },
            error: err => {
                this.messageService.error(err?.error ?? 'Erreur lors de la sauvegarde');
            },
            complete: () => {
                this.saving = false;
            }
        });
    }

    cancelEdit(form: FormGroup, event?: Event): void {
        event?.stopPropagation();
        if (this.loading) {
            return;
        }
        const snapshot = this.editingSnapshot as any;
        const isNewUnsaved = !this.extractNumber(form.get('wordLangueTypeId')?.value) && snapshot?.wordLangueTypeId == null;
        if (isNewUnsaved) {
            const meaningId = this.extractNumber(form.get('baseWordLangueTypeId')?.value);
            this.removeForm(form, meaningId ?? undefined);
        } else if (snapshot && typeof snapshot === 'object') {
            form.reset(snapshot, { emitEvent: false });
            form.markAsPristine();
            form.markAsUntouched();
        }
        this.editingForm = null;
        this.editingSnapshot = null;
    }

    selectLanguage(lang: Langue): void {
        if (!lang || this.activeLang?.id === lang.id) {
            return;
        }
        this.editingForm = null;
        this.editingSnapshot = null;
        this.selectedIndex = -1;
        this.translationModalStore.selectLanguage(lang.id);
    }

    private buildFormsForLang(lang: Langue, provided?: WordTranslationValue[]): FormGroup[] {
        const translations =
            Array.isArray(provided) && provided.length
                ? provided
                : this.extractTranslationValues(this.data.parentWord, lang.id);
        if (!translations.length) {
            return [];
        }
        return translations.map(tr => this.createTranslationForm(tr, lang, this.data, null));
    }

    private createTranslationForm(
        translation: WordTranslationValue | undefined,
        lang: Langue,
        data: WordTranslationEditDialogData,
        forcedTypeId?: number | null
    ): FormGroup {
        return this.fb.group({
            wordLangueTypeId: [translation?.wordLangueTypeId ?? null],
            name: [translation?.name ?? '', Validators.required],
            plural: [translation?.plural ?? ''],
            langueId: [translation?.langueId ?? lang.id, Validators.required],
            typeId: [translation?.typeId ?? forcedTypeId ?? data.typeId ?? null, Validators.required],
            genderId: [translation?.genderId ?? null],
            baseWordTypeId: [data.parentWord.wordLangueTypeId],
            baseWordLangueTypeId: [translation?.baseWordLangueTypeId ?? null],
            targetWordLangueTypeId: [translation?.targetWordLangueTypeId ?? null],
            meaningIndex: [translation?.meaningIndex ?? null]
        });
    }

    selectType(typeId: number | null): void {
        if (typeId === this.activeTypeId) {
            return;
        }
        this.editingForm = null;
        this.requiresGenderField = this.shouldRequireGender(this.activeLang, typeId);
        if (typeId == null) {
            this.selectedIndex = -1;
            this.translationModalStore.selectType(null);
            return;
        }
        this.selectedIndex = -1;
        this.translationModalStore.selectType(typeId);
    }

    meaningLabel(form: FormGroup): string {
        const idx = this.extractNumber(form.get('meaningIndex')?.value) ?? 1;
        return this.meaningMode ? `${this.targetWordLabel} ${idx}` : this.targetWordLabel;
    }

    meaningTitle(index: number): string {
        return this.meaningMode ? `${this.targetWordLabel} ${index}` : this.targetWordLabel;
    }

    openExamplesForTranslation(form: FormGroup): void {
        const langue = this.activeLang;
        const baseWordLangueTypeId = this.extractNumber(form.get('baseWordLangueTypeId')?.value);
        const translationId = this.extractNumber(form.get('wordLangueTypeId')?.value);
        const wordLangueTypeId = baseWordLangueTypeId ?? translationId;
        if (!langue || !wordLangueTypeId) {
            return;
        }
        const meaningIndex = this.extractNumber(form.get('meaningIndex')?.value) ?? 1;
        this.dialog.open(ExampleTranslationDialogComponent, {
            width: '1000px',
            maxWidth: '1000px',
            autoFocus: false,
            restoreFocus: false,
            data: {
                wordLangueTypeId,
                wordLabel: this.meaningTitle(meaningIndex),
                langue,
                languages: this.languages
            }
        });
    }

    private syncMeaningForms(items: WordMeaningTranslation[]): void {
        const nextForms: FormGroup[] = [];
        const ids = new Set<number>();
        const nextMap = new Map<number, FormGroup[]>();
        const sorted = Array.isArray(items) ? [...items].sort((a, b) => (a.index ?? 0) - (b.index ?? 0)) : [];

        sorted.forEach(item => {
            const meaningId = item?.wordLangueTypeId;
            if (!meaningId) return;
            ids.add(meaningId);

            const meaningForms = this.formsForMeaning(meaningId);
            const targetId = item.targetWordLangueTypeId ?? item.wordLangueTypeId;
            let form = meaningForms.find(f => this.extractNumber(f.get('wordLangueTypeId')?.value) === targetId);

            if (!form) {
                if (this.isPlaceholderTranslation(item)) {
                    return;
                }
                form = this.createMeaningForm(item);
                meaningForms.push(form);
            } else if (this.editingForm !== form) {
                form.patchValue(
                    {
                        wordLangueTypeId: item.targetWordLangueTypeId ?? null,
                        name: item.name ?? '',
                        plural: item.plural ?? '',
                        langueId: item.langueId,
                        typeId: item.typeId,
                        genderId: item.genderId ?? null,
                        baseWordTypeId: this.data.parentWord.wordLangueTypeId,
                        baseWordLangueTypeId: meaningId,
                        targetWordLangueTypeId: item.targetWordLangueTypeId ?? null,
                        meaningIndex: item.index
                    },
                    { emitEvent: false }
                );
                form.markAsPristine();
            }
            nextForms.push(form);
            nextMap.set(meaningId, meaningForms);
        });

        Array.from(this.formsByMeaningId.keys()).forEach(id => {
            if (!ids.has(id)) {
                this.formsByMeaningId.delete(id);
            }
        });

        this.formsByMeaningId = nextMap;
        this.translationForms = nextForms;
    }

    private createMeaningForm(item: WordMeaningTranslation): FormGroup {
        return this.fb.group({
            wordLangueTypeId: [item.targetWordLangueTypeId ?? null],
            name: [item.name ?? '', Validators.required],
            plural: [item.plural ?? ''],
            langueId: [item.langueId ?? this.activeLang.id, Validators.required],
            typeId: [item.typeId ?? this.activeTypeId ?? this.data.typeId ?? null, Validators.required],
            genderId: [item.genderId ?? null],
            baseWordTypeId: [this.data.parentWord.wordLangueTypeId],
            baseWordLangueTypeId: [item.wordLangueTypeId],
            targetWordLangueTypeId: [item.targetWordLangueTypeId ?? null],
            meaningIndex: [item.index]
        });
    }

    typeLabel(typeId?: number | null): string {
        const key = `word.type.${typeId}`;
        const translated = this.translate.instant(key);
        if (translated && translated !== key) {
            return translated;
        }
        const types = this.dataStore.types();
        const match = Array.isArray(types) ? types.find(t => t.id === typeId) : undefined;
        return match?.name ?? `Type ${typeId}`;
    }

    private translationTypeId(form: FormGroup): number | null {
        const value = form.get('typeId')?.value;
        if (typeof value === 'number') {
            return value;
        }
        if (value != null) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
    }

    genderLabel(form: FormGroup): string {
        const genderId = this.extractNumber(form.get('genderId')?.value);
        if (!genderId) {
            return '';
        }
        const genders = this.activeLang?.genders ?? this.data.langue.genders;
        const match = genders?.find(g => g.id === genderId);
        const key = `gender.${genderId}`;
        const translatedById = this.translate.instant(key);
        if (translatedById && translatedById !== key) {
            return translatedById;
        }
        const raw = match?.name ?? '';
        if (!raw) {
            return '';
        }
        const normalizedKey = `gender.${raw
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase()}`;
        const translated = this.translate.instant(normalizedKey);
        return translated && translated !== normalizedKey ? translated : raw;
    }

    trackFormGroup = (_: number, form: FormGroup) => form;

    private extractNumber(value: unknown): number | null {
        if (typeof value === 'number') {
            return value;
        }
        if (value != null) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
    }

    private meaningIndexFromMap(meaningId: number): number | null {
        const match = this.translationModalStore.meanings().find(m => m.wordLangueTypeId === meaningId);
        return match?.index ?? null;
    }

    private isPlaceholderTranslation(item: WordMeaningTranslation): boolean {
        const name = (item?.name ?? '').trim();
        const plural = (item?.plural ?? '').trim();
        const targetId = this.extractNumber(item?.targetWordLangueTypeId);
        return !targetId && !item?.genderId && !name && !plural;
    }

    formIndex(form: FormGroup): number {
        return this.translationForms.indexOf(form);
    }

    trackMeaningGroup = (_: number, group: { meaningId: number }) => group.meaningId;

    private formsForMeaning(meaningId: number): FormGroup[] {
        return this.formsByMeaningId.get(meaningId) ?? [];
    }

    private lastIndexForMeaning(meaningId: number): number {
        let lastIndex = -1;
        this.translationForms.forEach((form, idx) => {
            const id = this.extractNumber(form.get('baseWordLangueTypeId')?.value);
            if (id === meaningId) {
                lastIndex = idx;
            }
        });
        return lastIndex;
    }

    private focusInput(form: FormGroup, selectAll = true): void {
        // Delay to let Angular render the input before focusing it
        setTimeout(() => {
            const idx = this.formIndex(form);
            const target = this.translationInputs?.find(
                ref => Number(ref.nativeElement.dataset['formIdx']) === idx
            );
            target?.nativeElement.focus();
            if (selectAll) {
                target?.nativeElement.select();
            }
        }, 0);
    }

    /**
     * Fallback to recover translation id when the form lost it (e.g. after refresh).
     */
    private lookupWordTypeId(form: FormGroup): number | null {
        const meaningId = this.extractNumber(form.get('baseWordLangueTypeId')?.value);
        const langId = this.extractNumber(form.get('langueId')?.value);
        const typeId = this.extractNumber(form.get('typeId')?.value);
        const name = (form.get('name')?.value ?? '').toString().trim().toLowerCase();
        if (!meaningId || !langId || !typeId || !name) {
            return null;
        }
        const match = this.translationModalStore
            .meaningTranslations()
            .find(
                t =>
                    t.wordLangueTypeId === meaningId &&
                    t.langueId === langId &&
                    t.typeId === typeId &&
                    (t.name ?? '').trim().toLowerCase() === name &&
                    t.targetWordLangueTypeId
            );
        return match?.targetWordLangueTypeId ?? null;
    }

    /**
     * Check whether the translation exists in the store (persisted server-side).
     */
    private hasPersistedEntry(form: FormGroup, resolvedWordTypeId?: number | null): boolean {
        const meaningId = this.extractNumber(form.get('baseWordLangueTypeId')?.value);
        const langId = this.extractNumber(form.get('langueId')?.value);
        const typeId = this.extractNumber(form.get('typeId')?.value);
        const name = (form.get('name')?.value ?? '').toString().trim().toLowerCase();
        const fallbackWordTypeId = resolvedWordTypeId ?? this.extractNumber(form.get('wordLangueTypeId')?.value);
        return this.translationModalStore
            .meaningTranslations()
            .some(t => {
                const sameMeaning = meaningId ? t.wordLangueTypeId === meaningId : false;
                const sameLang = langId ? t.langueId === langId : false;
                const sameType = typeId ? t.typeId === typeId : false;
                const sameName = (t.name ?? '').trim().toLowerCase() === name;
                const sameTarget = fallbackWordTypeId ? t.targetWordLangueTypeId === fallbackWordTypeId : false;
                return sameName && (sameTarget || (sameMeaning && sameLang && sameType));
            });
    }

    private resolveSourceMeaningId(form: FormGroup): number | null {
        const fromForm = this.extractNumber(form.get('baseWordLangueTypeId')?.value);
        if (fromForm) {
            return fromForm;
        }
        const wordLangueTypeId = this.extractNumber(form.get('wordLangueTypeId')?.value);
        if (!wordLangueTypeId) {
            return null;
        }
        const match = this.translationModalStore.meaningTranslations().find(t => t.wordLangueTypeId === wordLangueTypeId);
        return match?.wordLangueTypeId ?? null;
    }

    private resolveTargetMeaningId(form: FormGroup, resolvedWordTypeId?: number | null): number | null {
        const direct = this.extractNumber(form.get('targetWordLangueTypeId')?.value);
        if (direct) {
            return direct;
        }
        const translations = this.translationModalStore.meaningTranslations();
        if (resolvedWordTypeId) {
            const byId = translations.find(t => t.wordLangueTypeId === resolvedWordTypeId);
            if (byId?.targetWordLangueTypeId) {
                return byId.targetWordLangueTypeId;
            }
        }
        const langId = this.extractNumber(form.get('langueId')?.value);
        const typeId = this.extractNumber(form.get('typeId')?.value);
        const name = (form.get('name')?.value ?? '').toString().trim().toLowerCase();
        const byFields = translations.find(
            t =>
                t.langueId === langId &&
                t.typeId === typeId &&
                (t.name ?? '').trim().toLowerCase() === name &&
                t.targetWordLangueTypeId
        );
        return byFields?.targetWordLangueTypeId ?? null;
    }

    // meaning resolution no longer required for deletion (handled server-side by wordType ids)

    private removeForm(form: FormGroup, meaningId?: number): void {
        const idx = this.translationForms.indexOf(form);
        if (idx >= 0) {
            this.translationForms.splice(idx, 1);
        }
        if (meaningId != null) {
            const filtered = this.formsForMeaning(meaningId).filter(f => f !== form);
            if (filtered.length) {
                this.formsByMeaningId.set(meaningId, filtered);
            } else {
                this.formsByMeaningId.delete(meaningId);
            }
        }
    }

    private shouldRequireGender(langue: Langue, typeId?: number | null): boolean {
        const iso = langue.iso?.trim().toUpperCase();
        const isGenderedLanguage = iso === 'FR' || iso === 'DE';
        if (!isGenderedLanguage) {
            return false;
        }
        return typeId === 1;
    }

    private computeTitle(data: WordTranslationEditDialogData): string {
        return `${this.buildTargetWordLabel(data)} ->`;
    }

    private extractTranslationValues(word: Word, langueId: number): WordTranslationValue[] {
        const translations = word.translations;
        if (!translations) {
            return [];
        }
        if (Array.isArray(translations)) {
            for (const entry of translations) {
                if (Array.isArray(entry) && entry.length >= 2) {
                    const key = Number(entry[0]);
                    if (!Number.isNaN(key) && key === langueId) {
                        return this.normalizeTranslationBucket(entry[1]);
                    }
                }
            }
            return [];
        }
        const byNumber = translations as Record<number, WordTranslationValue[]>;
        if (byNumber[langueId] !== undefined) {
            return this.normalizeTranslationBucket(byNumber[langueId]);
        }
        const byString = translations as Record<string, WordTranslationValue[]>;
        return this.normalizeTranslationBucket(byString[String(langueId)]);
    }

    private normalizeTranslationBucket(bucket: unknown): WordTranslationValue[] {
        if (bucket == null) {
            return [];
        }
        if (Array.isArray(bucket)) {
            return bucket
                .map(value => this.normalizeTranslationValue(value))
                .filter((value): value is WordTranslationValue => !!value);
        }
        const single = this.normalizeTranslationValue(bucket);
        return single ? [single] : [];
    }

    private normalizeTranslationValue(value: unknown): WordTranslationValue | undefined {
        if (value == null) {
            return undefined;
        }
        if (typeof value === 'object' && !Array.isArray(value)) {
            const maybe = value as Partial<WordTranslationValue>;
            return {
                name: typeof maybe.name === 'string' ? maybe.name : '',
                genderId: typeof maybe.genderId === 'number' ? maybe.genderId : null,
                wordLangueTypeId: typeof maybe.wordLangueTypeId === 'number' ? maybe.wordLangueTypeId : null,
                langueId: typeof maybe.langueId === 'number' ? maybe.langueId : null,
                typeId: typeof maybe.typeId === 'number' ? maybe.typeId : null,
                plural: typeof maybe.plural === 'string' ? maybe.plural : ''
            };
        }
        return {
            name: String(value),
            genderId: null,
            wordLangueTypeId: null,
            langueId: null,
            typeId: null,
            plural: ''
        };
    }

    private buildTargetWordLabel(data: WordTranslationEditDialogData): string {
        const sourceIso = data.sourceLangueIso ?? this.data.langue.iso;
        const base = this.formatLocalizedWord(data.parentWord, sourceIso);
        const targetLang = this.computeLangLabel(data.langue);
        return targetLang ? `${base} -> ${targetLang}` : base;
    }

    private formatLocalizedWord(word: Word, iso?: string | null): string {
        const value = word.name || '';
        const cleaned = this.cleanGenderCode(value.trim());
        const article = this.computeArticle(iso, word.gender?.id);
        const withArticle = article ? `${article} ${cleaned}`.trim() : cleaned;
        if (iso?.trim().toUpperCase() === 'DE' && word.type?.id === 1) {
            return this.capitalizeLastWord(withArticle);
        }
        return withArticle;
    }

    private computeLangLabel(langue: Langue): string | undefined {
        const iso = langue?.iso?.trim().toLowerCase();
        if (iso) {
            const langKey = `lang.${iso}`;
            const translated = this.translate.instant(langKey);
            if (translated && translated !== langKey) {
                return translated;
            }
        }
        return langue?.name;
    }

    private cleanGenderCode(value: string): string {
        return value
            .replace(/\s*\(\d+\)/g, '')
            .replace(/\s*\([^)]+\)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private capitalizeLastWord(value: string): string {
        if (!value) return '';
        const parts = value.split(' ');
        const lastIndex = parts.length - 1;
        const word = parts[lastIndex];
        if (!word) return value;
        parts[lastIndex] = word.substring(0, 1).toUpperCase() + word.substring(1);
        return parts.join(' ');
    }

    private computeArticle(iso?: string | null, genderId?: number | null): string | null {
        if (!iso || !genderId) {
            return null;
        }
        const normalizedIso = iso.trim().toUpperCase();
        if (normalizedIso === 'FR') {
            switch (genderId) {
                case 1:
                    return 'le';
                case 2:
                    return 'la';
                case 3:
                    return 'les';
                default:
                    return null;
            }
        }
        if (normalizedIso === 'DE') {
            switch (genderId) {
                case 1:
                    return 'der';
                case 2:
                    return 'die';
                case 3:
                    return 'das';
                default:
                    return null;
            }
        }
        return null;
    }
}
