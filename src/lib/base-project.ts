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
import { BaseProjectResolver } from './base-project-resolver';


const Helpers = HelpersFiredev.Instance;
//#endregion

const takenPorts = [];


export class BaseProject<T = any>
  //#region @backend
  extends ProjectGit
//#endregion
{
  static ins = new BaseProjectResolver<BaseProject>(BaseProject);

  public static sortGroupOfProject<T extends BaseProject<any> = BaseProject<any>>(projects: T[], resoveDepsArray: (proj: T) => string[], projNameToCompare: (proj: T) => string): T[] {

    const visited: { [key: string]: boolean } = {};
    const stack: { [key: string]: boolean } = {};
    const result: T[] = [];

    const visit = (project: T) => {
      if (stack[projNameToCompare(project)]) {
        // Circular dependency detected
        Helpers.error(`Circular dependency detected involving project: ${projNameToCompare(project)}`);
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
    return result;
    // return result.reverse(); // Reverse the result to get the correct order
  }

  // public static sortGroupOfProject<T extends BaseProject<any> = BaseProject<any>>(projects: T[], resoveDepsArray: (proj: T) => string[], projNameToCompare: (proj: T) => string) {
  //   if (projects.length === 0) {
  //     return [];
  //   }
  //   let i = 0;
  //   let maxNoup = 0;
  //   let MAX_NO_UPDATE_IN_ROW = (projects.length + 1);
  //   let count = 1;
  //   while (true) {
  //     const res = projects[i];
  //     const updateTriggered = !_.isUndefined(projects.slice(i + 1).find((res2) => {
  //       const res2Name = projNameToCompare(res2);
  //       if (projNameToCompare(res) === res2Name) {
  //         return false;
  //       }
  //       const depsResolved = resoveDepsArray(res);
  //       if (!_.isUndefined(depsResolved.find(resovledName => resovledName === res2Name))) {
  //         // console.log(`+ ${res.name} has no dependency ${res2.name}`, 1)
  //         projects = Helpers.arrays.arrayMoveElementBefore<T>(projects, res2, res, 'location');
  //         return true;
  //       }
  //       return false;
  //     }));
  //     if (i === (projects.length - 1)) {
  //       i = 0;
  //     } else {
  //       i++;
  //     }

  //     if (updateTriggered) {
  //       console.log(`Sort(${++count})\n${projects.map(c => c.genericName).join('\n')}\n `, 1);
  //       maxNoup = 0;
  //       continue;
  //     } else {
  //       maxNoup++;
  //       console.log(`SORT NO UPDATE..`)
  //     }
  //     if (maxNoup === MAX_NO_UPDATE_IN_ROW) {
  //       break;
  //     }
  //   }

  //   return projects;
  // }
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

  /**
   * npm dependencies
   */
  get dependencies() {
    return (this.packageJSON ? this.packageJSON.dependencies : {}) || {};
  }

  /**
   * peerDependencies dependencies
   */
  get peerDependencies() {
    return (this.packageJSON ? this.packageJSON.peerDependencies : {}) || {};
  }

  /**
   * devDependencies dependencies
   */
  get devDependencies() {
    return (this.packageJSON ? this.packageJSON.devDependencies : {}) || {};
  }

  /**
   * resolutions dependencies
   */
  get resolutions() {
    return (this.packageJSON ? this.packageJSON['resolutions'] : {}) || {};
  }

  /**
   *  object with all deps from package json
   */
  get allDependencies(): { [packageName: string]: string } {
    return _.merge({
      ...this.devDependencies,
      ...this.peerDependencies,
      ...this.dependencies,
      ...this.resolutions
    }) as any;
  }

  get tnp() {
    return this.packageJSON?.tnp;
  }

  get firedev() {
    return this.packageJSON?.firedev;
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

  pathFor(relativePath: string | string[]) {
    //#region @backendFunc
    if (Array.isArray(relativePath)) {
      relativePath = relativePath.join('/');
    }
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

  linkNodeModulesTo(proj: Partial<BaseProject>) {
    //#region @backendFunc
    const source = this.pathFor(config.folder.node_modules);
    const dest = proj.pathFor(config.folder.node_modules);
    Helpers.remove(dest, true);
    Helpers.createSymLink(source, dest);
    //#endregion
  }

  reinstallNodeModules(forcerRemoveNodeModules = false) {
    //#region @backendFunc
    Helpers.taskStarted(`Reinstalling node_modules in ${this.genericName}`);
    const source = this.pathFor(config.folder.node_modules);
    if (forcerRemoveNodeModules) {
      Helpers.remove(source, true);
    }
    this.run('yarn install').sync();
    Helpers.taskDone(`Reinstalling done for ${this.genericName}`);
    //#endregion
  }


  async assignFreePort(startFrom: number = 4200, howManyFreePortsAfterThatPort: number = 0): Promise<number> {
    //#region @backendFunc
    if (_.isNumber(this.port) && this.port >= startFrom) {
      return startFrom;
    }
    const max = 2000;
    let i = 0;
    while (takenPorts.includes(startFrom)) {
      startFrom += (1 + howManyFreePortsAfterThatPort);
    }
    while (true) {

      try {
        const port = await portfinder.getPortPromise({ port: startFrom });
        takenPorts.push(port);
        // @ts-ignore
        this.port = port;
        return port;
      } catch (err) {
        console.log(err)
        Helpers.warn(`Trying to assign port  :${startFrom} but already in use.`, false);
      }
      startFrom += 1;
      if (i++ === max) {
        Helpers.error(`[firedev-helpers]] failed to assign free port after ${max} trys...`);
      }
    }
    //#endregion
  }


}

