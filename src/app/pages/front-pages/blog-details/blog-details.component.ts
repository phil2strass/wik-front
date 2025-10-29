import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { IconModule } from 'src/app/icon/icon.module';
import { MaterialModule } from 'src/app/material.module';
import { FooterComponent } from '../footer/footer.component';
import { FrontEndService } from 'src/app/services/apps/front-pages/front-end.service';

@Component({
  selector: 'app-blog-details',
  imports: [IconModule, MaterialModule, CommonModule,
    FooterComponent
  ],
  templateUrl: './blog-details.component.html',
  styleUrl: './blog-details.component.scss'
})
export class BlogDetailsComponent implements OnInit {
  blogDetail = signal<any>(null);
  private frontendService = inject(FrontEndService);
  ngOnInit(): void {
    const selected = this.frontendService.getBlog()();

    if (selected) {
      this.blogDetail.set(selected);
    } else {
      // Fallback if accessed directly (e.g., from sidebar or refresh)
      const defaultBlog = {
        id: 1,
        time: "2 mins Read",
        imgSrc: "/assets/images/blog/blog-img1.jpg",
        user: "/assets/images/profile/user-1.jpg",
        title: "As yen tumbles, gadget-loving Japan goes for secondhand iPhones",
        views: "9,125",
        category: "Social",
        comments: 3,
        date: "Mon, Dec 23"
      };
      this.blogDetail.set(defaultBlog);
    }
  }
}
