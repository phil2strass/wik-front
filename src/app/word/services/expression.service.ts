import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Configuration } from '@shared/config/configuration';
import { Observable } from 'rxjs';
import { WordExpression, WordExpressionTranslation } from '../models/expression.model';

@Injectable({ providedIn: 'root' })
export class ExpressionService {
    #http = inject(HttpClient);
    #baseUrl = inject(Configuration).baseUrl;

    getExpressions(wordLangueTypeId: number): Observable<WordExpression[]> {
        return this.#http.get<WordExpression[]>(`${this.#baseUrl}word/${wordLangueTypeId}/expressions`);
    }

    createExpression(wordLangueTypeId: number, content: string): Observable<WordExpression> {
        return this.#http.post<WordExpression>(`${this.#baseUrl}word/${wordLangueTypeId}/expressions`, { content });
    }

    updateExpression(expressionId: number, content: string): Observable<WordExpression> {
        return this.#http.put<WordExpression>(`${this.#baseUrl}expressions/${expressionId}`, { content });
    }

    deleteExpression(expressionId: number): Observable<void> {
        return this.#http.delete<void>(`${this.#baseUrl}expressions/${expressionId}`);
    }

    getExpressionTranslations(wordLangueTypeId: number, langueId: number): Observable<WordExpressionTranslation[]> {
        return this.#http.get<WordExpressionTranslation[]>(
            `${this.#baseUrl}word/${wordLangueTypeId}/expressions/translations/${langueId}`
        );
    }

    saveExpressionTranslation(
        expressionId: number,
        langueId: number,
        content: string
    ): Observable<WordExpressionTranslation> {
        return this.#http.put<WordExpressionTranslation>(
            `${this.#baseUrl}expressions/${expressionId}/translations/${langueId}`,
            { content }
        );
    }

    saveExpressionTranslations(
        wordLangueTypeId: number,
        langueId: number,
        translations: Partial<WordExpressionTranslation>[]
    ): Observable<WordExpressionTranslation[]> {
        return this.#http.put<WordExpressionTranslation[]>(
            `${this.#baseUrl}word/${wordLangueTypeId}/expressions/translations/${langueId}`,
            translations
        );
    }

    deleteExpressionTranslation(expressionId: number, langueId: number): Observable<void> {
        return this.#http.delete<void>(`${this.#baseUrl}expressions/${expressionId}/translations/${langueId}`);
    }
}
