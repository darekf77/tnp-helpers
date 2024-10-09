import { Component, Input } from '@angular/core';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { DynamicFormDndElem } from './dynamic-form-dnd-elem';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recursive-child',
  template: `
    <div
      *ngFor="let child of children"
      cdkDrag>
      <span
        cdkDragHandle
        class="drag-handle"
        >::</span
      >
      {{ child.name }}
      <div
        cdkDropList
        [cdkDropListData]="child.children"
        class="nested-drop-zone"
        (cdkDropListDropped)="onDrop($event)">
        <app-recursive-child [children]="child.children"></app-recursive-child>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        padding: 20px;
      }
      .nested-drop-zone {
        padding-left: 20px;
        border-left: 2px dashed #ccc;
        margin-top: 10px;
      }
      .drag-handle {
        cursor: move;
      }
    `,
  ],
  standalone: true,
  imports: [CommonModule, DragDropModule],
})
export class RecursiveChildComponent {
  @Input() children: DynamicFormDndElem[];

  onDrop(event: CdkDragDrop<DynamicFormDndElem[]>) {
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
