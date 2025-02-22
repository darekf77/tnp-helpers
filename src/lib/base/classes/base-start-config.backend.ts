//#region imports
import { config } from 'tnp-config/src';
import { _, path } from 'tnp-core/src';
import { Helpers } from '../../index';
import type { BaseCommandLineFeature } from '../../index';
import { BaseProject } from './base-project';
import { CLASS } from 'typescript-class-helpers/src';
//#endregion

export type BaseStartConfigOptions = Partial<BaseStartConfig>;

export class BaseStartConfig {
  //#region prepareArgs
  /**
   * @deprecated
   * use standard import / not default
   */
  public static prepareArgs(
    cliClassArr: { [funcionOrClassName: string]: Function }[],
  ) {
    const result = (
      cliClassArr
        .map(c => Object.values(c) as Function[])
        .reduce((a, b) => {
          return a.concat(
            b.map(funcOrClass => {
              return {
                classOrFnName: CLASS.getName(funcOrClass),
                funcOrClass,
              } as any;
            }),
          );
        }, []) as any as { classOrFnName: string; funcOrClass: Function }[]
    ).sort((a, b) => {
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
  //#endregion

  //#region prepareFromFiles
  public static prepareFromFiles(cliClassArr: string[]) {
    return this.prepareArgs(
      cliClassArr
        .map(c => require(path.resolve(c)).default)
        .filter(f => _.isObject(f)) as any,
    );
  }
  //#endregion

  //#region fields
  public readonly argsv: string[] = process.argv;
  public readonly shortArgsReplaceConfig: { [shortCommand in string]: string } =
    {};
  public readonly functionsOrClasses: {
    classOrFnName?: string;
    funcOrClass?: Function;
  }[] = [];
  public readonly ProjectClass: Partial<typeof BaseProject> = BaseProject;
  public readonly callbackNotRecognizedCommand: (options?: {
    runGlobalCommandByName?: (commandName: string) => void;
    firstArg?: string;
  }) => any;
  /**
   * @deprecated
   */
  public readonly useStringArrForArgsFunctions: boolean;
  //#endregion

  //#region constructor
  constructor(options: BaseStartConfigOptions) {
    if (!Helpers.isSupportedTaonTerminal) {
      Helpers.error(
        `This terminal is not supported. Please use:

      - git bash (on windows)

      `,
        false,
        true,
      );
    }

    options = options ? options : {};
    for (const key in options) {
      if (Object.prototype.hasOwnProperty.call(options, key)) {
        const value = options[key];
        if (value) {
          this[key] = value;
        }
      }
    }

    for (let index = 0; index < this.argsv.length; index++) {
      const arg = this.argsv[index];
      if (arg.endsWith('-debug-brk')) {
        this.argsv[index] = arg.replace(/\-debug\-brk$/, '');
      }
      if (arg.endsWith('-debug')) {
        this.argsv[index] = arg.replace(/\-debug$/, '');
      }
    }

    if (
      this.argsv?.length >= 2 &&
      (this.argsv[0].endsWith('bin/node') ||
        this.argsv[0].endsWith('bin\\node') ||
        this.argsv[0].endsWith('bin\\\\node') ||
        this.argsv[0].endsWith('\\\\node.exe') ||
        this.argsv[0].endsWith('\\node.exe'))
    ) {
      this.argsv = this.argsv.slice(2);
    }
    const commandArgIndex = 0;
    const commandArg = this.argsv[commandArgIndex];
    if (commandArg) {
      const longerCommandVersion = this.shortArgsReplaceConfig[commandArg];
      if (longerCommandVersion) {
        this.argsv[commandArgIndex] = longerCommandVersion;
      }
    }

    let recognizedClassFnOrFunction = null;
    let restOfArgs = [];
    let methodNameToCall = undefined;
    let methodsOfRecognizedClass = [];
    let globalClassForGlobalCommands = null;

    for (const { classOrFnName, funcOrClass } of this.functionsOrClasses) {
      if (_.isFunction(funcOrClass)) {
        const classMethodsNames = CLASS.getMethodsNames(funcOrClass).filter(
          f => !f.startsWith('_'),
        );
        if (classOrFnName === '') {
          globalClassForGlobalCommands = funcOrClass;
        }

        if (this.argsv.length === 0 && classOrFnName === '') {
          recognizedClassFnOrFunction = funcOrClass;
          restOfArgs = [];
          methodNameToCall = '';
          methodsOfRecognizedClass = classMethodsNames;
          break;
        }

        const check = Helpers.cliTool.match({
          functionOrClassName: classOrFnName,
          restOfArgs: _.cloneDeep(this.argsv),
          argsReplacements: this.shortArgsReplaceConfig,
          classMethodsNames,
        });
        if (check.isMatch) {
          recognizedClassFnOrFunction = funcOrClass;
          restOfArgs = _.cloneDeep(check.restOfArgs);
          methodNameToCall = check.methodNameToCall;
          methodsOfRecognizedClass = classMethodsNames;
          // console.log('--- recognized command ---', { classOrFnName, classMethodsNames })
        }
      }
    }

    if (recognizedClassFnOrFunction) {
      global?.spinner?.stop();
      // console.log('--- recognized command ---', {
      //   recognizedClassFnOrFunction,
      //   methodNameToCall,
      //   restOfArgs,
      //   methodsOfRecognizedClass,
      // });

      if (Helpers.isClass(recognizedClassFnOrFunction)) {
        // console.log('USING FROM CLASS')
        const obj: BaseCommandLineFeature =
          new (recognizedClassFnOrFunction as any)(
            Helpers.cliTool.globalArgumentsParserTnp(
              restOfArgs,
              this.ProjectClass,
            ),
            methodNameToCall,
            this.ProjectClass.ins.nearestTo(process.cwd()),
            process.cwd(),
            this.ProjectClass.ins,
          );
      } else {
        // console.log('USING FROM FUNCTION')
        if (this.useStringArrForArgsFunctions) {
          recognizedClassFnOrFunction.apply({}, [
            Helpers.cliTool
              .globalArgumentsParserTnp(restOfArgs, this.ProjectClass)
              .split(' '),
          ]);
        } else {
          recognizedClassFnOrFunction.apply({}, [
            Helpers.cliTool.globalArgumentsParserTnp(
              restOfArgs,
              this.ProjectClass,
            ),
          ]);
        }
      }

      process.stdin.resume();
    } else {
      if (_.isFunction(this.callbackNotRecognizedCommand)) {
        // console.log(`this.argsv `, this.argsv)
        this.callbackNotRecognizedCommand({
          firstArg: _.first(this.argsv),
          runGlobalCommandByName: (commandName: string) => {
            if (globalClassForGlobalCommands) {
              const obj: BaseCommandLineFeature =
                new (globalClassForGlobalCommands as any)(
                  Helpers.cliTool.globalArgumentsParserTnp(
                    this.argsv,
                    this.ProjectClass,
                  ),
                  commandName,
                  this.ProjectClass.ins.nearestTo(process.cwd()),
                  process.cwd(),
                  this.ProjectClass.ins,
                );
            } else {
              Helpers.error(
                `Global class for global commands not found`,
                false,
                true,
              );
            }
          },
        });
      } else {
        Helpers.error(
          `[${config.frameworkName}] Command not recognized`,
          false,
          true,
        );
      }
    }
  }
  //#endregion
}
