//#region import
//#region @backend
import { fse, RunOptions, portfinder } from 'tnp-core';
export { ChildProcess } from 'child_process';
import { ProjectGit } from './git-project';
import { CommandOutputOptions } from 'tnp-core';
//#endregion
import { CLI } from 'tnp-cli';
import { path, crossPlatformPath } from 'tnp-core';
import { config } from 'tnp-config';
import { _ } from 'tnp-core';
import { HelpersFiredev } from './helpers';
import { Models } from 'tnp-models';

const Helpers = HelpersFiredev.Instance;
//#endregion

const takenPorts = [];

export class BaseProjectResolver<T> {
  //#region class body
  protected readonly NPM_PROJECT_KEY = 'npm';
  protected projects: (T & BaseProject)[] = [];
  protected emptyLocations: string[] = [];
  constructor(protected classFn: any) { }
  get allowedTypes(): string[] {
    //#region @websqlFunc
    return [this.NPM_PROJECT_KEY];
    // throw `Please override this getter [allowedTypes] in your child class or  ${CLI.chalk.bold(config.frameworkName)}`;
    //#endregion
  }

  get Current(): T {
    //#region @websqlFunc
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
  typeFrom<T>(location: string): string {
    //#region @backendFunc
    if (Helpers.exists(crossPlatformPath([location, config.file.package_json]))) {
      return this.NPM_PROJECT_KEY;
    }
    // throw `Please override this function [typeFrom] in your child class or  ${CLI.chalk.bold(config.frameworkName)}`;
    //#endregion
  }


  From(locationOfProject: string | string[]): T {
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
      resultProject.basename = path.basename(location);
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
      project = this.From(absoluteLocation) as any;
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


export class BaseProject<T = any>
  //#region @backend
  extends ProjectGit
//#endregion
{
  static ins = new BaseProjectResolver<BaseProject>(BaseProject);
  readonly ins: BaseProjectResolver<T>;
  /**
   * it do not need to be realt path
   */
  readonly location: string;
  readonly basename: string;
  get name() {
    return this.packageJSON?.name;
  }
  readonly type: string;
  get version() {
    return this.packageJSON?.version;
  }
  protected readonly packageJSON: Models.npm.IPackageJSON;
  /**
   * only available after executing *this.assignFreePort()*
   */
  readonly port: string;


  get parent(): T {
    //#region @websqlFunc
    return this.ins.From(path.join(this.location, '..'));
    //#endregion
  }

  get genericName() {
    //#region @websqlFunc
    let parent = this.parent as any as BaseProject;
    return [
      parent ? path.basename(path.dirname(parent.location)) : void 0,
      parent ? parent.basename : path.basename(this.location),
      this.basename,
      //#region @backend
      `(${CLI.chalk.bold(this.name)})`,
      //#endregion
    ]
      .filter(f => !!f)
      .join('/')
    //#endregion
  }

  /**
   * try run but continue when it fails
   * @param command
   * @param options
   * @returns
   */
  tryRunSync(command: string
    //#region @backend
    , options?: Omit<RunOptions, 'cwd'>
    //#endregion
  ): void {
    //#region @backendFunc
    try {
      this.run(command, options).sync();
    } catch (error) {
      Helpers.warn(`Not able to execute: ${command}`)
    }
    //#endregion
  }

  pathFor(relativePath: string) {
    //#region @backendFunc
    if (path.isAbsolute(relativePath)) {
      Helpers.error(`Cannot join relative path with absolute: ${relativePath}`);
    }
    return crossPlatformPath(path.join(this.location, relativePath))
    //#endregion
  }

  writeJson(relativePath: string, json: object) {
    //#region @backendFunc
    if (path.isAbsolute(relativePath)) {
      Helpers.error(`Cannot join relative path with absolute: ${relativePath}`);
    }
    Helpers.writeJson(crossPlatformPath([this.location, relativePath]), json);
    //#endregion
  }


  run(command: string
    //#region @backend
    , options?: Omit<RunOptions, 'cwd'>
    //#endregion
  ) {
    //#region @backendFunc
    let opt = options as RunOptions;
    if (!opt) { opt = {} as any; }
    if (!opt.cwd) { opt.cwd = this.location; }
    return Helpers.run(command, opt);
    //#endregion
  }

  outputFrom(command: string
    //#region @backend
    , options?: CommandOutputOptions
    //#endregion
  ) {
    //#region @backendFunc
    return Helpers.commnadOutputAsString(command, this.location, options);
    //#endregion
  }

  remove(relativePath: string, exactPath = true) {
    //#region @backendFunc
    return Helpers.remove([this.location, relativePath], exactPath);
    //#endregion
  }

  async assignFreePort(startFrom: number = 4200): Promise<Number> {
    //#region @backendFunc
    if (_.isNumber(this.port) && this.port >= startFrom) {
      return startFrom;
    }
    const max = 2000;
    let i = 0;
    while (takenPorts.includes(startFrom)) {
      startFrom += 1;
    }
    while (true) {
      try {
        const port = await portfinder.getPortPromise({ port: startFrom });
        takenPorts.push(port);
        // @ts-ignore
        this.port = port;
        return port;
      } catch (err) {
        Helpers.warn(`Trying to assign port  :${startFrom} but already in use.`, false);
      }
      if (i++ === max) {
        Helpers.error(`[firedev-helpers]] failed to assign free port after ${max} trys...`);
      }
    }
    //#endregion
  }


}

