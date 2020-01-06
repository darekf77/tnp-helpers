import * as _ from 'lodash';
import { Helpers } from './index';
export class HelpersCliTool {

  paramsFrom(command: string) {
    if (!command) {
      command = ''
    }
    return _
      .kebabCase(command)
      .replace(/\$/g, '')
      .replace(/\-/g, '')
      .replace(/\:/g, '')
      .replace(/\_/g, '')
      .toLowerCase()
  }

  match(name: string, argv: string[]): { isMatch: boolean; restOfArgs: string[] } {
    let isMatch = false;
    let restOfArgs = argv;

    let counter = 0;
    isMatch = !!argv.find((vv, i) => {

      if (++counter > 3) {
        // console.log(`counter NOT OK ${vv}`)
        return false
      }
      // console.log(`counter ok for ${vv}`)
      const nameInKC = Helpers.cliTool.paramsFrom(name);
      const argInKC = Helpers.cliTool.paramsFrom(vv);

      const condition = (nameInKC === argInKC)
      if (condition) {
        restOfArgs = _.slice(argv, i + 1, argv.length);
      }
      return condition;
    });
    return { isMatch, restOfArgs };
  }

}
