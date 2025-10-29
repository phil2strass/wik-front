import { Component, computed, signal } from '@angular/core';
import { IconModule } from 'src/app/icon/icon.module';
import { MaterialModule } from 'src/app/material.module';
import { team } from '../front-pagesData';

@Component({
  selector: 'app-image-slider',
  imports: [MaterialModule,IconModule],
  templateUrl: './image-slider.component.html',
  styleUrl: './image-slider.component.scss'
})
export class ImageSliderComponent {
  team = team;
  // Signals
  currentPage = signal(0);
  pageSize = 4;

  visibleTeamMembers = computed(() => {
    const start = this.currentPage() * this.pageSize;
    const end = start + this.pageSize;
    return this.team.slice(start, end);
  });

  next() {
    console.log('next--->',this.visibleTeamMembers().map(m => m.id));
    const totalPages = Math.ceil(this.team.length / this.pageSize);
    if (this.currentPage() < totalPages - 1) {
      this.currentPage.update((p) => p + 1);
    }
  }

  prev() {
    console.log(this.visibleTeamMembers().map(m => m.id));
    if (this.currentPage() > 0) {
      this.currentPage.update((p) => p - 1);
    }
  }
  
}
