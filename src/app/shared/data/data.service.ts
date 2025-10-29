import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Langue } from './models/langue.model';
import { Type } from './models/type.model';

@Injectable({
    providedIn: 'root'
})
export class DataService {
    private languages$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
    private types$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);

    constructor(private http: HttpClient) {}

    getLanguages(): Observable<Langue[]> {
        return this.http.get<Langue[]>('/assets/data/languages.json').pipe(tap(languages => this.languages$.next(languages)));
    }

    getTypes(): Observable<Type[]> {
        return this.http.get<Type[]>('/assets/data/types.json').pipe(tap(types => this.types$.next(types)));
    }
}
