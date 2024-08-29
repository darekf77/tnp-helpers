//#region imports
import { _, path } from 'tnp-core/src';
import { Helpers } from '../../index';
import { CLASS } from 'typescript-class-helpers/src';
import { config } from 'tnp-config/src';
import { LibTypeArr } from 'tnp-config/src';
import type { BaseProject } from '../../index';
//#region @backend
import { fse } from 'tnp-core/src';
import { CLI } from 'tnp-core/src';
//#endregion
//#endregion

export class HelpersCliTool {
  //#region resolve items from begin of args
  /**
   * Resolve projects or anything from begin of arguments string
   */
  public resolveItemsFromArgsBegin<T = any>(
    argumentsCommands: string | string[],
    argsResolveFunc: (currentArg: string, restOfArgs: string) => T,
    limit = Number.POSITIVE_INFINITY,
  ): {
    /**
     * arr of resolve things
     */
    allResolved: T[];
    /**
     * command cleared
     */
    clearedCommand: string;
  } {
    let tmpArgumentsCommands = argumentsCommands;
    const allResolved = [] as T[];
    if (_.isString(tmpArgumentsCommands)) {
      tmpArgumentsCommands = (tmpArgumentsCommands || '').trim().split(' ');
    }
    let clearedCommand = tmpArgumentsCommands || [];

    if (_.isArray(clearedCommand) && clearedCommand.length > 0) {
      while (true) {
        if (clearedCommand.length === 0) {
          break;
        }
        const argToCheckIfIsSomething = clearedCommand.shift();
        const resolvedSomething = argsResolveFunc(
          argToCheckIfIsSomething,
          clearedCommand.join(' '),
        );

        if (!_.isNil(resolvedSomething)) {
          allResolved.push(resolvedSomething);
          if (allResolved.length === limit) {
            break;
          }
          continue;
        }
        clearedCommand.unshift(argToCheckIfIsSomething);
        break;
      }
    } else {
      clearedCommand = [];
    }
    return { allResolved, clearedCommand: clearedCommand.join(' ') };
  }
  //#endregion

  //#region resolve item from begin of args
  public resolveItemFromArgsBegin<T>(
    argumentsCommands: string | string[],
    argsResolveFunc: (currentArg: string, restOfArgs: string) => T,
  ): {
    /**
     * resolve thing
     */
    resolved: T;
    /**
     * command cleared
     */
    clearedCommand: string;
  } {
    const { allResolved, clearedCommand } =
      Helpers.cliTool.resolveItemsFromArgsBegin(
        argumentsCommands,
        argsResolveFunc,
        1,
      );
    return { resolved: _.first(allResolved), clearedCommand };
  }
  //#endregion

  //#region clean command
  /**
   * remove params (as object) from command string
   */
  public cleanCommand<
    T extends { [k: string]: string | boolean | string[] | boolean[] },
  >(command: string | string[], minimistOption: T): string {
    const isArray = _.isArray(command);
    if (isArray) {
      command = (command as string[]).join(' ');
    }
    command = command as string;
    minimistOption = _.cloneDeep(minimistOption);
    delete minimistOption['_'];
    delete minimistOption['>'];
    if (!_.isString(command)) {
      command = '';
    }
    _.keys(minimistOption).forEach(paramName => {
      let value = minimistOption[paramName] as string[];
      if (!_.isArray(value)) {
        value = [value];
      }
      value
        .map(v => v.toString())
        .forEach(v => {
          [paramName, _.kebabCase(paramName), _.camelCase(paramName)].forEach(
            p => {
              command = (command as string)
                .replace(new RegExp(`\\-\\-${p}\\=${v}`, 'g'), '')
                .replace(new RegExp(`\\-\\-${p}\\ *${v}`, 'g'), '')
                .replace(new RegExp(`\\-\\-${p}`, 'g'), '');
            },
          );
        });
    });
    return command.trim() as string;
  }
  //#endregion

  //#region get minimist params from args
  /**
   * get minimist params from args
   */
  public getPramsFromArgs<T = object>(args: string | string[]): T {
    if (_.isArray(args)) {
      args = Helpers.cliTool
        .fixUnexpectedCommandCharacters(args.join(' '))
        .split(' ');
    }
    if (_.isString(args)) {
      args = Helpers.cliTool.fixUnexpectedCommandCharacters(args).split(' ');
    }

    const obj = require('minimist')(args || []) as any;
    Object.keys(obj).forEach(key => {
      const v = obj[key];
      if (v === 'true') {
        obj[key] = true;
      }
      if (v === 'false') {
        obj[key] = false;
      }
    });
    return (_.isObject(obj) ? obj : {}) as T;
  }
  //#endregion

