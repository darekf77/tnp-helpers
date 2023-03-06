//#region @browser
import { Observable, Subject } from "rxjs";

const componentContextSymbol = Symbol();
const componentsDestroy$Subjects = {};

export class SerializedSubject<T> {
  constructor(
    public id: string
  ) { }
}

export namespace NgHelpers {

  function subjectId(destroySubject: Subject<any>): SerializedSubject<any> {
    const id = Math.random().toString(36).substring(2);
    if (!destroySubject[componentContextSymbol]) {
      destroySubject[componentContextSymbol] = new SerializedSubject(id);
      componentsDestroy$Subjects[id] = destroySubject;
    }
    return destroySubject[componentContextSymbol];
  }

  /**
   * if you are using this.. please call Helpers.ng.unsubscribe(this.$destroy) in ngOnDestroy();
   */
  export function serialize(destroy$: Subject<any>): SerializedSubject<any> {
    return subjectId(destroy$);
  }

  /**
   * if you are using this.. please call Helpers.ng.unsubscribe(this.$destroy) in ngOnDestroy();
   */
  export function deserialize(destroy$: SerializedSubject<any>): Subject<any> {
    if (destroy$?.id) {
      const realDestroySubject = componentsDestroy$Subjects[destroy$.id];
      return realDestroySubject;
    }
    return new Subject();
  }

  export function unsubscribe(destroy$: Subject<any>) {
    const destroySubject = subjectId(destroy$);
    if (destroySubject?.id) {
      delete componentsDestroy$Subjects[destroySubject.id];
      delete destroySubject[componentContextSymbol];
    }
  }



  /**
  get properties from scss file


  import styles from './tasks-ngrx-data.component.scss';

  export class ExampleComponent {
    sassFile = sassFile(styles);

    async ngOnInit() {
      this.tasksService.getAll();
      console.log(this.sassFile.stringValue('--max-container-size'))
      console.log(this.sassFile.numberValue('--max-container-size'))
    }
  }
     */
  export function sassFile(styles: string) {
    const lines = (styles.split('\n'));
    return {
      stringValue: (name: string) => {
        for (let index = 0; index < lines.length; index++) {
          const l = lines[index];
          const [varName, value] = l.trim().split(':');
          if (varName === name) {
            return value.replace(';', '');
          }
        }
      },
      numberValue: (name: string): number => {
        for (let index = 0; index < lines.length; index++) {
          const l = lines[index];
          const [varName, value] = l.trim().split(':');
          if (varName === name) {
            return Number(value.replace('px', '').replace(';', ''));
          }
        }
      }
    }
  }
}

//#endregion
