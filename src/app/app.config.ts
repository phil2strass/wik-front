import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom, LOCALE_ID, ErrorHandler, APP_INITIALIZER } from '@angular/core';
import { HttpClient, provideHttpClient, withFetch, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { routes } from './app.routes';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideClientHydration } from '@angular/platform-browser';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { ToastrModule } from 'ngx-toastr';
import { provideToastr } from 'ngx-toastr';

// icons
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';

// perfect scrollbar
import { NgScrollbarModule } from 'ngx-scrollbar';
import { NgxPermissionsModule } from 'ngx-permissions';
//Import all material modules
import { MaterialModule } from './material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { catchError, forkJoin, map, of } from 'rxjs';

// code view
import { provideHighlightOptions } from 'ngx-highlightjs';
import 'highlight.js/styles/atom-one-dark.min.css';

import { securityInterceptor } from '@shared/security/security-interceptor';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { ErrorHandlerService } from '@shared/alerts/error-handler.service';
import { fr } from 'date-fns/locale';
import { Configuration } from '@shared/config/configuration';
import { environment } from '@root/environments/environment';
import { KeycloakService } from '@shared/security/internal/keycloak-service';
import { SecurityStore } from '@shared/security/security-store';

type TranslationMap = Record<string, unknown>;

class DomainTranslateLoader implements TranslateLoader {
    constructor(private readonly http: HttpClient) {}

    getTranslation(lang: string) {
        const common$ = this.http.get<TranslationMap>(`./assets/i18n/${lang}.json`);
        const wordDomain$ = this.http
            .get<TranslationMap>(`./assets/i18n/word/${lang}.json`)
            .pipe(catchError(() => of({} as TranslationMap)));

        return forkJoin([common$, wordDomain$]).pipe(map(([common, word]) => ({ ...common, ...word })));
    }
}

export function HttpLoaderFactory(http: HttpClient): TranslateLoader {
    return new DomainTranslateLoader(http);
}

export function appInitFactory(security: { loaded: () => boolean }) {
    return () =>
        new Promise<void>(resolve => {
            // Wait until the security store finishes Keycloak init
            const start = Date.now();
            const interval = setInterval(() => {
                if (security.loaded()) {
                    clearInterval(interval);
                    resolve();
                } else if (Date.now() - start > 10000) {
                    // Safety timeout: do not block bootstrap forever
                    clearInterval(interval);
                    resolve();
                }
            }, 20);
        });
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideAnimationsAsync(), // required animations providers
        provideToastr(), // Toastr providers
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideHighlightOptions({
            coreLibraryLoader: () => import('highlight.js/lib/core'),
            lineNumbersLoader: () => import('ngx-highlightjs/line-numbers'), // Optional, add line numbers if needed
            languages: {
                typescript: () => import('highlight.js/lib/languages/typescript'),
                css: () => import('highlight.js/lib/languages/css'),
                xml: () => import('highlight.js/lib/languages/xml')
            }
        }),
        provideRouter(
            routes,
            withInMemoryScrolling({
                scrollPositionRestoration: 'enabled',
                anchorScrolling: 'enabled'
            }),
            withComponentInputBinding()
        ),
        provideHttpClient(withFetch(), withInterceptors([securityInterceptor])),
        importProvidersFrom(
            FormsModule,
            ToastrModule.forRoot(),
            ReactiveFormsModule,
            MaterialModule,
            NgxPermissionsModule.forRoot(),
            TablerIconsModule.pick(TablerIcons),
            NgScrollbarModule,
            CalendarModule.forRoot({
                provide: DateAdapter,
                useFactory: adapterFactory
            }),
            TranslateModule.forRoot({
                loader: {
                    provide: TranslateLoader,
                    useFactory: HttpLoaderFactory,
                    deps: [HttpClient]
                }
            })
        ),
        {
            provide: MAT_DATE_LOCALE,
            useValue: fr
        },
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        { provide: ErrorHandler, useClass: ErrorHandlerService },
        {
            provide: Configuration,
            useValue: new Configuration(environment.apiUrl)
        },
        {
            provide: APP_INITIALIZER,
            useFactory: appInitFactory,
            deps: [SecurityStore],
            multi: true
        }
    ]
};
