import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SecurityStore } from '@shared/security/security-store';

@Component({
    selector: 'app-profil-sidebar',
    template: `
        <mat-accordion multi>
            <!-- Section 1 -->
            <mat-expansion-panel>
                <mat-expansion-panel-header>
                    <mat-panel-title>Section 1</mat-panel-title>
                </mat-expansion-panel-header>

                @if (securityStore.isAdmin()) {
                    <nav class="submenu">
                        <a mat-button routerLink="/word/new" routerLinkActive="active-link">{{ 'word.create' | translate }}</a>
                        <a mat-button routerLink="/word/list" routerLinkActive="active-link">Les mots</a>
                    </nav>
                }
            </mat-expansion-panel>

            <!-- Section 2 -->
            <mat-expansion-panel>
                <mat-expansion-panel-header>
                    <mat-panel-title>Section 2</mat-panel-title>
                </mat-expansion-panel-header>

                <nav class="submenu">
                    <a mat-button routerLink="/settings/profile">Profil</a>
                    <a mat-button routerLink="/settings/account">Compte</a>
                </nav>
            </mat-expansion-panel>
        </mat-accordion>
    `,
    imports: [
        ReactiveFormsModule,
        MatAccordion,
        MatExpansionPanel,
        MatExpansionPanelHeader,
        MatExpansionPanelTitle,
        MatButtonModule,
        RouterLink,
        RouterLinkActive,
        TranslateModule
    ]
})
export class ProfilSidebarComponent {
    readonly securityStore = inject(SecurityStore);
}
