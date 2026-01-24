//#region imports
import { config } from 'tnp-core/src';
import { fse } from 'tnp-core/src';
import { path, crossPlatformPath } from 'tnp-core/src';
import { _, Helpers } from 'tnp-core/src';

import { CURRENT_PACKAGE_VERSION } from '../../build-info._auto-generated_';
import { HelpersTaon } from '../../index';
import { ConfigDatabase } from '../config-database';
import { ProjectDatabase } from '../project-database';
import { PortsWorker } from '../tcp-udp-ports';

import { BaseProject } from './base-project';
//#endregion

export class BaseProjectResolver<PROJECT extends Partial<BaseProject> = any> {
  configDb: ConfigDatabase = new ConfigDatabase(this);

  projectsDb: ProjectDatabase = new ProjectDatabase(this);

  readonly portsWorker: PortsWorker;

  //#region fields
  protected readonly NPM_PROJECT_KEY = 'npm';

  protected projects: PROJECT[] = [];

  /**
   * To speed up checking folder I am keeping paths for already checked folder
   * This may break things that are creating new projects
   */
  protected emptyLocations: string[] = [];
  //#endregion

  //#region constructor
  constructor(
    protected readonly classFn: any,
    public readonly cliToolName: string,
  ) {
    this.cliToolName = cliToolName;
    // console.log("global.frameworkName",global.frameworkName)
    // if (!UtilsOs.isRunningInVscodeExtension()) {
    // if (!this.cliToolName) {
    //   Helpers.throw(`cliToolName is not provided`);
    // }
    this.portsWorker = new PortsWorker(
      'ports-worker', // BaseGlobalCommandLine.prototype.startCliServicePortsWorker
      `${this.cliToolName} startCliServicePortsWorker --skipCoreCheck`,
      CURRENT_PACKAGE_VERSION,
    );
  }
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
  get Current(): PROJECT {
    //#region @backendFunc
    const current = (this.classFn as typeof BaseProject).ins.From(
      process.cwd(),
    );
    if (!current) {
      //   Helpers.warn(`[taon-helpers] Current location is not a ${CLI.chalk.bold(config.frameworkName)} type project.

      //  location: "${process.cwd()}"

      //  }`);
      return void 0;
    }
    return current as unknown as PROJECT;
    //#endregion
  }
  //#endregion

