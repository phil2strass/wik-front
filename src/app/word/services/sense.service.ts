import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Configuration } from '@shared/config/configuration';
import { Observable } from 'rxjs';
import { WordSense, WordSenseExample } from '../models/sense.model';

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
