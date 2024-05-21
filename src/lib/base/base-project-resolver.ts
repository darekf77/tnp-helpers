//#region imports
import {
  //#region @backend
  fse, child_process
  //#endregion
} from 'tnp-core';
import { Helpers } from '../index';
import { path, crossPlatformPath } from 'tnp-core';
import { config } from 'tnp-config';
import { _ } from 'tnp-core';
import type { BaseProject } from './base-project';
import { Low } from "lowdb"
//#region @backend
import { os } from 'tnp-core/src';
import { JSONFilePreset } from "../lowdb/node";
export { ChildProcess } from 'child_process';
import { CLI } from 'tnp-cli';
//#endregion

//#endregion

const defaultDb = {
  projects: [] as {
    location: string;
  }[],
}

export class BaseProjectResolver<T extends Partial<BaseProject> = any> {

  private lowDB: Low<typeof defaultDb>;
  public get isUnsingDB(): boolean {
    return !!this.lowDB;
  }
  async useDB(appName: string): Promise<Low<typeof defaultDb>> {
    //#region @backendFunc
    const userFolder = crossPlatformPath([os.homedir(), `.firedev/apps/${appName}`]);
    try {
      Helpers.mkdirp(userFolder);
    } catch (error) { }
    const dbLocation = crossPlatformPath([userFolder, 'db.json']);
    console.log({ dbLocation })

    this.lowDB = await JSONFilePreset(dbLocation, defaultDb);
    // @LAST this for base-project
    return this.lowDB;
    //#endregion
    // @ts-ignore
    return void 0;
  }

  async getAllProjectsFromDB(appName: string) {
    const db = await this.useDB(appName);
    return db.data.projects;
  }

  //#region fields
  protected readonly NPM_PROJECT_KEY = 'npm';
  protected projects: T[] = [];
  /**
   * To speed up checking folder I am keeping pathes for alterdy checked folder
   * This may break things that are creating new projects
   */
  protected emptyLocations: string[] = [];
  //#endregion

  //#region constructor
  constructor(protected classFn: any) { }
  //#endregion

  //#region fields & getters / allowed types
  get allowedTypes(): string[] {
    //#region @websqlFunc
    return [this.NPM_PROJECT_KEY];
    // throw `Please override this getter [allowedTypes] in your child class or  ${CLI.chalk.bold(config.frameworkName)}`;
    //#endregion
  }
  //#endregion

  //#region fields & getters / current project
  /**
   * project from process.cwd()
   */
  get Current(): T {
    //#region @backendFunc
    const current = (this.classFn as typeof BaseProject).ins.From(process.cwd())
    if (!current) {
      Helpers.warn(`[firedev-helpers] Current location is not a ${CLI.chalk.bold(config.frameworkName)} type project.

     location: "${process.cwd()}"

     }`);
      return void 0;
    }
    return current as unknown as T;
    //#endregion
  }
  //#endregion

  //#region fields & getters / resolve type from
  /**
   * override this
   */
  typeFrom(location: string, recrusiveCall = false): string {
    //#region @backendFunc
    if (Helpers.exists(crossPlatformPath([location, config.file.package_json]))) {
      return this.NPM_PROJECT_KEY;
    }
    if (recrusiveCall) {
      return;
    }

    // throw `Please override this function [typeFrom] in your child class or  ${CLI.chalk.bold(config.frameworkName)}`;
    //#endregion
  }
  //#endregion

  //#region fields & getters / from
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
  //#endregion

  //#region fields & getters / get project nearest to path
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
  //#endregion

  //#region fields & getters / unload project
  unload(project: T) {
    this.projects = this.projects.filter(f => f !== project);
  }
  //#endregion

  //#region fields & getters / remove project
  remove(project: T) {
    //#region @backend
    const location = project.location;
    this.projects = this.projects.filter(p => p.location !== location);
    Helpers.tryRemoveDir(location);
    //#endregion
  }
  //#endregion

  //#region fields & getters / manually add project
  add(project: T) {
    //#region @backend
    this.projects.push(project);
    //#endregion
  }
  //#endregion

  //#region fields & getters / all projects from location

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
  //#endregion

}