  //#region fields & getters / resolve type from
  /**
   * override this
   */
  typeFrom(location: string, recrusiveCall = false): string {
    //#region @backendFunc
    if (
      Helpers.exists(crossPlatformPath([location, config.file.package_json]))
    ) {
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
  From(locationOfProject: string | string[], options?: any): PROJECT {
    // console.log({
    //   locationOfProj
    // })

    //#region @websqlFunc
    if (Array.isArray(locationOfProject)) {
      locationOfProject = locationOfProject.join('/');
    }
    let location = crossPlatformPath(locationOfProject.replace(/\/\//g, '/'));

    if (!_.isString(location)) {
      Helpers.warn(`[project.from] location is not a string`);
      return;
    }
    if (path.basename(location) === 'dist') {
      location = path.dirname(location);
    }
    location = crossPlatformPath(path.resolve(location));

    const alreadyExist = this.projects.find(
      l => l.location.trim() === location.trim(),
    );
    if (alreadyExist) {
      return alreadyExist as any;
    }

    //#region @backend
    if (!fse.existsSync(location)) {
      Helpers.log(
        `[taon-helpers][project.from] Cannot find project in location: ${location}`,
        1,
      );
      this.emptyLocations.push(location);
      return;
    }

    let type = this.typeFrom(location);
    if (type) {
      let resultProject = new this.classFn() as BaseProject;

      const pj = Helpers.readJson(
        crossPlatformPath([location, config.file.package_json]),
      );

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
    absoluteLocation: string | string[],
    options?: {
      type?: string | string[];
      findGitRoot?: boolean;
      onlyOutSideNodeModules?: boolean;
    },
  ): PROJECT {
    //#region @backendFunc
    if (Array.isArray(absoluteLocation)) {
      absoluteLocation = crossPlatformPath(absoluteLocation);
    }
    options = options || {};
    const { type, findGitRoot, onlyOutSideNodeModules } = options;

    if (_.isString(type) && !this.allowedTypes.includes(type)) {
      Helpers.error(
        `[taon-helpers][project.nearestTo] wrong type: ${type}`,
        false,
        true,
      );
    }
    if (fse.existsSync(absoluteLocation)) {
      absoluteLocation = fse.realpathSync(absoluteLocation);
    }
    if (
      fse.existsSync(absoluteLocation) &&
      !fse.lstatSync(absoluteLocation).isDirectory()
    ) {
      absoluteLocation = path.dirname(absoluteLocation as string);
    }

    let project: PROJECT & BaseProject;
    let previousLocation: string;
    while (true) {
      if (
        onlyOutSideNodeModules &&
        path.basename(path.dirname(absoluteLocation as string)) ===
          'node_modules'
      ) {
        absoluteLocation = path.dirname(
          path.dirname(absoluteLocation as string),
        );
      }
      project = this.From(absoluteLocation, options) as any;
      // console.log(`is project  ${!!project} ${absoluteLocation}`);
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

      previousLocation = absoluteLocation as string;
      const newAbsLocation = path.join(absoluteLocation as string, '..');
      if (!path.isAbsolute(newAbsLocation)) {
        return;
      }
      absoluteLocation = crossPlatformPath(path.resolve(newAbsLocation));
      if (
        !fse.existsSync(absoluteLocation) &&
        absoluteLocation.split('/').length < 2
      ) {
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
  unload(projectOrLocationOfProject: PROJECT | string) {
    const location = _.isString(projectOrLocationOfProject)
      ? projectOrLocationOfProject
      : projectOrLocationOfProject?.location;

    this.projects = this.projects.filter(f => f.location !== location);
    this.emptyLocations = this.emptyLocations.filter(f => f !== location);
  }
  //#endregion

  //#region fields & getters / remove project
  remove(project: PROJECT) {
    //#region @backend
    const location = project.location;
    this.projects = this.projects.filter(p => p.location !== location);
    //#endregion
  }
  //#endregion

  //#region fields & getters / manually add project
  add(project: PROJECT) {
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
    stopOnCwd = crossPlatformPath(stopOnCwd);
    absoluteLocation = crossPlatformPath(absoluteLocation);
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
        absoluteLocation = crossPlatformPath(path.dirname(proj.location));
        continue;
      }
      break;
    }
    return projectsList as PROJECT[];
    //#endregion
  }

  allProjectsFromFolder(folderLocation: string): PROJECT[] {
    //#region @backendFunc
    return Helpers.foldersFrom(folderLocation, { recursive: false })
      .map(f => this.From(f))
      .filter(f => !!f) as PROJECT[];
    //#endregion
  }
  //#endregion

  private applyOverrideOrder<T>(
    sorted: T[],
    getName: (p: T) => string,
    overrideOrder: string[],
  ): T[] {
    if (!overrideOrder?.length) {
      return sorted;
    }

    const overrideSet = new Set(
      overrideOrder.map(o => o.trim()).filter(Boolean),
    );

    // Extract overridden projects (in topo order)
    const overridden = sorted.filter(p => overrideSet.has(getName(p)));

    if (!overridden.length) {
      return sorted;
    }

    // Remove overridden projects from original list
    const remaining = sorted.filter(p => !overrideSet.has(getName(p)));

    // Sort overridden projects according to overrideOrder
    const overriddenSorted = overrideOrder
      .map(name => overridden.find(p => getName(p) === name))
      .filter((p): p is T => !!p);

    // Find insertion index: where the first overridden project originally was
    const firstIndex = sorted.findIndex(p => overrideSet.has(getName(p)));

    // Rebuild final list
    return [
      ...remaining.slice(0, firstIndex),
      ...overriddenSorted,
      ...remaining.slice(firstIndex),
    ];
  }

  //#region fields & getters / sort group of projects
  public sortGroupOfProject<
    T extends BaseProject<any, any> = BaseProject<any, any>,
  >(
    projects: T[],
    resoveDepsArray: (proj: T) => string[],
    projNameToCompare: (proj: T) => string,
    overridePackagesOrder: string[] = [],
  ): T[] {
    const visited: { [key: string]: boolean } = {};
    const stack: { [key: string]: boolean } = {};
    const result: T[] = [];

    const visit = (project: T) => {
      if (stack[projNameToCompare(project)]) {
        // Circular dependency detected
        Helpers.error(
          `Circular dependency detected involving project: ${projNameToCompare(
            project,
          )}`,
        );
      }

      if (!visited[projNameToCompare(project)]) {
        visited[projNameToCompare(project)] = true;
        stack[projNameToCompare(project)] = true;

        const depsResolved = resoveDepsArray(project);
        depsResolved.forEach(dependency => {
          const dependentProject = projects.find(p => {
            // console.log(`comparing :"${projNameToCompare(p)}" and "${dependency}"`)
            return projNameToCompare(p) === dependency;
          });
          if (dependentProject) {
            visit(dependentProject);
          }
        });

        stack[projNameToCompare(project)] = false;
        result.push(project);
      }
    };

    projects.forEach(project => visit(project));

    return this.applyOverrideOrder(
      result,
      projNameToCompare,
      overridePackagesOrder,
    );
  }

  //#endregion
}
