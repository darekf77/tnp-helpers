import { v4 as uuidv4 } from 'uuid';

export class DynamicFormDndElem {
  name: string;
  uId: string;
  children: DynamicFormDndElem[];

  constructor(options: { name: string; children?: DynamicFormDndElem[] }) {
    this.name = options.name;
    this.uId = uuidv4();
    this.children = options.children || [];
  }
}
