import { _ } from 'tnp-core/src';
import { Helpers } from '../../../index';

export type ClassMeta = {
  className: string;
  isDefault: boolean;
};

/**
 * @deprecated
 */
export class TsCodeExtractor {
  get REGEX () {
    return {
      /**
       * @deprecated
       */
      DEFAULT_CLASS: new RegExp(
        'export\\ +default\\ +(abstract\\ +)?class\\ +',
      ),
      /**
       * @deprecated
       */
      CLASS: new RegExp('export\\ +(abstract\\ +)?class\\ +'),
    };
  }

  /**
   * TODO
   */
  getClassesFrom (absoluteFilePath: string) {
    //#region @backend
    const content = Helpers.readFile(absoluteFilePath);
    const classes: ClassMeta[] = [];
    content.split('\n').forEach(line => {
      if (this.REGEX.DEFAULT_CLASS.test(line)) {
        const className = _.first(
          line
            .replace(_.first(line.match(this.REGEX.DEFAULT_CLASS)), '')
            .split(' '),
        ) as string;
        classes.push({
          className,
          isDefault: true,
        });
      } else if (this.REGEX.CLASS.test(line)) {
        const className = _.first(
          line.replace(_.first(line.match(this.REGEX.CLASS)), '').split(' '),
        ) as string;
        classes.push({
          className,
          isDefault: false,
        });
      }
    });
    return { classes, firstClass: _.first(classes) };
    //#endregion
  }
}
