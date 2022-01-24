import { _ } from 'tnp-core';
import { Helpers } from '../index';

export type ClassMeta = {
  className: string,
  isDefault: boolean,
};

export class TsCodeExtractor {
  get REGEX() {
    return {
      DEFAULT_CLASS: new RegExp('export\\ +default\\ +(abstract\\ +)?class\\ +'),
      CLASS: new RegExp('export\\ +(abstract\\ +)?class\\ +'),
    };
  }

  getClassesFrom(absoluteFilePath: string) {
    //#region @backend
    const content = Helpers.readFile(absoluteFilePath);
    const classes: ClassMeta[] = [];
    content.split('\n').forEach(line => {
      if (this.REGEX.DEFAULT_CLASS.test(line)) {
        const className = _.first(line.replace(_.first(line.match(this.REGEX.DEFAULT_CLASS)), '').split(' '));
        classes.push({
          className,
          isDefault: true
        });
      } else if (this.REGEX.CLASS.test(line)) {
        const className = _.first(line.replace(_.first(line.match(this.REGEX.CLASS)), '').split(' '));
        classes.push({
          className,
          isDefault: false
        });
      }
    });
    return { classes, firstClass: _.first(classes) };
    //#endregion
  }

}
