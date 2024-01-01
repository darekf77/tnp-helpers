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

  get dependencies() {
    return this.packageJSON?.dependencies;
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



  async assignFreePort(startFrom: number, howManyFreePortsAfterThatPort: number = 0): Promise<number> {
    //#region @backendFunc
    const max = 2000;
    let i = 0;
    while (takenPorts.includes(startFrom)) {
      startFrom += (1 + howManyFreePortsAfterThatPort);
    }
    while (true) {
      try {
        const port = await portfinder.getPortPromise({ port: startFrom });
        takenPorts.push(port);
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

