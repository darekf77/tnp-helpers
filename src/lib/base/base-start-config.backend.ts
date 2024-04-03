//#region imports
import { config } from "tnp-config/src";
import { _, path } from 'tnp-core/src'
import { Helpers } from "../../index";
import type { CommandLineFeature } from "../../index";
import { BaseProject } from './base-project';
import { CLASS } from "typescript-class-helpers/src";
//#endregion

export type BaseStartConfigOptions = Partial<BaseStartConfig>;

export class BaseStartConfig {

  /**
   * @deprecated
   * use standard import / not default
   */
  public static prepareArgs(cliClassArr: { [funcionOrClassName: string]: Function; }[]) {
    const result = (cliClassArr.map(c => Object.values(c) as Function[]).reduce((a, b) => {
      return a.concat(b.map(funcOrClass => {
        return { classOrFnName: CLASS.getName(funcOrClass), funcOrClass } as any;
      }));
    }, []) as any as { classOrFnName: string; funcOrClass: Function }[]).sort((a, b) => {
      if (a.classOrFnName < b.classOrFnName) {
        return -1;
      }
      if (a.classOrFnName > b.classOrFnName) {
        return 1;
      }
      return 0;
    });
    return result;
  }

  public static prepareFromFiles(cliClassArr: string[]) {
    return this.prepareArgs(cliClassArr.map(c => require(path.resolve(c)).default).filter(f => _.isObject(f)));
  }

  public readonly argsv: string[] = process.argv;
  public readonly shortArgsReplaceConfig: { [shortCommand in string]: string; } = {};
  public readonly functionsOrClasses: { classOrFnName?: string; funcOrClass?: Function }[] = [];
  public readonly ProjectClass: Partial<typeof BaseProject> = BaseProject;
  public readonly callbackNotRecognizedCommand: () => any;
  /**
   * @deprecated
   */
  public readonly useStringArrForArgsFunctions: boolean;
  constructor(options: BaseStartConfigOptions) {

    options = options ? options : {};
    for (const key in options) {
      if (Object.prototype.hasOwnProperty.call(options, key)) {
        const value = options[key];
        if (value) {
          this[key] = value;
        }
      }
    }


    const commandArgIndex = 0;
    const commandArg = this.argsv[commandArgIndex];
    if (commandArg && !commandArg.startsWith('-')) {
      const longerCommandVersion = this.shortArgsReplaceConfig[commandArg];
      if (longerCommandVersion) {
        this.argsv[commandArgIndex] = longerCommandVersion;
      }

    }

    let recognized = null;
    let restOfArgs = [];
    let methodNameToCall = undefined;
    let methods = [];

    for (const { classOrFnName, funcOrClass } of this.functionsOrClasses) {
      if (_.isFunction(funcOrClass)) {
        const classMethodsNames = CLASS.getMethodsNames(funcOrClass).filter(f => !f.startsWith('_'));
        // if (vFnName === '') {
        // console.log({ classMethodsNames, vFnName })
        // }

        const check = Helpers.cliTool.match({
          functionOrClassName: classOrFnName,
          restOfArgs: this.argsv,
          argsReplacements: this.shortArgsReplaceConfig,
          classMethodsNames,
        });
        if (check.isMatch || (this.argsv.length === 0 && classOrFnName === '')) {
          recognized = funcOrClass;
          restOfArgs = check.restOfArgs;
          methodNameToCall = check.methodNameToCall;
          methods = classMethodsNames;
          // console.log('--- recognized command ---', { classOrFnName, classMethodsNames })
        }
      }
    }


    if (recognized) {
      global?.spinner?.stop();
      // console.log('--- recognized command ---', { recognized, methodNameToCall, restOfArgs, methods })


      if (Helpers.isClass(recognized)) {
        // console.log('USING FROM CLASS')
        const obj: CommandLineFeature = new (recognized as any)(
          Helpers.cliTool.globalArgumentsParserTnp(restOfArgs),
          methodNameToCall,
          this.ProjectClass.ins.nearestTo(process.cwd()),
          process.cwd(),
        );
      } else {
        // console.log('USING FROM FUNCTION')
        if (this.useStringArrForArgsFunctions) {
          recognized.apply({}, [Helpers.cliTool.globalArgumentsParserTnp(restOfArgs, this.ProjectClass as any).split(' ')]);
        } else {
          recognized.apply({}, [Helpers.cliTool.globalArgumentsParserTnp(restOfArgs, this.ProjectClass as any)]);
        }
      }

      process.stdin.resume();
    } else {
      if (_.isFunction(this.callbackNotRecognizedCommand)) {
        this.callbackNotRecognizedCommand();
      } else {
        Helpers.error('Command not recognized', false, true);
      }

    }
  }

  quickFixes() {

  }

  handleGLobalArguments() {

  }

}
