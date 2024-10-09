import { DragDropModule } from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { ListOneComponent } from './list-one.component';
import { ListTwoComponent } from './list-two.component';
import { RecursiveChildComponent } from './recursive-child.component';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'dnd',
  template: `
    <div class="container">
      <app-list-one></app-list-one>
      <app-list-two></app-list-two>
    </div>
  `,
  styles: [
    `
      .container {
        width: 500px;
        display: flex;
        justify-content: space-around;
        padding: 20px;
      }
    `,
  ],
  standalone: true,
  imports: [
    BrowserModule,
    CommonModule,
    DragDropModule,
    ListOneComponent,
    ListTwoComponent,
    RecursiveChildComponent,
  ],
})
export class DndComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
