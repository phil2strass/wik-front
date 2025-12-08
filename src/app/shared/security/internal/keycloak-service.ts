import { inject, Injectable, NgZone } from '@angular/core';
import { environment } from '@root/environments/environment';
import Keycloak from 'keycloak-js';

export interface UserProfile {
    sub: string;
    email: string;
    given_name: string;
    family_name: string;
    token: string;
    roles: string[];
    groups: string[];
}

type TokenParsed = Keycloak.KeycloakTokenParsed & {
    realm_access?: { roles?: string[] };
    resource_access?: Record<string, { roles?: string[] }>;
    groups?: string[];
};

@Injectable({ providedIn: 'root' })
export class KeycloakService {
    #keycloak: Keycloak | undefined;
    #profile: UserProfile | undefined;
    readonly #zone = inject(NgZone);

    get keycloak() {
        if (!this.#keycloak) {
            this.#keycloak = new Keycloak({
                url: 'https://almadev.htpweb.fr/',
                realm: 'wik',
                clientId: 'myclient'
            });
        }
        return this.#keycloak;
    }

    get profile() {
        return this.#profile;
    }

    get roles(): string[] {
        return this.#profile?.roles ?? [];
    }

    get groups(): string[] {
        return this.#profile?.groups ?? [];
    }

    async init() {
        const useSilentSSO = environment.enableSilentSSO !== false;
        const authenticated = await this.#zone.runOutsideAngular(() =>
            this.keycloak.init({
                onLoad: useSilentSSO ? 'check-sso' : 'login-required',
                checkLoginIframe: false,
                // Avoid using URL hash for callback to prevent SPA/hash collisions
                responseMode: 'query',
                // Use Authorization Code + PKCE (recommended)
                flow: 'standard',
                pkceMethod: 'S256',
                ...(useSilentSSO
                    ? { silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html' }
                    : {})
            })
        );

        try {
            const hash = window.location.hash || '';
            const search = window.location.search || '';
            const hasOidcParams = /(?:code|state|session_state|iss)=/.test(hash) || /(?:code|state|session_state|iss)=/.test(search);
            if (hasOidcParams) {
                // Drop OIDC callback params from the URL to prevent re-parsing/loops
                const clean = window.location.pathname;
                window.history.replaceState({}, document.title, clean);
            }
        } catch {}

        if (!authenticated) {
            return false;
        }
        this.#profile = this.buildProfile(await this.keycloak.loadUserInfo());
        return true;
    }

    // Mise à jour du token (refresh automatique)
    async updateToken(minValidity = 30): Promise<void> {
        if (!this.keycloak) return;

        try {
            const refreshed = await this.keycloak.updateToken(minValidity);
            if (refreshed) {
                this.#profile = this.buildProfile(await this.keycloak.loadUserInfo());
            }
        } catch (err) {
            console.error('Failed to refresh token', err);
            await this.logout(); // si refresh échoue (ex: refresh token expiré)
        }
    }

    login() {
        return this.keycloak.login();
    }

    logout() {
        return this.keycloak.logout({ redirectUri: window.location.origin });
    }

    private buildProfile(userInfo: unknown): UserProfile {
        const tokenParsed = this.keycloak.tokenParsed as TokenParsed | undefined;
        const groups = this.extractGroups(tokenParsed);

        return {
            ...(userInfo as UserProfile),
            token: this.keycloak.token || '',
            roles: this.extractRoles(tokenParsed, groups),
            groups
        };
    }

    private extractGroups(tokenParsed: TokenParsed | undefined): string[] {
        if (!tokenParsed?.groups) {
            return [];
        }

        return tokenParsed.groups
            .map(group => (group.startsWith('/') ? group.substring(1) : group))
            .map(group => (group.includes('/') ? group.substring(group.lastIndexOf('/') + 1) : group))
            .map(group => group.trim().toLowerCase())
            .filter(group => group.length > 0);
    }

    private extractRoles(tokenParsed: TokenParsed | undefined, normalizedGroups: string[]): string[] {
        if (!tokenParsed) {
            return [];
        }

        const realmRoles = tokenParsed.realm_access?.roles ?? [];
        const clientRoles = Object.values(tokenParsed.resource_access ?? {}).flatMap(access => access.roles ?? []);
        const fromGroups = normalizedGroups.map(group => group.toUpperCase()); // groups as roles

        return Array.from(
            new Set(
                [...realmRoles, ...clientRoles, ...fromGroups]
                    .map(role => role.toUpperCase())
                    .filter(role => role.length > 0)
            )
        );
    }
}
