import { Component } from '@angular/core';
import { IconModule } from 'src/app/icon/icon.module';
import { MaterialModule } from 'src/app/material.module';
import { MatDialogRef } from '@angular/material/dialog';
@Component({
  selector: 'app-template-video',
  imports: [MaterialModule,
      IconModule,],
  templateUrl: './template-video.component.html',
  styleUrl: './template-video.component.scss'
})
export class TemplateVideoComponent {
constructor(private dialogRef: MatDialogRef<TemplateVideoComponent>){

}
closeDialog(): void {
  this.dialogRef.close(false); // Pass false back to parent
}
}
