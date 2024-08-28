//#region imports
import { config } from 'tnp-config/src';
import { _, path } from 'tnp-core/src';
import { Helpers } from '../../index';
import type { CommandLineFeature } from '../../index';
import { BaseProject } from './base-project';
import { CLASS } from 'typescript-class-helpers/src';
//#endregion

export type BaseStartConfigOptions = Partial<BaseStartConfig>;

export class BaseStartConfig {
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

  public static prepareFromFiles(cliClassArr: string[]) {
    return this.prepareArgs(
      cliClassArr
        .map(c => require(path.resolve(c)).default)
        .filter(f => _.isObject(f)) as any,
    );
  }

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

    if (
      this.argsv?.length >= 3 &&
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
    if (commandArg && !commandArg.startsWith('-')) {
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

        const check = Helpers.cliTool.match({
          functionOrClassName: classOrFnName,
          restOfArgs: _.cloneDeep(this.argsv),
          argsReplacements: this.shortArgsReplaceConfig,
          classMethodsNames,
        });
        if (
          check.isMatch ||
          (this.argsv.length === 0 && classOrFnName === '')
        ) {
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
      // console.log('--- recognized command ---', { recognizedClassFnOrFunction, methodNameToCall, restOfArgs, methodsOfRecognizedClass })

      if (Helpers.isClass(recognizedClassFnOrFunction)) {
        // console.log('USING FROM CLASS')
        const obj: CommandLineFeature =
          new (recognizedClassFnOrFunction as any)(
            Helpers.cliTool.globalArgumentsParserTnp(restOfArgs),
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
              .globalArgumentsParserTnp(restOfArgs, this.ProjectClass as any)
              .split(' '),
          ]);
        } else {
          recognizedClassFnOrFunction.apply({}, [
            Helpers.cliTool.globalArgumentsParserTnp(
              restOfArgs,
              this.ProjectClass as any,
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
              const obj: CommandLineFeature =
                new (globalClassForGlobalCommands as any)(
                  Helpers.cliTool.globalArgumentsParserTnp(this.argsv),
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
        Helpers.error('Command not recognized', false, true);
      }
    }
  }

  quickFixes() {}

  handleGLobalArguments() {}
}
