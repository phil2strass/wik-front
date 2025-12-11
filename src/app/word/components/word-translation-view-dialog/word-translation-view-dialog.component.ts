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
    imports: [CommonModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatButtonModule, MatListModule, MatIconModule, WordFormComponent, TranslateModule]
})
export class WordTranslationEditDialogComponent {
    title: string;
    targetWordLabel = '';
    translationForms: FormGroup[] = [];
    selectedIndex = 0;
    loading = false;
    requiresGenderField: boolean;
    languages: Langue[] = [];
    activeLang: Langue;
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
    }

    get selectedForm(): FormGroup | null {
        if (!this.translationForms.length) {
            return null;
        }
        return this.translationForms[this.selectedIndex] ?? null;
    }

    addTranslation(): void {
        const form = this.createTranslationForm(undefined, this.activeLang, this.data);
        this.translationForms.push(form);
        this.selectedIndex = this.translationForms.length - 1;
    }

    selectTranslation(index: number): void {
        if (index >= 0 && index < this.translationForms.length) {
            this.selectedIndex = index;
        }
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
        const wordTypeId = form.get('wordTypeId')?.value;
        if (wordTypeId) {
            this.pendingDeleteWordTypeIds.push(wordTypeId);
        }
        this.translationForms.splice(index, 1);
        if (this.translationForms.length === 0) {
        this.translationForms.push(this.createTranslationForm(undefined, this.activeLang, this.data));
        }
        if (this.selectedIndex >= this.translationForms.length) {
            this.selectedIndex = this.translationForms.length - 1;
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    save(): void {
        if (!this.translationForms.length) {
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
        this.pendingDeleteWordTypeIds = [];
        this.requiresGenderField = this.shouldRequireGender(this.activeLang, this.data.typeId);
        this.loading = true;
        const url = `${this.configuration.baseUrl}word/${this.data.parentWord.wordTypeId}/translations/${lang.id}`;
        this.http.get<WordTranslationValue[]>(url).subscribe({
            next: translations => {
                this.translationForms = this.buildFormsForLang(this.activeLang, translations);
                this.selectedIndex = 0;
            },
            error: () => {
                this.translationForms = this.buildFormsForLang(this.activeLang);
                this.selectedIndex = 0;
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
        const list = translations.length ? translations : [undefined];
        return list.map(tr => this.createTranslationForm(tr, lang, this.data));
    }

    private createTranslationForm(
        translation: WordTranslationValue | undefined,
        lang: Langue,
        data: WordTranslationEditDialogData
    ): FormGroup {
        return this.fb.group({
            wordTypeId: [translation?.wordTypeId ?? null],
            name: [translation?.name ?? '', Validators.required],
            plural: [translation?.plural ?? ''],
            langueId: [translation?.langueId ?? lang.id, Validators.required],
            typeId: [translation?.typeId ?? data.typeId ?? null, Validators.required],
            genderId: [translation?.genderId ?? null],
            baseWordTypeId: [data.parentWord.wordTypeId]
        });
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
