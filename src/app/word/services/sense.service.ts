import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Configuration } from '@shared/config/configuration';
import { Observable } from 'rxjs';
import { WordSense, WordSenseExample, WordSenseExampleTranslation, WordSenseTranslation, WordSenseWordTranslation } from '../models/sense.model';

@Injectable({ providedIn: 'root' })
export class SenseService {
    #http = inject(HttpClient);
    #baseUrl = inject(Configuration).baseUrl;

    getSenses(wordLangueTypeId: number): Observable<WordSense[]> {
        return this.#http.get<WordSense[]>(`${this.#baseUrl}word/${wordLangueTypeId}/sens`);
    }

    createSense(wordLangueTypeId: number, content: string, pos?: number): Observable<WordSense> {
        return this.#http.post<WordSense>(`${this.#baseUrl}word/${wordLangueTypeId}/sens`, { content, pos });
    }

    updateSense(sensId: number, content: string, pos?: number): Observable<WordSense> {
        return this.#http.put<WordSense>(`${this.#baseUrl}sens/${sensId}`, { content, pos });
    }

    deleteSense(sensId: number): Observable<void> {
        return this.#http.delete<void>(`${this.#baseUrl}sens/${sensId}`);
    }

    getSenseExamples(sensId: number): Observable<WordSenseExample[]> {
        return this.#http.get<WordSenseExample[]>(`${this.#baseUrl}sens/${sensId}/examples`);
    }

    getSenseTranslations(sensId: number): Observable<WordSenseTranslation[]> {
        return this.#http.get<WordSenseTranslation[]>(`${this.#baseUrl}sens/${sensId}/translations`);
    }

    getSenseWordTranslations(sensId: number, langueId: number): Observable<WordSenseWordTranslation[]> {
        return this.#http.get<WordSenseWordTranslation[]>(`${this.#baseUrl}sens/${sensId}/word-translations/${langueId}`);
    }

    saveSenseTranslations(sensId: number, translations: WordSenseTranslation[]): Observable<WordSenseTranslation[]> {
        return this.#http.put<WordSenseTranslation[]>(`${this.#baseUrl}sens/${sensId}/translations`, translations);
    }

    getSenseExampleTranslations(exampleId: number): Observable<WordSenseExampleTranslation[]> {
        return this.#http.get<WordSenseExampleTranslation[]>(`${this.#baseUrl}sens/examples/${exampleId}/translations`);
    }

    saveSenseExampleTranslations(
        exampleId: number,
        translations: WordSenseExampleTranslation[]
    ): Observable<WordSenseExampleTranslation[]> {
        return this.#http.put<WordSenseExampleTranslation[]>(
            `${this.#baseUrl}sens/examples/${exampleId}/translations`,
            translations
        );
    }

    createSenseExample(sensId: number, content: string, pos?: number): Observable<WordSenseExample> {
        return this.#http.post<WordSenseExample>(`${this.#baseUrl}sens/${sensId}/examples`, { content, pos });
    }

    updateSenseExample(exampleId: number, content: string, pos?: number): Observable<WordSenseExample> {
        return this.#http.put<WordSenseExample>(`${this.#baseUrl}sens/examples/${exampleId}`, { content, pos });
    }

    deleteSenseExample(exampleId: number): Observable<void> {
        return this.#http.delete<void>(`${this.#baseUrl}sens/examples/${exampleId}`);
    }
}
