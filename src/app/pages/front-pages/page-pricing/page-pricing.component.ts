import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IconModule } from 'src/app/icon/icon.module';
import { MaterialModule } from 'src/app/material.module';
import { paymentLogos, plans } from '../front-pagesData';

@Component({
  selector: 'app-page-pricing',
  imports: [MaterialModule, IconModule, CommonModule],
  templateUrl: './page-pricing.component.html',
  styleUrl: './page-pricing.component.scss',
})
export class PagePricingComponent {
  plans = plans;

  paymentLogos = paymentLogos;
}
