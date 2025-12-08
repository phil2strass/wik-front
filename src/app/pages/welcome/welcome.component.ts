import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatCardModule } from '@angular/material/card';

@Component({
    selector: 'app-welcome',
    standalone: true,
    imports: [CommonModule, TranslateModule, MatCardModule],
    template: `
        <section class="welcome">
            <mat-card>
                <mat-card-content class="message">
                    {{ 'welcome.message' | translate }}
                </mat-card-content>
            </mat-card>
        </section>
    `,
    styles: [
        `
            .welcome {
                min-height: 60vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 24px;
            }
            .message {
                font-size: 1.4rem;
                text-align: center;
                line-height: 1.5;
            }
        `
    ]
})
export class WelcomeComponent {}
