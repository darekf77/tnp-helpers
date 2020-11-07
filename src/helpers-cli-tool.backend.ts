import * as _ from 'lodash';
import * as path from 'path';
import { Helpers } from './index';
import type { Project } from './project';
import { CLASS } from 'typescript-class-helpers';
declare const global: any;
import { config } from 'tnp-config';

export class HelpersCliTool {

  paramsFromFn(classFN: Function, shortVersion = false) {
    const classFnParsed = Helpers.cliTool.paramsFrom(CLASS.getName(classFN));
    if (!classFnParsed) {
      return '';
    }
    if (shortVersion) {
      const shortKey = Object.keys(config.argsReplacements).find(key => {
        const v = Helpers.cliTool.paramsFrom(config.argsReplacements[key]);
        return v.trim() === classFnParsed.trim();
      });
      return shortKey;
    }
    return classFnParsed;
  }

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
