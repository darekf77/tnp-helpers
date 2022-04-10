

export class AngularHelpers {

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
  sassFile = (styles: string) => {
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
