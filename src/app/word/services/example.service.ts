import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Configuration } from '@shared/config/configuration';
import { Observable } from 'rxjs';
import { WordExample, WordExampleTranslation } from '../models/example.model';

@Injectable({ providedIn: 'root' })
export class ExampleService {
    #http = inject(HttpClient);
    #baseUrl = inject(Configuration).baseUrl;

    getExamples(wordLangueTypeId: number): Observable<WordExample[]> {
        return this.#http.get<WordExample[]>(`${this.#baseUrl}word/${wordLangueTypeId}/examples`);
    }

    createExample(wordLangueTypeId: number, content: string): Observable<WordExample> {
        return this.#http.post<WordExample>(`${this.#baseUrl}word/${wordLangueTypeId}/examples`, { content });
    }

    updateExample(exampleId: number, content: string): Observable<WordExample> {
        return this.#http.put<WordExample>(`${this.#baseUrl}examples/${exampleId}`, { content });
    }

    deleteExample(exampleId: number): Observable<void> {
        return this.#http.delete<void>(`${this.#baseUrl}examples/${exampleId}`);
    }

    getExampleTranslations(wordLangueTypeId: number, langueId: number): Observable<WordExampleTranslation[]> {
        return this.#http.get<WordExampleTranslation[]>(
            `${this.#baseUrl}word/${wordLangueTypeId}/examples/translations/${langueId}`
        );
    }

    saveExampleTranslation(exampleId: number, langueId: number, content: string): Observable<WordExampleTranslation> {
        return this.#http.put<WordExampleTranslation>(
            `${this.#baseUrl}examples/${exampleId}/translations/${langueId}`,
            { content }
        );
    }

    saveExampleTranslations(
        wordLangueTypeId: number,
        langueId: number,
        translations: Partial<WordExampleTranslation>[]
    ): Observable<WordExampleTranslation[]> {
        return this.#http.put<WordExampleTranslation[]>(
            `${this.#baseUrl}word/${wordLangueTypeId}/examples/translations/${langueId}`,
            translations
        );
    }

    deleteExampleTranslation(exampleId: number, langueId: number): Observable<void> {
        return this.#http.delete<void>(`${this.#baseUrl}examples/${exampleId}/translations/${langueId}`);
    }
}
