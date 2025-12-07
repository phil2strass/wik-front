import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Configuration } from '@shared/config/configuration';
import { Observable } from 'rxjs';
import { WordExample } from '../models/example.model';

@Injectable({ providedIn: 'root' })
export class ExampleService {
    #http = inject(HttpClient);
    #baseUrl = inject(Configuration).baseUrl;

    getExamples(wordTypeId: number): Observable<WordExample[]> {
        return this.#http.get<WordExample[]>(`${this.#baseUrl}word/${wordTypeId}/examples`);
    }

    createExample(wordTypeId: number, content: string): Observable<WordExample> {
        return this.#http.post<WordExample>(`${this.#baseUrl}word/${wordTypeId}/examples`, { content });
    }

    updateExample(exampleId: number, content: string): Observable<WordExample> {
        return this.#http.put<WordExample>(`${this.#baseUrl}examples/${exampleId}`, { content });
    }
}