  //#region remove start and end command
  /**
   * fix command unexpected characters
   */
  protected fixUnexpectedCommandCharacters(command: string): string {
    command = (command || '').trim();
    if (/^\"/.test(command) && /\"$/.test(command)) {
      command = command.replace(/^\"/, '').replace(/\"$/, '');
    }
    if (/^\'/.test(command) && /\'$/.test(command)) {
      command = command.replace(/^\'/, '').replace(/\'$/, '');
    }
    return command.trim();
  }
  //#endregion

  //#region match class/function to command
  /**
   * Check if your function name fits into command line param
   *
   * @param functionOrClassName name of function or class
   * @param restOfArgs arguments from command line
   * TODO REFACTOR
   */
  public match({
    functionOrClassName,
    restOfArgs,
    argsReplacements,
    classMethodsNames = [],
  }: {
    functionOrClassName: string;
    restOfArgs: string[];
    classMethodsNames?: string[];
    argsReplacements?: object;
  }): { isMatch: boolean; restOfArgs: string[]; methodNameToCall?: string } {
    const simplifiedCmd = (
      commandStringOrClass: string | Function,
      shortVersion = false,
    ) => {
      if (_.isFunction(commandStringOrClass)) {
        commandStringOrClass = CLASS.getName(commandStringOrClass);
      }
      if (!commandStringOrClass) {
        commandStringOrClass = '';
      }

      commandStringOrClass = _.kebabCase(commandStringOrClass as string)
        .replace(/\$/g, '')
        .replace(/\-/g, '')
        .replace(/\:/g, '')
        .replace(/\_/g, '')
        .toLowerCase();

      if (shortVersion) {
        const shortKey = Object.keys(argsReplacements).find(key => {
          const v = simplifiedCmd(argsReplacements[key]);
          return v.trim() === (commandStringOrClass as string).trim();
        });
        return shortKey;
      }

      return commandStringOrClass;
    };

    let isMatch = false;
    let methodNameToCall: string;
    let counter = 0;
    // console.log({ restOfArgs }) // TODO @LASTS
    isMatch = !_.isUndefined(
      [_.first(restOfArgs)]
        .filter(a => !a.startsWith('--')) // TODO fix this also for other special paramters
        .find((argumentCommand, i) => {
          if (++counter > 2) {
            // console.log(`counter NOT OK ${argumentCommand}`)
            return void 0;
          }
          // console.log(`counter ok for ${argumentCommand}`)
          const nameInKC = simplifiedCmd(functionOrClassName);
          const argInKC = simplifiedCmd(argumentCommand);

          let condition = nameInKC === argInKC;
          // console.log({ condition, nameInKC, argInKC, functionOrClassName })
          if (condition) {
            restOfArgs = _.slice(restOfArgs, i + 1, restOfArgs.length);
          } else {
            for (let index = 0; index < classMethodsNames.length; index++) {
              const classMethod = classMethodsNames[index];
              const nameMethodInKC = simplifiedCmd(nameInKC + classMethod);
              const conditionFunParam = nameMethodInKC === argInKC;
              // if (classMethod === 'pfix') {
              //   console.log({ conditionFunParam: condition, classMethod, argInKC, nameMethodInKC, functionOrClassName })
              // }
              if (conditionFunParam) {
                restOfArgs = _.slice(restOfArgs, i + 1, restOfArgs.length);
                methodNameToCall = classMethod;
                return true;
              }
            }
          }
          return condition;
        }),
    );
    return { isMatch, restOfArgs, methodNameToCall };
  }
  //#endregion

  //#region arguments parse
  //#region @backend
  /**
   * @todo TODO replace with funciton below
   * @deprecated
   */
  globalArgumentsParserTnp<Project extends BaseProject = BaseProject>(
    argsv: string[],
    ProjectClass?: Project,
  ) {
    Helpers.log(`[${config.frameworkName}] Fixing global arguments started...`);
    let options = require('minimist')(argsv);
    const toCheck = {
      tnpShowProgress: void 0,
      tnpNonInteractive: void 0,
      findNearestProject: void 0,
      findNearestProjectWithGitRoot: void 0,
      findNearestProjectType: void 0,
      findNearestProjectTypeWithGitRoot: void 0,
      cwd: void 0,
    };
    Object.keys(toCheck).forEach(key => {
      toCheck[key] = options[key];
    });
    options = _.cloneDeep(toCheck);
    let {
      tnpShowProgress,
      tnpNonInteractive,
      findNearestProject,
      findNearestProjectWithGitRoot,
      findNearestProjectType,
      findNearestProjectTypeWithGitRoot,
      cwd,
    } = options;

    Object.keys(options)
      .filter(key => key.startsWith('tnp'))
      .forEach(key => {
        options[key] = !!options[key];
        global[key] = options[key];
        // Helpers.log(`[start.backend] assigned to global: ${key}:${global[key]}`)
      });

    if (global['tnpNoColorsMode']) {
      CLI.chalk.level = 0;
    }

    let cwdFromArgs = cwd;
    const findProjectWithGitRoot =
      !!findNearestProjectWithGitRoot || !!findNearestProjectTypeWithGitRoot;

    if (_.isBoolean(findNearestProjectType)) {
      Helpers.error(
        `argument --findNearestProjectType ` +
          `needs to be library type:\n ${LibTypeArr.join(', ')}`,
        false,
        true,
      );
    }
    if (_.isBoolean(findNearestProjectTypeWithGitRoot)) {
      Helpers.error(
        `argument --findNearestProjectTypeWithGitRoot ` +
          `needs to be library type:\n ${LibTypeArr.join(', ')}`,
        false,
        true,
      );
    }

    if (!!findNearestProjectWithGitRoot) {
      findNearestProject = findNearestProjectWithGitRoot;
    }
    if (_.isString(findNearestProjectTypeWithGitRoot)) {
      findNearestProjectType = findNearestProjectTypeWithGitRoot;
    }

    if (_.isString(cwdFromArgs)) {
      if (findNearestProject || _.isString(findNearestProjectType)) {
        // Helpers.log('look for nearest')
        var nearest = ProjectClass.ins.nearestTo(cwdFromArgs, {
          type: findNearestProjectType,
          findGitRoot: findProjectWithGitRoot,
        });
        if (!nearest) {
          Helpers.error(
            `Not able to find neerest project for arguments: [\n ${argsv.join(',\n')}\n]`,
            false,
            true,
          );
        }
      }
      if (nearest) {
        cwdFromArgs = nearest.location;
      }
      if (
        fse.existsSync(cwdFromArgs) &&
        !fse.lstatSync(cwdFromArgs).isDirectory()
      ) {
        cwdFromArgs = path.dirname(cwdFromArgs);
      }
      if (
        fse.existsSync(cwdFromArgs) &&
        fse.lstatSync(cwdFromArgs).isDirectory()
      ) {
        process.chdir(cwdFromArgs);
      } else {
        Helpers.error(
          `[${config.frameworkName}] Incorrect --cwd argument ` +
            `for args: [\n ${argsv.join(',\n')}\n]`,
          false,
          true,
        );
      }
    }
    argsv = Helpers.cliTool.removeArg('findNearestProjectType', argsv);

    // process.exit(0)
    Object.keys(toCheck).forEach(argName => {
      argsv = Helpers.cliTool.removeArg(argName, argsv);
    });

    // Object
    //   .keys(global)
    //   .filter(key => key.startsWith('tnp'))
    //   .forEach(key => {
    //     Helpers.log(`globa.${key} = ${global[key]}`)
    //   })
    // Helpers.log('after remove', argsv)
    // process.exit(0)
    Helpers.log(`Fixing global arguments finish.`);
    return argsv.join(' ');
  }

  //#endregion
  //#endregion

  //#region remove argumetn from args array
  /**
   * @deprecated
   * replace with command below
   */
  removeArg(
    argumentToRemove: string,
    commandWithArgs: string[] | string,
  ): string[] {
    let argsv = Array.isArray(commandWithArgs)
      ? commandWithArgs
      : commandWithArgs.split(' ');
    argsv = argsv
      .filter((f, i) => {
        const regexString = `^\\-\\-(${argumentToRemove}$|${argumentToRemove}\\=)+`;
        if (new RegExp(regexString).test(f)) {
          const nextParam = argsv[i + 1];
          if (nextParam && !nextParam.startsWith(`--`)) {
            argsv[i + 1] = '';
          }
          return false;
        }
        return true;
      })
      .filter(f => !!f);
    return argsv;
  }

  public removeArgsFromCommand(commadWithArgs: string, argsToClear: string[]) {
    const argsObj = require('minimist')(commadWithArgs.split(' '));
    // console.log({ argsObj, argv: process.argv });
    for (let index = 0; index < argsToClear.length; index++) {
      const element = argsToClear[index];

      const value = argsObj[element];
      const replaceForV = v => {
        if (!v) {
          v = '';
        }
        v = `${v}`;
        commadWithArgs = commadWithArgs.replace(
          new RegExp(
            `\\-+${Helpers.escapeStringForRegEx(element)}\\s*${Helpers.escapeStringForRegEx(v)}`,
            'g',
          ),
          '',
        );
        commadWithArgs = commadWithArgs.replace(
          new RegExp(
            `\\-+${Helpers.escapeStringForRegEx(element)}\\=${Helpers.escapeStringForRegEx(v)}`,
            'g',
          ),
          '',
        );
      };
      if (_.isArray(value)) {
        for (let index = 0; index < value.length; index++) {
          replaceForV(value[index]);
        }
      } else {
        replaceForV(value);
      }

      commadWithArgs = commadWithArgs.replace(`--${element} true`, '');
      commadWithArgs = commadWithArgs.replace(`--${element} false`, '');
      commadWithArgs = commadWithArgs.replace(`--${element}=true`, '');
      commadWithArgs = commadWithArgs.replace(`--${element}=false`, '');
      commadWithArgs = commadWithArgs.replace(`--${element}`, '');
      commadWithArgs = commadWithArgs.replace(`-${element}`, '');
    }
    return commadWithArgs;
  }
  //#endregion
}
