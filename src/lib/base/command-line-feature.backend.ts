//#region imports
import { Helpers } from '../index';
import type { BaseProjectResolver } from './classes/base-project-resolver';
import { _, crossPlatformPath, path } from 'tnp-core/src';
import { BaseProject } from './classes/base-project';
import { CLASS } from 'typescript-class-helpers/src';
import { config } from 'tnp-config/src';
//#endregion

export abstract class CommandLineFeature<
  PARAMS extends { copyto?: string[]; copytoall?: boolean } = any,
  PROJECT extends BaseProject<any, any> = BaseProject,
> {
  /**
   * params from command line
   */
  protected params: PARAMS;

  protected __transformArgsBeforeResolvingParams__(args: string[]): string[] {
    const transformaed = args.map(a => {
      return a
        .replace(`--copyTo`, '--copyto')
        .replace(`copyTo`, '--copyto')
        .replace(`copyto`, '--copyto');
    });
    return transformaed;
  }

  /**
   * clean args without params from command line
   */
  protected args: string[];
  /**
   * first arg from args
   */
  get firstArg() {
    return _.first(this.args);
  }

  /**
   * last arg from args
   */
  get lastArg() {
    return _.last(this.args);
  }

  protected async __copytoProjects(): Promise<string[]> {
    //#region @backendFunc

    if (_.isString(this.params.copyto)) {
      this.params.copyto = [this.params.copyto];
    }
    if (typeof this.params.copyto === 'boolean' && this.params.copyto) {
      this.params.copyto =
        await this.project.libraryBuild.selectCopytoProjects();
      // console.log('sekeced',this.params.copyto)
    }
    const result = (this.params.copyto || [])
      .map(pathToSomething => {
        if (path.isAbsolute(pathToSomething)) {
          return crossPlatformPath(pathToSomething);
        }
        return crossPlatformPath([this.project.location, pathToSomething]);
      })
      .map(pathToSomething => {
        const proj = this.ins.From(pathToSomething);
        if (proj) {
          if (proj.linkedProjects?.embeddedProject) {
            return proj.linkedProjects.embeddedProject.location;
          }
          return proj.location;
        }
        return pathToSomething;
      })
      .map(pathToSomething => {
        if (pathToSomething.endsWith(`/${config.folder.node_modules}`)) {
          return pathToSomething;
        }
        return crossPlatformPath([pathToSomething, config.folder.node_modules]);
      })
      .filter(pathToSomething => {
        const exists = Helpers.exists(pathToSomething);
        // console.log(`exists: ${exists} for ${pathToSomething}`);
        return exists;
      });
    // console.log(result);
    return result;
    //#endregion
  }

  protected __project: PROJECT;
  protected get project(): PROJECT {
    return this.__project;
  }
  protected set project(v: PROJECT) {
    // if (!v) {
    //   Helpers.error(
    //     `Command line cannot be executed on folder that is not know project.`,
    //     false,
    //     true,
    //   );
    // }
    this.__project = v;
  }

  constructor(
    protected readonly argsWithParams: string,
    protected readonly methodNameToCall: string,
    /**
     * nearest project to cwd
     */
    project: PROJECT,
    /**
     * process.cwd()
     */
    protected cwd: string,
    protected ins: BaseProjectResolver<PROJECT>,
  ) {
    this.project = project;
    this.cwd = crossPlatformPath(cwd);
    //#region resolve params and args

    // this.project = Project.Current as Project;
    const className = CLASS.getNameFromObject(this as any);
    const methods = CLASS.getMethodsNames(this).filter(f => !f.startsWith('_'));
    // console.log({ className, methods })

    //#region methods names from prototype hack
    // const classFn = Object.getPrototypeOf(this).constructor;
    // console.log({ className, methods });
    // Object.defineProperty($Global.prototype.version, 'name', { value: 'version', writable: true });
    // HACK: to set name of global methods
    // TODO this will not survive minification
    // for (const classMethodsName of methods) {
    //   Object.defineProperty(classFn.prototype[classMethodsName], 'name', {
    //     value:
    //       classFn === '$Global' // TODO register alywas $Global as ''
    //         ? classMethodsName
    //         : `${className}.${classMethodsName}`,
    //     writable: false,
    //   });
    // }
    //#endregion

    const firstArg = _.first(argsWithParams.split(' '));
    const method = methods.find(m => m === firstArg);
    // console.log('className',className)
    if (method && !!className) {
      // this prevents taon reset develop => to run: taon develop
      methodNameToCall = method;
      argsWithParams = argsWithParams.split(' ').slice(1).join(' ');
      this.argsWithParams = argsWithParams;
    }

    this.params =
      require('minimist')(
        this.__transformArgsBeforeResolvingParams__(argsWithParams.split(' ')),
      ) || {};
    delete this.params['_']; // TODO quickfix
    const allArgsToClear = Object.keys(this.params);
    // console.log(this.params)
    // for (const deleteArgKey of allArgsToClear) {
    //   delete this.params[deleteArgKey];
    // }
    // console.log({ clearArgs: allArgsToClear })
    this.args = Helpers.cliTool
      .removeArgsFromCommand(argsWithParams, allArgsToClear)
      .split(' ')
      .filter(f => !!f);

    Helpers.runSyncOrAsync({
      functionFn: this.__initialize__,
      arrayOfParams: [this.params, this.project, this.args],
      context: this,
    }).then(() => {
      if (methodNameToCall) {
        if (_.isFunction(this[methodNameToCall])) {
          this[methodNameToCall](argsWithParams, this.project);
        } else {
          Helpers.error(
            `Class ${CLASS.getName(this as any)} doesn't have method '${methodNameToCall}'`,
            false,
            true,
          );
        }
      } else {
        this._();
      }
    });
    //#endregion
  }

  protected _exit(code = 0): void {
    process.exit(code);
  }

  protected __initialize__() {}

  _tryResolveChildIfInsideArg() {
    const {
      resolved,
      clearedCommand,
    } = // @ts-ignore
      Helpers.cliTool.resolveItemFromArgsBegin<PROJECT>(this.args, arg =>
        this.project.getChildBy(arg.replace(/\/$/, '')),
      );
    this.project = resolved ? resolved : this.project;
    this.args = resolved ? clearedCommand.split(' ') : this.args;
  }

  /**
   * method called when not using class methods
   */
  public abstract _();
}
