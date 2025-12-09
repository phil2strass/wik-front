import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Configuration } from '@shared/config/configuration';
import { Categorie } from '../models/categorie.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CategorieService {
    #http = inject(HttpClient);
    #baseUrl = inject(Configuration).baseUrl;

    list(): Observable<Categorie[]> {
        return this.#http.get<Categorie[]>(`${this.#baseUrl}categories`);
    }

    create(name: string): Observable<Categorie> {
        return this.#http.post<Categorie>(`${this.#baseUrl}categories`, { name });
    }

    update(id: number, name: string): Observable<Categorie> {
        return this.#http.put<Categorie>(`${this.#baseUrl}categories/${id}`, { name });
    }

    delete(id: number): Observable<void> {
        return this.#http.delete<void>(`${this.#baseUrl}categories/${id}`);
    }
}
