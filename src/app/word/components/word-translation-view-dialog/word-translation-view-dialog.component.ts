import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { HttpClient } from '@angular/common/http';
import { Configuration } from '../../../shared/config/configuration';
import { MessageService } from '@shared/ui-messaging/message/message.service';
import { Word, WordTranslationValue } from '../../models/word.model';
import { Langue } from '@shared/data/models/langue.model';
import { WordFormComponent } from '../word-form/word-form.component';
import { forkJoin, Observable } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatRippleModule } from '@angular/material/core';
import { DataStore } from '@shared/data/data-store';
import { inject } from '@angular/core';

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
    imports: [
        CommonModule,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatButtonModule,
        MatListModule,
        MatIconModule,
        MatChipsModule,
        MatRippleModule,
        WordFormComponent,
        TranslateModule
    ]
})
export class WordTranslationEditDialogComponent {
    title: string;
    targetWordLabel = '';
    translationForms: FormGroup[] = [];
    selectedIndex = 0;
    editingForm: FormGroup | null = null;
    loading = false;
    requiresGenderField: boolean;
    languages: Langue[] = [];
    activeLang: Langue;
    activeTypeId: number | null = null;
    private pendingDeleteWordTypeIds: number[] = [];
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: WordTranslationEditDialogData,
        private dialogRef: MatDialogRef<WordTranslationEditDialogComponent>,
        private fb: FormBuilder,
        private http: HttpClient,
        private configuration: Configuration,
        private messageService: MessageService,
        private translate: TranslateService
    ) {
        this.languages = data.languages ?? [data.langue];
        this.activeLang = data.langue;
        this.targetWordLabel = this.formatLocalizedWord(
            data.parentWord,
            data.sourceLangueIso ?? data.langue.iso
        );
        this.title = `${this.targetWordLabel} ->`;
        this.requiresGenderField = this.shouldRequireGender(this.activeLang, data.typeId);
        this.translationForms = this.buildFormsForLang(this.activeLang);
        this.activeTypeId = this.resolveInitialTypeId(data.typeId);
        if (this.activeTypeId == null && this.typeOptions.length > 0) {
            this.activeTypeId = this.typeOptions[0];
        }
        this.selectedIndex = this.translationForms.length ? 0 : -1;
    }

    private readonly dataStore = inject(DataStore);

    get typeOptions(): number[] {
        const ids = new Set<number>();
        if (this.data.typeId != null) {
            ids.add(this.data.typeId);
        }
        if (this.data.parentWord?.type?.id != null) {
            ids.add(this.data.parentWord.type.id);
        }
        this.resolveTypeIdsFromBaseTypes().forEach(id => ids.add(id));
        this.translationForms.forEach(form => {
            const id = this.translationTypeId(form);
            if (typeof id === 'number') {
                ids.add(id);
            }
        });
        return Array.from(ids.values());
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

    addTranslation(): void {
        const targetTypeId = this.activeTypeId ?? this.typeOptions[0] ?? null;
        if (targetTypeId == null) {
            return;
        }
        this.activeTypeId = targetTypeId;
        const form = this.createTranslationForm(undefined, this.activeLang, this.data, targetTypeId);
        this.translationForms.push(form);
        this.selectedIndex = this.translationForms.length - 1;
        this.editingForm = form;
    }

    selectTranslation(index: number): void {
        if (index >= 0 && index < this.translationForms.length) {
            this.selectedIndex = index;
        }
    }

    selectTranslationByForm(form: FormGroup): void {
        const idx = this.translationForms.indexOf(form);
        if (idx >= 0) {
            this.selectedIndex = idx;
        }
    }

    startEditing(form: FormGroup, event?: Event): void {
        event?.stopPropagation();
        this.editingForm = form;
        this.selectTranslationByForm(form);
    }

    deleteTranslation(index: number, event: Event): void {
        event.stopPropagation();
        if (this.loading) {
            return;
        }
        const form = this.translationForms[index];
        if (!form) {
            return;
        }
        if (this.editingForm === form) {
            this.editingForm = null;
        }
        const wordTypeId = form.get('wordTypeId')?.value;
        if (wordTypeId) {
            this.pendingDeleteWordTypeIds.push(wordTypeId);
        }
        this.translationForms.splice(index, 1);
        if (this.selectedIndex >= this.translationForms.length) {
            this.selectedIndex = this.translationForms.length - 1;
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    save(): void {
        if (!this.translationForms.length && this.pendingDeleteWordTypeIds.length === 0) {
            this.dialogRef.close();
            return;
        }
        let hasInvalid = false;
        const actionableForms = this.translationForms.filter(form => {
            if (form.invalid) {
                hasInvalid = true;
                form.markAllAsTouched();
                return false;
            }
            const nameValue = form.get('name')?.value;
            return typeof nameValue === 'string' && nameValue.trim().length > 0;
        });
        if (hasInvalid) {
            return;
        }
        if (actionableForms.length === 0 && this.pendingDeleteWordTypeIds.length === 0) {
            this.dialogRef.close();
            return;
        }
        this.loading = true;
        const requests: Observable<unknown>[] = [];
        actionableForms.forEach(form => {
            const payload = form.getRawValue();
            const hasId = !!payload.wordTypeId;
            const request$ = hasId
                ? this.http.put(`${this.configuration.baseUrl}word`, payload)
                : this.http.post(`${this.configuration.baseUrl}word/${this.data.parentWord.wordTypeId}/translation`, payload);
            requests.push(request$);
        });
        this.pendingDeleteWordTypeIds.forEach(id => {
            requests.push(this.http.delete(`${this.configuration.baseUrl}word/${id}`));
        });
        this.pendingDeleteWordTypeIds = [];
        forkJoin(requests).subscribe({
            next: () => {
                this.messageService.info('Traductions enregistrées');
                this.dialogRef.close(true);
            },
            error: err => {
                this.messageService.error(err?.error ?? 'Erreur lors de la sauvegarde');
            },
            complete: () => {
                this.loading = false;
            }
        });
    }

    selectLanguage(lang: Langue): void {
        if (!lang || this.activeLang?.id === lang.id) {
            return;
        }
        this.activeLang = lang;
        this.editingForm = null;
        this.pendingDeleteWordTypeIds = [];
        this.requiresGenderField = this.shouldRequireGender(this.activeLang, this.data.typeId);
        this.loading = true;
        const url = `${this.configuration.baseUrl}word/${this.data.parentWord.wordTypeId}/translations/${lang.id}`;
        this.http.get<WordTranslationValue[]>(url).subscribe({
            next: translations => {
                this.translationForms = this.buildFormsForLang(this.activeLang, translations);
                this.activeTypeId = this.resolveInitialTypeId(this.data.typeId);
                if (this.activeTypeId == null && this.typeOptions.length > 0) {
                    this.activeTypeId = this.typeOptions[0];
                }
                this.selectedIndex = this.translationForms.length ? 0 : -1;
            },
            error: () => {
                this.translationForms = this.buildFormsForLang(this.activeLang);
                this.activeTypeId = this.resolveInitialTypeId(this.data.typeId);
                if (this.activeTypeId == null && this.typeOptions.length > 0) {
                    this.activeTypeId = this.typeOptions[0];
                }
                this.selectedIndex = this.translationForms.length ? 0 : -1;
            },
            complete: () => {
                this.loading = false;
            }
        });
    }

    private buildFormsForLang(lang: Langue, provided?: WordTranslationValue[]): FormGroup[] {
        const translations =
            Array.isArray(provided) && provided.length
                ? provided
                : this.extractTranslationValues(this.data.parentWord, lang.id);
        if (!translations.length) {
            return [];
        }
        return translations.map(tr => this.createTranslationForm(tr, lang, this.data, this.activeTypeId));
    }

    private createTranslationForm(
        translation: WordTranslationValue | undefined,
        lang: Langue,
        data: WordTranslationEditDialogData,
        forcedTypeId?: number | null
    ): FormGroup {
        return this.fb.group({
            wordTypeId: [translation?.wordTypeId ?? null],
            name: [translation?.name ?? '', Validators.required],
            plural: [translation?.plural ?? ''],
            langueId: [translation?.langueId ?? lang.id, Validators.required],
            typeId: [translation?.typeId ?? forcedTypeId ?? data.typeId ?? null, Validators.required],
            genderId: [translation?.genderId ?? null],
            baseWordTypeId: [data.parentWord.wordTypeId]
        });
    }

    selectType(typeId: number | null): void {
        if (typeId === this.activeTypeId) {
            return;
        }
        this.editingForm = null;
        this.activeTypeId = typeId;
        const match = this.translationForms.find(f => this.translationTypeId(f) === typeId);
        if (match) {
            this.selectTranslationByForm(match);
            return;
        }
        this.selectedIndex = -1;
    }

    typeLabel(typeId?: number | null): string {
        if (typeId == null) {
            return '';
        }
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

    private resolveInitialTypeId(fallback?: number | null): number | null {
        if (fallback != null) return fallback;
        const fromForms = this.translationForms.find(f => this.translationTypeId(f) != null);
        return fromForms ? this.translationTypeId(fromForms) : null;
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

    private resolveTypeIdsFromBaseTypes(): number[] {
        const baseTypes = this.baseTypes;
        if (!baseTypes.length) {
            return [];
        }
        const storeTypes = this.dataStore.types();
        if (!Array.isArray(storeTypes) || !storeTypes.length) {
            return [];
        }
        const normalizedMap = new Map<string, number>();
        storeTypes.forEach(type => {
            const norm = this.normalizeString(type.name);
            if (norm) {
                normalizedMap.set(norm, type.id);
            }
        });
        const ids: number[] = [];
        baseTypes.forEach(name => {
            const norm = this.normalizeString(name);
            const id = norm ? normalizedMap.get(norm) : undefined;
            if (typeof id === 'number') {
                ids.push(id);
            }
        });
        return ids;
    }

    private normalizeString(value?: string | null): string {
        return (value ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
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
                wordTypeId: typeof maybe.wordTypeId === 'number' ? maybe.wordTypeId : null,
                langueId: typeof maybe.langueId === 'number' ? maybe.langueId : null,
                typeId: typeof maybe.typeId === 'number' ? maybe.typeId : null,
                plural: typeof maybe.plural === 'string' ? maybe.plural : ''
            };
        }
        return {
            name: String(value),
            genderId: null,
            wordTypeId: null,
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
