import { Component, inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WordFormComponent } from '@root/app/word/components/word-form.component';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-word-new',
    template: `
        <div>
            <app-word-form #wordFormRef [form]="form" mode="create"></app-word-form>
            <div class="d-flex gap-20 m-t-20">
                <button mat-flat-button color="primary" (click)="wordFormRef.save()">{{ 'word.create' | translate }}</button>
            </div>
        </div>
    `,
    encapsulation: ViewEncapsulation.None,
    imports: [WordFormComponent, MatButtonModule, TranslatePipe]
})
export class WordNewComponent {
    protected readonly form: FormGroup;
    #formBuilder = inject(FormBuilder);

    constructor() {
        this.form = this.#formBuilder.group({
            name: ['', Validators.required],
            typeId: [null, Validators.required],
            genderId: [null],
            plural: ['']
        });
    }
}
