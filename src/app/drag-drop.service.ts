import { Injectable } from '@angular/core';
import { DynamicFormDndElem } from './dynamic-form-dnd-elem';

@Injectable({
  providedIn: 'root',
})
export class DragDropService {
  listOneItems: DynamicFormDndElem[] = [
    new DynamicFormDndElem({ name: 'Item 1' }),
    new DynamicFormDndElem({ name: 'Item 2' }),
    new DynamicFormDndElem({ name: 'Item 3' }),
  ];

  listTwoItems: DynamicFormDndElem[] = [
    new DynamicFormDndElem({
      name: 'Item A',
      children: [
        new DynamicFormDndElem({ name: 'Child 1' }),
        new DynamicFormDndElem({ name: 'Child 2' }),
      ],
    }),
    new DynamicFormDndElem({ name: 'Item B', children: [] }),
  ];

  constructor() {}
}
