
import {
  //#region @backend
  fse, child_process
  //#endregion
} from 'tnp-core';
//#region @backend
export { ChildProcess } from 'child_process';
import { CLI } from 'tnp-cli';
//#endregion
import { Helpers } from './index';
import { path, crossPlatformPath } from 'tnp-core';
import { config } from 'tnp-config';
import { _ } from 'tnp-core';
import type { BaseProject } from './base-project';



export class BaseProjectResolver<T extends Partial<BaseProject> = any> {

  protected readonly NPM_PROJECT_KEY = 'npm';
  protected projects: T[] = [];
  /**
   * To speed up checking folder I am keeping pathes for alterdy checked folder
   * This may break things that are creating new projects
   */
  protected emptyLocations: string[] = [];
  constructor(protected classFn: any) { }
  get allowedTypes(): string[] {
    //#region @websqlFunc
    return [this.NPM_PROJECT_KEY];
    // throw `Please override this getter [allowedTypes] in your child class or  ${CLI.chalk.bold(config.frameworkName)}`;
    //#endregion
  }

  get Current(): T {
    //#region @backendFunc
    const current = (this.classFn).From(process.cwd())
    if (!current) {
      Helpers.warn(`[firedev-helpers] Current location is not a ${CLI.chalk.bold(config.frameworkName)} type project.

     location: "${process.cwd()}"

     }`);
      return void 0;
    }
    return current;
    //#endregion
  }

  /**
   * override this
   */
  typeFrom(location: string): string {
    //#region @backendFunc
    if (Helpers.exists(crossPlatformPath([location, config.file.package_json]))) {
      return this.NPM_PROJECT_KEY;
    }
    // throw `Please override this function [typeFrom] in your child class or  ${CLI.chalk.bold(config.frameworkName)}`;
    //#endregion
  }


  From(locationOfProject: string | string[], options?: any): T {
    // console.log({
    //   locationOfProj
    // })
    //#region @websqlFunc
    if (Array.isArray(locationOfProject)) {
      locationOfProject = locationOfProject.join('/');
    }
    let location = crossPlatformPath(locationOfProject.replace(/\/\//g, '/'));

    if (!_.isString(location)) {
      Helpers.warn(`[project.from] location is not a string`)
      return;
    }
    if (path.basename(location) === 'dist') {
      location = path.dirname(location);
    }
    location = crossPlatformPath(path.resolve(location));

    const alreadyExist = this.projects.find(l => l.location.trim() === location.trim());
    if (alreadyExist) {
      return alreadyExist as any;
    }

    //#region @backend
    if (!fse.existsSync(location)) {
      Helpers.log(`[firedev-helpers][project.from] Cannot find project in location: ${location}`, 1);
      this.emptyLocations.push(location);
      return;
    }


    let type = this.typeFrom(location);
    if (type) {
      let resultProject = new (this.classFn)() as BaseProject;

      const pj = Helpers.readJson(crossPlatformPath([location, config.file.package_json]))

      // @ts-ignore
      resultProject.location = location;
      // @ts-ignore
      resultProject.type = type;
      // @ts-ignore
      resultProject.packageJSON = pj;
      // @ts-ignore
      resultProject.ins = this;

      return resultProject as any;
    }
    //#endregion

    //#endregion
  }

  nearestTo(
    absoluteLocation: string,
    options?: { type?: (string | string[]); findGitRoot?: boolean; onlyOutSideNodeModules?: boolean }): T {
    //#region @backendFunc

    options = options || {};
    const { type, findGitRoot, onlyOutSideNodeModules } = options;

    if (_.isString(type) && !this.allowedTypes.includes(type)) {
      Helpers.error(`[firedev-helpers][project.nearestTo] wrong type: ${type}`, false, true)
    }
    if (fse.existsSync(absoluteLocation)) {
      absoluteLocation = fse.realpathSync(absoluteLocation);
    }
    if (fse.existsSync(absoluteLocation) && !fse.lstatSync(absoluteLocation).isDirectory()) {
      absoluteLocation = path.dirname(absoluteLocation);
    }

    let project: (T & BaseProject);
    let previousLocation: string;
    while (true) {
      if (onlyOutSideNodeModules && (path.basename(path.dirname(absoluteLocation)) === 'node_modules')) {
        absoluteLocation = path.dirname(path.dirname(absoluteLocation));
      }
      project = this.From(absoluteLocation, options) as any;
      if (_.isString(type)) {
        if (this.allowedTypes.includes(project?.type)) {
          if (findGitRoot) {
            if (project.git.isGitRoot) {
              break;
            }
          } else {
            break;
          }
        }
      } else {
        if (project) {
          if (findGitRoot) {
            if (project.git.isGitRoot) {
              break;
            }
          } else {
            break;
          }
        }
      }

      previousLocation = absoluteLocation;
      const newAbsLocation = path.join(absoluteLocation, '..');
      if (!path.isAbsolute(newAbsLocation)) {
        return;
      }
      absoluteLocation = crossPlatformPath(path.resolve(newAbsLocation));
      if (!fse.existsSync(absoluteLocation) && absoluteLocation.split('/').length < 2) {
        return;
      }
      if (previousLocation === absoluteLocation) {
        return;
      }
    }
    return project as any;
    //#endregion
  }


  unload(project: T) {
    this.projects = this.projects.filter(f => f !== project);
  }

  remove(project: T) {
    //#region @backend
    const location = project.location;
    this.projects = this.projects.filter(p => p.location !== location);
    Helpers.tryRemoveDir(location);
    //#endregion
  }

  add(project: T) {
    //#region @backend
    this.projects.push(project);
    //#endregion
  }


  allProjectFrom(absoluteLocation: string, stopOnCwd: string = '/') {
    //#region @backendFunc
    const projects = {};
    const projectsList = [];
    let previousAbsLocation: string;
    while (absoluteLocation.startsWith(stopOnCwd)) {

      if (previousAbsLocation === absoluteLocation) {
        break;
      }

      const proj = this.nearestTo(absoluteLocation) as any as BaseProject;
      if (proj) {
        if (projects[proj.location]) {
          break;
        }
        projects[proj.location] = proj;
        projectsList.push(proj);
        previousAbsLocation = absoluteLocation;
        absoluteLocation = path.dirname(proj.location);
        continue;
      }
      break;
    }
    return projectsList as T[];
    //#endregion
  }

  /**
   * Resolve child project when accessing from parent container etc...
   * @param args string or string[] from cli args
   * @param CurrentProject project from process.cwd()
   */
  resolveChildProject(args: string | string[]): T {
    //#region @backendFunc
    const currentProject = this.Current;

    if (!currentProject) {
      return void 0 as any;
    }
    if (_.isString(args)) {
      args = args.split(' ');
    }
    let firstArg = _.first(args);
    if (firstArg) {
      firstArg = firstArg.replace(/\/$/, '');
      const child = currentProject.children.find(c => c.name === firstArg);
      if (child) { // @ts-ignore
        currentProject = child;
      }
    }
    return currentProject;
    //#endregion
  }



}

