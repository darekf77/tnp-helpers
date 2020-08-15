import * as _ from 'lodash';
import { Helpers } from './index';
import type { Project } from './project';
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

  argsFrom<T = any>(args: string | string[]) {
    if (_.isString(args)) {
      args = args.split(' ');
    }
    const obj = require('minimist')(args) as any;
    return (_.isObject(obj) ? obj : {}) as T;
  }

  /**
   * Resolve child project when accessing from parent workspace, container etc...
   * @param args string or string[] from cli args
   * @param CurrentProject project from process.cwd()
   */
  resolveChildProject(args: string | string[], CurrentProject: Project): Project {
    if (!CurrentProject) {
      return void 0;
    }
    if (_.isString(args)) {
      args = args.split(' ');
    }
    let firstArg = _.first(args);
    if (firstArg) {
      firstArg = firstArg.replace(/\/$/, '');
      const child = CurrentProject.children.find(c => c.name === firstArg);
      if (child) {
        CurrentProject = child;
      }
    }
    return CurrentProject;
  }

  match(name: string, argv: string[]): { isMatch: boolean; restOfArgs: string[] } {
    let isMatch = false;
    let restOfArgs = argv;

    let counter = 0;
    isMatch = !!argv
      .filter(a => !a.startsWith('--')) // TODO fix this also for other special paramters
      .find((vv, i) => {

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
