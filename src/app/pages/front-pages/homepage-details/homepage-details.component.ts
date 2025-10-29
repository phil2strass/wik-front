import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { IconModule } from 'src/app/icon/icon.module';
import { MaterialModule } from 'src/app/material.module';
import {
  faqList,
  followercardsFirst,
  followercardSecond,
  followercardThird,
  frameworks,
  tiles,
  users,
  topcardsGrid,
} from '../front-pagesData';
import { CommonModule } from '@angular/common';
import { MediaMatcher } from '@angular/cdk/layout';
import { ImageSliderComponent } from '../image-slider/image-slider.component';
import { FooterComponent } from '../footer/footer.component';
import { MatDialog } from '@angular/material/dialog';
import { TemplateVideoComponent } from '../template-video/template-video.component';
import { Router, RouterModule } from '@angular/router';


@Component({
  selector: 'app-homepage-details',
  imports: [
    MaterialModule,
    IconModule,
    CommonModule,
    ImageSliderComponent,
    FooterComponent,
    RouterModule
  ],
  templateUrl: './homepage-details.component.html',
  styleUrl: './homepage-details.component.scss',
})
export class HomepageDetailsComponent {
 
  topcards=topcardsGrid;

 
  centered = false;
  disabled = false;
  unbounded = false;
  radius: number;
  color: string;
  showBackground: boolean = false;
  frameworks = frameworks;
  selectedIndex = 1;

  readonly dialog = inject(MatDialog);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef); // ✅ For automatic cleanup
  private mediaMatcher = inject(MediaMatcher); // ✅ Proper MediaMatcher injection

  mobileQuery: MediaQueryList;
  isMobileView = false;

  readonly panelOpenState = signal(false);
  tiles = tiles;
  hideCloserBtn: boolean = true;
  users = users;
  expandedIndex: number | null = null;
  currentIndex = signal(0); // Starting from 0
  faqList = faqList;
  selectedPath: string | null = null;
  clicked = false;

  followercardsfirst = followercardsFirst;
  followercardsecond = followercardSecond;
  followercardthird = followercardThird;

  currentUser = computed(() => this.users[this.currentIndex()]);
  displayCount = computed(() => `${this.currentIndex() + 1}/${this.users.length}`);

  constructor() {
    const isSmallScreen = this.mediaMatcher.matchMedia('(max-width: 599px)');
    // ✅ Setup media query for max-width: 1199px
    this.mobileQuery = this.mediaMatcher.matchMedia('(max-width: 1199px)');
    this.isMobileView = this.mobileQuery.matches;

    const listener = (e: MediaQueryListEvent) => {
      this.isMobileView = e.matches;
    };

    // ✅ Listen to viewport changes
    this.mobileQuery.addEventListener('change', listener);

    // ✅ Clean up listener on component destroy
    this.destroyRef.onDestroy(() => {
      this.mobileQuery.removeEventListener('change', listener);
    });
  }
  isOver(): boolean {
    return this.mediaMatcher.matchMedia('(max-width: 1199px)').matches;
  }

  goPrev() {
    if (this.currentIndex() > 0) {
      this.currentIndex.update((i) => i - 1);
    }
  }

  goNext() {
    if (this.currentIndex() < this.users.length - 1) {
      this.currentIndex.update((i) => i + 1);
    }
  }
  openDialog(showBackground:boolean){
    this.showBackground = showBackground;

    const dialogRef = this.dialog.open(TemplateVideoComponent, {
      data: {},
      width: '1000px',
    });
  
    dialogRef.afterClosed().subscribe((result) => {
      if (result === false) {
        this.showBackground = false; // Reset or take any action
      }
    });
  }

 
  onImageClick(path: string) {
    this.selectedPath = path;

    setTimeout(() => {
      this.router.navigate([path]);
    }, 100); // brief delay to show border
  }
}
