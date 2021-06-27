import { _, path } from 'tnp-core';
import { Helpers } from './index';
import type { Project } from './project';
import { CLASS } from 'typescript-class-helpers';
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
    let tmpArgumentsCommands = argumentsCommands;
    const resolved = [] as T[];
    if (_.isString(tmpArgumentsCommands)) {
      tmpArgumentsCommands = tmpArgumentsCommands.split(' ');
    }
    let commandString = (tmpArgumentsCommands || []);
    if (_.isArray(commandString) && commandString.length > 0) {
      while (true) {
        if (commandString.length === 0) {
          break;
        }
        const a = commandString.shift();
        const v = argsFunc(a);
        if (!_.isNil(v)) {
          resolved.push(v);
          continue;
        }
        commandString.unshift(a);
        break;
      }
    } else {
      commandString = [];
    }
    return { resolved, commandString: (commandString).join(' ') };
  }

  cleanCommand<T extends { [k: string]: string | boolean | string[] | boolean[] }>(
    command: string | string[],
    minimistOption: T
  ) {
    const isArray = _.isArray(command);
    if (isArray) {
      command = (command as string[]).join(' ');
    }
    command = command as string;
    minimistOption = _.cloneDeep(minimistOption);
    delete minimistOption['_'];
    delete minimistOption['>'];
    if (!_.isString(command)) {
      command = '';
    }
    _.keys(minimistOption).forEach(paramName => {
      let value = minimistOption[paramName] as string[];
      if (!_.isArray(value)) {
        value = [value]
      }
      value.map(v => v.toString())
        .forEach(v => {
          [
            paramName,
            _.kebabCase(paramName),
            _.camelCase(paramName)
          ].forEach(p => {
            command = (command as string)
              .replace(new RegExp((`\\-\\-${p}\\=${v}`), 'g'), '')
              .replace(new RegExp((`\\-\\-${p}\\ *${v}`), 'g'), '')
              .replace(new RegExp((`\\-\\-${p}`), 'g'), '')
          });
        })
    });
    return command.trim() as string;
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
