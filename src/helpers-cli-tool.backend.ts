import * as _ from 'lodash';
import * as path from 'path';
import { Helpers } from './index';
import type { Project } from './project';
import { CLASS } from 'typescript-class-helpers';
declare const global: any;
import { config } from 'tnp-config';

export class HelpersCliTool {

  /**
   * return simplified version of command:
   * example: tnp HELLO:WORLD
   * will be: tnp helloworld
   *
   * or: `tnp ${$START}`
   * will be `tnp start`
   *
   * @param commandStringOrClass
   */
  simplifiedCmd(commandStringOrClass: string | Function, shortVersion = false) {
    if (_.isFunction(commandStringOrClass)) {
      commandStringOrClass = CLASS.getName(commandStringOrClass);
    }
    if (!commandStringOrClass) {
      commandStringOrClass = ''
    }

    commandStringOrClass = _
      .kebabCase(commandStringOrClass as string)
      .replace(/\$/g, '')
      .replace(/\-/g, '')
      .replace(/\:/g, '')
      .replace(/\_/g, '')
      .toLowerCase()

    if (shortVersion) {
      const shortKey = Object.keys(config.argsReplacements).find(key => {
        const v = Helpers.cliTool.simplifiedCmd(config.argsReplacements[key]);
        return v.trim() === (commandStringOrClass as string).trim();
      });
      return shortKey;
    }

    return commandStringOrClass;
  }

  argsFromBegin<T = any>(argumentsCommands: string | string[], argsFunc: (restOfCommandArgs) => T): {
    resolved: T[],
    /**
     * arguments string without resolved
     */
    commandString: string;
  } {
    const resolved = [] as T[];
    if (_.isString(argumentsCommands)) {
      argumentsCommands = argumentsCommands.split(' ');
    }
    let commandString = (argumentsCommands || []);
    while (true) {
      const a = commandString.shift();
      const v = argsFunc(a);
      if (!_.isNil(v)) {
        resolved.push(v);
        continue;
      }
      break;
    }

    return { resolved, commandString: commandString.join(' ') };
  }

  argsFrom<T = any>(args: string | string[]) {
    if (_.isArray(args)) {
      args = Helpers.cliTool.removeStartEndCommandChars(args.join(' ')).split(' ');
    }
    if (_.isString(args)) {
      args = Helpers.cliTool.removeStartEndCommandChars(args).split(' ');
    }

    const obj = require('minimist')(args || []) as any;
    Object.keys(obj).forEach(key => {
      const v = obj[key];
      if (v === 'true') {
        obj[key] = true;
      }
      if (v === 'false') {
        obj[key] = false;
      }
    })
    return (_.isObject(obj) ? obj : {}) as T;
  }

  removeStartEndCommandChars(command: string) {
    return (command || '')
      .replace(/^\"/, '')
      .replace(/^\'/, '')
      .replace(/\"$/, '')
      .replace(/\'$/, '')
      .trim()
  }

  resolveProject<T = Project>(args: string | string[], CurrentProject: Project, ProjectClass: typeof Project): T {
    if (!CurrentProject) {
      return void 0;
    }
    if (_.isString(args)) {
      args = args.split(' ');
    }
    let firstArg = _.first(args).replace(/\/$/, '');
    if (firstArg) {
      if (path.isAbsolute(firstArg)) {
        return ProjectClass.From(firstArg);
      }
      return ProjectClass.From(path.join(CurrentProject.location, firstArg));
    }
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

  resolveProjectsFromArgs(args: string | string[], CurrentProject: Project, ProjectClass: typeof Project): Project[] {
    const projects = [];
    if (!CurrentProject) {
      return [];
    }
    if (_.isString(args)) {
      args = args.split(' ');
    }
    args.forEach(a => {
      const child = ProjectClass.From(path.join(CurrentProject.location, a));
      if (child) {
        projects.push(child);
      }
    });
    return projects;
  }

  /**
   * Check if your function name fits into command line param
   *
   * @param name name of function
   * @param restOfArgs arguments from command line
   */
  match(name: string, restOfArgs: string[]): { isMatch: boolean; restOfArgs: string[] } {
    let isMatch = false;

    let counter = 0;
    isMatch = !!restOfArgs
      .filter(a => !a.startsWith('--')) // TODO fix this also for other special paramters
      .find((vv, i) => {

        if (++counter > 3) {
          // console.log(`counter NOT OK ${vv}`)
          return false
        }
        // console.log(`counter ok for ${vv}`)
        const nameInKC = Helpers.cliTool.simplifiedCmd(name);
        const argInKC = Helpers.cliTool.simplifiedCmd(vv);

        const condition = (nameInKC === argInKC)
        if (condition) {
          restOfArgs = _.slice(restOfArgs, i + 1, restOfArgs.length);
        }
        return condition;
      });
    return { isMatch, restOfArgs };
  }

}
