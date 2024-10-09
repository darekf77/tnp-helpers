import { Component } from '@angular/core';
import { DragDropService } from './drag-drop.service';
import {
  CdkDragDrop,
  transferArrayItem,
  moveItemInArray,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { RecursiveChildComponent } from './recursive-child.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-list-two',
  template: `
    <div
      cdkDropList
      #listTwo="cdkDropList"
      [cdkDropListData]="dragDropService.listTwoItems"
      [cdkDropListConnectedTo]="['listOne']"
      (cdkDropListDropped)="onDrop($event)"
      class="list">
      <div
        *ngFor="let item of dragDropService.listTwoItems"
        cdkDrag>
        <span
          cdkDragHandle
          class="drag-handle"
          >::</span
        >
        {{ item.name }}
        <div
          cdkDropList
          [cdkDropListData]="item.children"
          (cdkDropListDropped)="onDrop($event)">
          <app-recursive-child [children]="item.children"></app-recursive-child>
        </div>
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
      .drag-handle {
        cursor: move;
        padding-right: 10px;
      }
    `,
  ],
  standalone: true,
  imports: [CommonModule, DragDropModule, RecursiveChildComponent],
})
export class ListTwoComponent {
  constructor(public dragDropService: DragDropService) {}

  onDrop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }
}
