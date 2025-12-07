import { Component, Inject, effect, inject } from '@angular/core';
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
import { SecurityStore } from '@shared/security/security-store';
import { DataStore } from '@shared/data/data-store';

type WordTranslationEditDialogData = {
    parentWord: Word;
    langue: Langue;
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
    imports: [CommonModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatButtonModule, MatListModule, WordFormComponent, TranslateModule]
})
export class WordTranslationEditDialogComponent {
    title: string;
    commentPlaceholder = 'word.comment.label';
    commentPlaceholderParams: Record<string, unknown> = {};
    targetWordLabel = '';
    translationForms: FormGroup[] = [];
    selectedIndex = 0;
    loading = false;
    requiresGenderField: boolean;
    private pendingDeleteWordTypeIds: number[] = [];
    readonly #securityStore = inject(SecurityStore);
    readonly #dataStore = inject(DataStore);

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: WordTranslationEditDialogData,
        private dialogRef: MatDialogRef<WordTranslationEditDialogComponent>,
        private fb: FormBuilder,
        private http: HttpClient,
        private configuration: Configuration,
        private messageService: MessageService,
        private translate: TranslateService
    ) {
        this.title = this.computeTitle(data);
        this.targetWordLabel = this.buildTargetWordLabel(data);
        const baseTypeId = data.typeId;
        this.requiresGenderField = this.shouldRequireGender(data.langue, baseTypeId);
        const translations = Array.isArray(data.translations) && data.translations.length ? data.translations : [undefined];
        this.translationForms = translations.map(translation => this.createTranslationForm(translation));

        effect(() => {
            const selectedId = this.#securityStore.langueSelected();
            const langues = this.#dataStore.langues();
            this.updateCommentPlaceholder(selectedId, langues);
        });
    }

    get selectedForm(): FormGroup | null {
        if (!this.translationForms.length) {
            return null;
        }
        return this.translationForms[this.selectedIndex] ?? null;
    }

    addTranslation(): void {
        const form = this.createTranslationForm(undefined);
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
            this.translationForms.push(this.createTranslationForm(undefined));
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

    private createTranslationForm(translation?: WordTranslationValue): FormGroup {
        const defaultComment = this.computeDefaultComment(translation, this.data);
        return this.fb.group({
            wordTypeId: [translation?.wordTypeId ?? null],
            name: [translation?.name ?? '', Validators.required],
            plural: [translation?.plural ?? ''],
            langueId: [translation?.langueId ?? this.data.langue.id, Validators.required],
            typeId: [translation?.typeId ?? this.data.typeId ?? null, Validators.required],
            genderId: [translation?.genderId ?? null],
            commentaire: [translation?.commentaire ?? defaultComment],
            baseWordTypeId: [this.data.parentWord.wordTypeId]
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
        if (data.sourceLangueName) {
            return `${data.sourceLangueName} -> ${data.langue.name}`;
        }
        return `Traductions ${data.langue.name}`;
    }

    private computeDefaultComment(translation: WordTranslationValue | undefined, data: WordTranslationEditDialogData): string {
        if (translation?.commentaire) {
            return translation.commentaire;
        }
        const sourceIso = data.sourceLangueIso?.trim().toUpperCase();
        const targetIso = data.langue.iso?.trim().toUpperCase();
        if (sourceIso === 'FR' && targetIso === 'EN') {
            return 'commentaire en français';
        }
        return '';
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

    private updateCommentPlaceholder(selectedId: number | undefined, langues: Langue[]) {
        const selectedLang = langues.find(lang => lang.id === selectedId);
        const langLabel = selectedLang ? this.computeLangLabel(selectedLang) : undefined;
        this.commentPlaceholder = 'word.comment.label';
        this.commentPlaceholderParams = langLabel ? { lang: langLabel } : {};
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
