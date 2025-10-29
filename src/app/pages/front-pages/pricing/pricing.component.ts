import { Component } from '@angular/core';
import { IconModule } from 'src/app/icon/icon.module';
import { MaterialModule } from 'src/app/material.module';
import { FooterComponent } from '../footer/footer.component';
import { PagePricingComponent } from '../page-pricing/page-pricing.component';

@Component({
  selector: 'app-pricing',
  imports: [MaterialModule,IconModule,FooterComponent,PagePricingComponent],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss'
})
export class PricingComponent {

}
