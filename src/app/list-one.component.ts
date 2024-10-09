import { Component } from '@angular/core';
import { DragDropService } from './drag-drop.service';
import {
  CdkDragDrop,
  DragDropModule,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { RecursiveChildComponent } from './recursive-child.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-list-one',
  template: `
    <div
      cdkDropList
      [cdkDropListData]="dragDropService.listOneItems"
      [cdkDropListConnectedTo]="['listTwo']"
      (cdkDropListDropped)="onDrop($event)"
      class="list">
      <div
        *ngFor="let item of dragDropService.listOneItems"
        cdkDrag>
        {{ item.name }}
      </div>
    </div>
  `,
  styles: [
    `
      .list {
        border: 1px solid #ccc;
        padding: 10px;
        background-color: #f9f9f9;
      }
    `,
  ],
  standalone: true,
  imports: [CommonModule, DragDropModule, RecursiveChildComponent],
})
export class ListOneComponent {
  constructor(public dragDropService: DragDropService) {}

  onDrop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer !== event.container) {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }
}
