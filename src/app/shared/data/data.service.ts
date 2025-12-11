import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Langue } from './models/langue.model';
import { Type } from './models/type.model';
import { Configuration } from '@shared/config/configuration';

@Injectable({
    providedIn: 'root'
})
export class DataService {
    private languages$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
    private types$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);

    constructor(private http: HttpClient, private config: Configuration) {}

    getLanguages(): Observable<Langue[]> {
        return this.http
            .get<Langue[]>(`${this.config.baseUrl}public/langues`)
            .pipe(tap(languages => this.languages$.next(languages)));
    }

    getTypes(): Observable<Type[]> {
        return this.http
            .get<Type[]>(`${this.config.baseUrl}public/types`)
            .pipe(tap(types => this.types$.next(types)));
    }
}
