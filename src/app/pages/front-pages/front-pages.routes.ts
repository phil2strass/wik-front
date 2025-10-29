import { Routes } from '@angular/router';
import { HomepageComponent } from './homepage/homepage.component';
import { AboutUsComponent } from './about-us/about-us.component';
import { HomepageDetailsComponent } from './homepage-details/homepage-details.component';
import { BlogComponent } from './blog/blog.component';
import { PortfolioComponent } from './portfolio/portfolio.component';
import { PricingComponent } from './pricing/pricing.component';
import { ContactComponent } from './contact/contact.component';
import { BlogDetailsComponent } from './blog-details/blog-details.component';


export const FrontPagesRoutes: Routes = [
    
    {
        path: '',
        component: HomepageComponent, // acts as layout shell
        children: [
          { path: '', redirectTo: 'homepage', pathMatch: 'full' },
          { path: 'homepage', component: HomepageDetailsComponent }, // real homepage content
          { path: 'about', component: AboutUsComponent },
          {path:'blog',component:BlogComponent },
          { path: 'portfolio', component: PortfolioComponent },
          { path: 'pricing', component: PricingComponent  },
          { path: 'contact', component: ContactComponent },
          { path: 'blog-details', component: BlogDetailsComponent },
        ],
      },
];