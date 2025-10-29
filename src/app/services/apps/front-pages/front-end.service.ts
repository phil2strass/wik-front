import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FrontEndService {

  private blog = signal<any>(null);

  constructor() { }



  setBlog(blogData: any) {
    this.blog.set(blogData);
  }

  getBlog() {
    return this.blog;
  }
}
