import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateVideoComponent } from './template-video.component';

describe('TemplateVideoComponent', () => {
  let component: TemplateVideoComponent;
  let fixture: ComponentFixture<TemplateVideoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemplateVideoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TemplateVideoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
