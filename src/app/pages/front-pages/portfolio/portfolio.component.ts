

import { Component, OnInit } from '@angular/core';
import { IconModule } from 'src/app/icon/icon.module';
import { MaterialModule } from 'src/app/material.module';
import { productcards } from '../front-pagesData';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-portfolio',
  imports: [MaterialModule, IconModule, FooterComponent, CommonModule, FormsModule],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.scss'
})
export class PortfolioComponent implements OnInit {

  filteredCards = productcards;

  searchText: string = '';

  filteredCardImgs = [...this.filteredCards]; // Initialize with full data
  filteredCount: number = this.filteredCardImgs.length;
  ngOnInit(): void {
    console.log('filteredCards', this.filteredCards)
  }
  onSearchChange() {
    const query = this.searchText.toLowerCase().trim();
    this.filteredCardImgs = this.filteredCards.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.date.toLowerCase().includes(query)
    );
    this.filteredCount = this.filteredCardImgs.length; // ✅ update the count here
  }
}

