//#region imports

import { ChildProcess, exec } from 'child_process';
import { createHash } from 'crypto'; // @backend
import { promisify } from 'util'; // @backend

import type { BuildOptions } from 'esbuild';
import type { CopyOptionsSync } from 'fs-extra';
import * as ini from 'ini';
import { Log, Level } from 'ng2-logger/src';
import simpleGit from 'simple-git';
import * as Task from 'task.js';
import {
  BaselineSiteJoinprefix,
  glob,
  isElevated as isElevatedCore,
  spawn,
  UtilsFilesFoldersSync,
} from 'tnp-core/src';
import { os } from 'tnp-core/src';
import { Utils, UtilsNetwork } from 'tnp-core/src';
import { CLI } from 'tnp-core/src';
import { CoreModels } from 'tnp-core/src';
import { config } from 'tnp-core/src';
import {
  _,
  path,
  rimraf,
  fse,
  child_process,
  crossPlatformPath,
  dateformat,
} from 'tnp-core/src';
import { UtilsOs, UtilsTerminal } from 'tnp-core/src';
import { Helpers } from 'tnp-core/src';
import { BaseProject } from 'tnp-helpers/src';
import { CLASS } from 'typescript-class-helpers/src';

import { UtilsQuickFixes, UtilsTypescript } from '../utils';
export { Helpers } from 'tnp-core/src';
//#endregion

const log = Log.create('HelpersTaon', Level.__NOTHING);

//#region models
export interface GetRecrusiveFilesFromOptions {}
//#endregion

export namespace HelpersTaon {
  //#region cli tools
  export namespace cliTool {
    export const resolveItemsFromArgsBegin = <T = any>(
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
    } => {
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
    };
    export const resolveItemFromArgsBegin = <T = any>(
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
    } => {
      const { allResolved, clearedCommand } =
        HelpersTaon.cliTool.resolveItemsFromArgsBegin(
          argumentsCommands,
          argsResolveFunc,
          1,
        );
      return { resolved: _.first(allResolved), clearedCommand };
    };
    export const cleanCommand = <T = any>(
      command: string | string[],
      minimistOption: T,
    ): string => {
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
    };
    export const getPramsFromArgs = <T = any>(args: string | string[]): T => {
      //#region @backendFunc
      if (_.isArray(args)) {
        args = HelpersTaon.cliTool
          .fixUnexpectedCommandCharacters(args.join(' '))
          .split(' ');
      }
      if (_.isString(args)) {
        args = HelpersTaon.cliTool
          .fixUnexpectedCommandCharacters(args)
          .split(' ');
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
      //#endregion
    };
    export const fixUnexpectedCommandCharacters = (command: string): string => {
      command = (command || '').trim();
      if (/^\"/.test(command) && /\"$/.test(command)) {
        command = command.replace(/^\"/, '').replace(/\"$/, '');
      }
      if (/^\'/.test(command) && /\'$/.test(command)) {
        command = command.replace(/^\'/, '').replace(/\'$/, '');
      }
      return command.trim();
    };
    export const match = ({
      functionOrClassName,
      restOfArgs,
      argsReplacements,
      classMethodsNames = [],
    }: {
      functionOrClassName: string;
      restOfArgs: string[];
      classMethodsNames?: string[];
      argsReplacements?: object;
    }): {
      isMatch: boolean;
      restOfArgs: string[];
      methodNameToCall?: string;
    } => {
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
    };
    export const globalArgumentsParserTnp = (
      argsv: string[],
      ProjectClass: Partial<typeof BaseProject>,
    ) => {
      //#region @backendFunc
      Helpers.log(
        `[${config.frameworkName}] Fixing global arguments started...`,
      );
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
            `needs to be library type:\n ${CoreModels.BaseProjectTypeArr.join(', ')}`,
          false,
          true,
        );
      }
      if (_.isBoolean(findNearestProjectTypeWithGitRoot)) {
        Helpers.error(
          `argument --findNearestProjectTypeWithGitRoot ` +
            `needs to be library standalone or container project`,
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
      argsv = HelpersTaon.cliTool.removeArg('findNearestProjectType', argsv);
      // process.exit(0)
      Object.keys(toCheck).forEach(argName => {
        argsv = HelpersTaon.cliTool.removeArg(argName, argsv);
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
      //#endregion
    };
    export const removeArg = (
      argumentToRemove: string,
      commandWithArgs: string[] | string,
    ): string[] => {
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
    };
    export const removeArgsFromCommand = (
      commadWithArgs: string,
      argsToClear: string[],
    ) => {
      //#region @backendFunc
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
              `\\-+${Utils.escapeStringForRegEx(element)}\\s*${Utils.escapeStringForRegEx(v)}`,
              'g',
            ),
            '',
          );
          commadWithArgs = commadWithArgs.replace(
            new RegExp(
              `\\-+${Utils.escapeStringForRegEx(element)}\\=${Utils.escapeStringForRegEx(v)}`,
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
      //#endregion
    };
  }
  //#endregion

  //#region console gui
  export namespace consoleGui {
    export namespace question {
      export const yesNo = async (questionMessage: string) => {
        return await Helpers.questionYesNo(questionMessage);
      };
    }

    export const select = async <T = string>(
      questionMessage: string,
      choices:
        | {
            name: string;
            value: T;
          }[]
        | {
            [choice: string]: {
              name: string;
            };
          },
      autocomplete?: boolean,
    ): Promise<T> => {
      if (autocomplete) {
        return (await HelpersTaon.selectChoicesAsk(
          questionMessage,
          choices,
        )) as T;
      }
      return (await HelpersTaon.list(questionMessage, choices)) as T;
    };
    export const multiselect = async (
      questionMessage: string,
      choices: {
        name: string;
        value: string;
      }[],
      autocomplete?: boolean,
      selected?: {
        name: string;
        value: string;
      }[],
    ) => {
      return UtilsTerminal.multiselect({
        autocomplete,
        choices,
        question: questionMessage,
        defaultSelected: (selected || []).map(s => s.value),
      });
    };
    export const wait = async (howManySecondsWait: number) => {
      await Helpers.wait(howManySecondsWait);
    };
    export const pressAnyKey = async (
      message = 'Press enter to continue..',
    ) => {
      await HelpersTaon.pressKeyAndContinue(message);
    };
  }
  //#endregion

  //#region git
  export namespace git {
    const tempGitCommitMsgFile = 'tmp-git-commit-name.txt';
    export const tagAndPushToGitRepo = async (
      cwd: string,
      options: {
        newVersion: string;
        autoReleaseUsingConfig: boolean;
        isCiProcess: boolean;
        skipTag?: boolean; // if true, it will not tag the commit
      },
    ): Promise<void> => {
      //#region @backendFunc
      const { newVersion, autoReleaseUsingConfig, isCiProcess } = options;
      const tagName = `v${newVersion}`;
      stageAllAndCommit(cwd, `release: ${tagName}`);
      const tagMessage = 'new version ' + newVersion;
      if (!options.skipTag) {
        try {
          Helpers.run(`git tag -a ${tagName} ` + `-m "${tagMessage}"`, {
            cwd,
            output: false,
          }).sync();
        } catch (error) {
          throw new Error(`Not able to tag project`);
        }
      }
      // const lastCommitHash = project.git.lastCommitHash();
      // project.packageJson.setBuildHash(lastCommitHash);
      if (
        autoReleaseUsingConfig ||
        (await UtilsTerminal.confirm({
          message:
            `Push changes to git repo ` +
            `(${HelpersTaon.git.getOriginURL(cwd)}#${HelpersTaon.git.currentBranchName(cwd)}) ?`,
          defaultValue: true,
        }))
      ) {
        Helpers.log('Pushing to git repository... ');
        Helpers.log(`Git branch: ${currentBranchName(cwd)}`);
        if (
          !(await pushCurrentBranch(cwd, {
            askToRetry: !isCiProcess,
          }))
        ) {
          throw `Not able to push to git repository`;
        }
        Helpers.info('Pushing to git repository done.');
      }
      //#endregion
    };
    export const getAllTags = async (cwd: string) => {
      //#region @backendFunc
      const git = simpleGit(cwd);
      try {
        const tags = await git.tags();
        return tags.all; // array of tag names
      } catch (error) {
        console.error('Failed to fetch tags:', error);
        return [];
      }
      //#endregion
    };
    export const isValidRepoUrl = (url: string): boolean => {
      const regex =
        /^([A-Za-z0-9]+@|http(|s)\:\/\/)([A-Za-z0-9.]+(:\d+)?)(?::|\/)([\d\/\w.-]+?)(\.git)?$/;
      const res = regex.test(url);
      return res;
    };
    export const removeTag = (cwd: string, tagName: string) => {
      //#region @backendFunc
      try {
        child_process.execSync(`git tag -d ${tagName}`, { cwd });
        Helpers.info(`Tag "${tagName}" removed successfully.`);
      } catch (error) {
        Helpers.warn(
          `[${config.frameworkName}-helpers] not able to remove tag ${tagName} in ${cwd}`,
          true,
        );
      }
      //#endregion
    };
    export const getACTION_MSG_RESET_GIT_HARD_COMMIT = () => {
      return '$$$ update $$$';
    };
    export const lastCommitHash = (cwd): string => {
      Helpers.log('[taon-helpers][lastcommithash] ' + cwd, 1);
      try {
        let hash =
          isInsideGitRepo(cwd) &&
          child_process
            .execSync(`git log -1 --format="%H"`, { cwd })
            .toString()
            .trim();
        return hash;
      } catch (e) {
        Helpers.log(e, 1);
        Helpers.log(
          `[taon-helpers][lastCommitHash] Not able to get last commit hash for repository in ${cwd}`,
          1,
        );
        return null;
      }
    };
    export const penultimateCommitHash = (cwd): string => {
      Helpers.log('[penultimateCommitHash] ' + cwd, 1);
      try {
        let hash =
          isInsideGitRepo(cwd) &&
          child_process
            .execSync(`git log -2 --format="%H"`, { cwd })
            .toString()
            .trim();
        return hash;
      } catch (e) {
        Helpers.log(e, 1);
        Helpers.log(
          `[lastCommitHash] Not able to get last commit hash for repository in ${cwd}`,
          1,
        );
        return null;
      }
    };
    export const checkTagExists = (
      tag: string,
      cwd = process.cwd(),
    ): boolean => {
      Helpers.log('[checkTagExists] ' + cwd, 1);
      if (!HelpersTaon.git.hasAnyCommits(cwd)) {
        return false;
      }
      const command = `git show-ref --tags ${tag}`.trim();
      const result = (Helpers.commandOutputAsString(command, cwd) || '') !== '';
      return result;
    };
    export const lastTagVersionName = (cwd: string): string => {
      Helpers.log('[lastTagVersionName] ' + cwd, 1);
      if (!HelpersTaon.git.hasAnyCommits(cwd)) {
        return '';
      }
      try {
        if (process.platform === 'win32' && UtilsOs.isRunningInWindowsCmd()) {
          let tagOnCMd = Helpers.commandOutputAsString(
            `for /f %i in ('git rev-list --tags --max-count=1') do @git describe --tags %i`,
          );
          console.log({ tagOnCMd });
          tagOnCMd = tagOnCMd.toString().trim();
          return tagOnCMd ? tagOnCMd : '';
        }
        const latestCommit = Helpers.commandOutputAsString(
          `git rev-list --tags --max-count=1`,
          cwd,
        )
          .toString()
          .trim();
        if (!latestCommit) {
          return '';
        }
        const tag = Helpers.commandOutputAsString(
          `git describe --tags ${latestCommit}`,
          cwd,
        )
          .toString()
          .trim();
        if (!tag) {
          return '';
        }
        return tag;
      } catch (e) {
        Helpers.warn(
          `[lastCommitHash] Not able to get last commit version name for repository in ${cwd}`,
          false,
        );
        return '';
      }
    };
    export const lastTagNameForMajorVersion = (
      cwd,
      majorVersion: string,
    ): string => {
      Helpers.log(
        '[taon-helpers][lastTagNameForMajorVersion] ' +
          cwd +
          '  major ver:' +
          majorVersion,
      );
      const tag = HelpersTaon.git.lastTagVersionName(cwd);
      if (!tag) {
        return '';
      }
      // git describe --match "v1.1.*" --abbrev=0 --tags $(git rev-list --tags --max-count=1)
      let tagName: string;
      const cm1 =
        `git describe --match "v${majorVersion.toString().replace('v', '')}.*" ` +
        `--abbrev=0 `;
      const cm2 =
        `git describe --match "v${majorVersion.toString().replace('v', '')}.*" ` +
        `--abbrev=0 --tags $(git rev-list --tags --max-count=1)`;
      const cm3 =
        `git describe --match "${majorVersion.toString().replace('v', '')}.*" ` +
        `--abbrev=0`;
      const cm4 =
        `git describe --match "${majorVersion.toString().replace('v', '')}.*" ` +
        `--abbrev=0 --tags $(git rev-list --tags --max-count=1)`;
      // console.log({
      //   cm1, cm2, cm3, cm4
      // })
      try {
        if (process.platform === 'win32') {
          tagName = child_process.execSync(cm1, { cwd }).toString().trim();
        } else {
          tagName = child_process.execSync(cm2, { cwd }).toString().trim();
        }
        if (tagName) {
          return tagName;
        }
      } catch (e) {
        Helpers.warn(
          `[taon-helpers][lastTagNameForMajorVersion] Not able to get last tag hash` +
            ` for major version ${majorVersion} for repository in ${cwd}`,
        );
      }
      try {
        if (process.platform === 'win32') {
          tagName = child_process.execSync(cm3, { cwd }).toString().trim();
        } else {
          tagName = child_process.execSync(cm4, { cwd }).toString().trim();
        }
        if (tagName) {
          return tagName;
        }
      } catch (e) {
        Helpers.warn(
          `[taon-helpers][lastTagNameForMajorVersion] Not able to get last tag hash` +
            ` for major version ${majorVersion} for repository in ${cwd}`,
        );
      }
      return '';
    };
    export const getListOfCurrentGitChanges = (
      cwd: string,
    ): {
      modified: string[];
      deleted: string[];
      created: string[];
    } => {
      //#region @backendFunc
      try {
        // Execute git status command to get the list of changes
        const output = Helpers.commandOutputAsString(
          'git status --porcelain',
          cwd,
          {
            biggerBuffer: true,
          },
        );
        // Split the output into lines
        const lines = output.trim().split('\n');
        // Initialize arrays to hold modified, deleted, and untracked files
        let modifiedFiles = [] as string[];
        let deletedFiles = [] as string[];
        let createdFiles = [] as string[];
        // Process each line to determine the type of change
        lines.forEach(line => {
          const [changeType, filePath] = line.trim().split(/\s+/);
          switch (changeType) {
            case 'M': // Modified
              modifiedFiles.push(filePath);
              break;
            case 'A': // Created (goes to added)
              modifiedFiles.push(filePath);
              break;
            case 'D': // Deleted
              deletedFiles.push(filePath);
              break;
            case '??': // Untracked (newly created)
              createdFiles.push(filePath);
              break;
            default:
              // Ignore other types of changes
              break;
          }
        });
        const fixFolders = (files: string[]) => {
          files = files.reduce((acc, curr) => {
            const newFiles = [curr];
            const fullPath = crossPlatformPath([cwd, curr]);
            if (Helpers.isFolder(fullPath)) {
              newFiles.push(
                ...Helpers.filesFrom(fullPath, true).map(f =>
                  f.replace(cwd + '/', ''),
                ),
              );
            }
            return [...acc, ...newFiles];
          }, []);
          return files;
        };
        modifiedFiles = fixFolders(modifiedFiles);
        createdFiles = fixFolders(createdFiles);
        return {
          modified: modifiedFiles,
          deleted: deletedFiles,
          created: createdFiles,
        };
      } catch (error) {
        Helpers.error(
          '[taon-helpers][git] Error:' + error.message,
          false,
          true,
        );
      }
      //#endregion
    };
    export const lastTagHash = (cwd: string): string => {
      Helpers.log('[taon-helpers][lastTagHash] ' + cwd, 1);
      try {
        const tag = HelpersTaon.git.lastTagVersionName(cwd);
        if (!tag) {
          return '';
        }
        let hash = child_process
          .execSync(`git log -1 --format=format:"%H" ${tag}`, { cwd })
          .toString()
          .trim();
        return hash;
      } catch (e) {
        Helpers.logWarn(
          `[taon-helpers][lastCommitHash] ` +
            `Not able to get last commit hash for repository in ${cwd}`,
        );
        return '';
      }
    };
    export const lastCommitDate = (cwd: string): Date => {
      Helpers.log('[taon-helpers][lastCommitDate] ' + cwd, 1);
      try {
        let unixTimestamp =
          isInsideGitRepo(cwd) &&
          child_process
            .execSync(`git log -1 --pretty=format:%ct`, { cwd })
            .toString()
            .trim();
        return new Date(Number(unixTimestamp) * 1000);
      } catch (e) {
        Helpers.log(e, 1);
        Helpers.log(
          `[taon-helpers][lastCommitDate] Cannot counts commits in branch in: ${cwd}`,
          1,
        );
        return null;
      }
    };
    export const getCommitMessageByHash = async (
      cwd: string,
      hash: string,
    ): Promise<string> => {
      //#region @backendFunc
      try {
        const git = simpleGit(cwd);
        const log = await git.log({
          // from: hash.trim(), TODO this is not working with "to" ... very weird
          // to: hash.trim(), // TODO this is not working with "from" ... very weird
        });
        if (log.total === 0) {
          console.warn(
            `[taon-helpers][getCommitMessageByHash] No commit found with hash "${hash}"`,
          );
          return '';
        }
        return log.all.find(f => f.hash === hash)?.message || '';
      } catch (error) {
        console.error('Error getting commit message by hash:', error);
        throw error;
      }
      //#endregion
    };
    export const getCommitMessageByIndex = async (
      cwd: string,
      index: number,
    ): Promise<string> => {
      //#region @backendFunc
      try {
        const git = simpleGit(cwd);
        // Get the list of commits with their messages
        const log = await git.log();
        // Reverse the array to handle zero-based index from the last commit
        const commitMessages = log.all;
        if (index < 0 || index >= commitMessages.length) {
          console.warn(
            `[taon-helpers][getCommitMessageByIndex] Index (${index}) out of bounds`,
          );
          return '';
        }
        // Return the commit message by index
        return commitMessages[index].message;
      } catch (error) {
        console.error('Error:', error);
        return '';
      }
      //#endregion
    };
    export const getCommitHashByIndex = async (
      cwd: string,
      index: number,
    ): Promise<string> => {
      //#region @backendFunc
      try {
        const git = simpleGit(cwd);
        // Get the list of commits with their messages
        const log = await git.log();
        // Reverse the array to handle zero-based index from the last commit
        const commits = log.all;
        if (index < 0 || index >= commits.length) {
          console.warn(
            `[taon-helpers][getCommitMessageByIndex] Index (${index}) out of bounds`,
          );
          return '';
        }
        // Return the commit message by index
        return commits[index].hash;
      } catch (error) {
        console.error('Error:', error);
        return '';
      }
      //#endregion
    };
    export const lastCommitMessage = (cwd): string => {
      Helpers.log('[taon-helpers][lastCommitMessage] ' + cwd, 1);
      try {
        let unixTimestamp = child_process
          .execSync(`git log -1 --pretty=%B`, { cwd })
          .toString()
          .trim();
        return unixTimestamp;
      } catch (e) {
        Helpers.log(e, 1);
        Helpers.log(
          `[taon-helpers]lastCommitMessage] Cannot display last commit message in branch in: ${cwd}`,
          1,
        );
        return null;
      }
    };
    export const penultimateCommitMessage = async (
      cwd: string,
    ): Promise<string> => {
      return await getCommitMessageByIndex(cwd, 1);
    };
    export const countCommits = (cwd: string): number => {
      Helpers.log('[taon-helpers][countCommits] ' + cwd, 1);
      if (!HelpersTaon.git.hasAnyCommits(cwd)) {
        return 0;
      }
      try {
        Helpers.log('[taon-helpers] RUNNING COUNT COMMITS');
        // git rev-parse HEAD &> /dev/null check if any commits
        let currentLocalBranch = currentBranchName(cwd);
        let value = Number(
          isInsideGitRepo(cwd) &&
            Helpers.commandOutputAsString(
              `git rev-list --count ${currentLocalBranch}`,
              cwd,
            ).trim(),
        );
        return !isNaN(value) ? value : 0;
      } catch (e) {
        Helpers.logWarn(
          `[taon-helpers][countCommits] Cannot counts commits in branch in: ${cwd}`,
        );
        return 0;
      }
    };
    export const hasAnyCommits = (cwd: string) => {
      // con.log('[taon-helpers][hasAnyCommits] ' + cwd, 1)
      try {
        if (process.platform === 'win32') {
          Helpers.run('git rev-parse HEAD', {
            cwd,
            silence: true,
            output: false,
          }).sync();
          // child_process.execSync('git rev-parse HEAD', { cwd, stdio: ['pipe',] }).toString().trim()
        } else {
          Helpers.run('git rev-parse HEAD &> /dev/null', {
            cwd,
            silence: true,
            output: false,
          }).sync();
        }
        return true;
      } catch (e) {
        return false;
      }
    };
    export const isInMergeProcess = (cwd: string) => {
      Helpers.log('[taon-helpers][hasAnyCommits] ' + cwd, 1);
      try {
        const message = (child_process.execSync(`git status`, { cwd }) || '')
          .toString()
          .trim();
        return message.search('Unmerged paths:') !== -1;
      } catch (e) {
        return false;
      }
    };
    export const getBranchesNames = (
      cwd: string,
      pattern?: string | RegExp,
    ): string[] => {
      Helpers.log('[taon-helpers][getBranchesNames] ' + cwd, 1);
      try {
        let branchPattern = pattern;
        if (_.isString(pattern)) {
          branchPattern = new RegExp(pattern.replace(/[^a-zA-Z0-9]+/g, '.*'));
        }
        const command = `git branch -a`;
        // console.log({ command, cwd })
        const branchNamesFromStdout = Helpers.commandOutputAsString(
          command,
          cwd,
          {
            biggerBuffer: true,
          },
        );
        // console.log({ branchPattern, branchNamesFromStdout });
        const branchNamesFiltered = branchNamesFromStdout
          .toString()
          .trim()
          .split('\n')
          .map(l => l.replace('*', '').replace(`remotes/origin/`, '').trim())
          .filter(l => {
            if (l.includes('->')) {
              return false;
            }
            // console.log('testing: ' + l)
            if (_.isRegExp(branchPattern)) {
              const match = branchPattern.test(l);
              return match;
            }
            // if (_.isString(pattern)) {
            //   return l.search(pattern)
            // }
            return true;
          });
        // console.log({ _branchNames: branchNamesFiltered });
        return branchNamesFiltered;
      } catch (e) {
        Helpers.log(e);
        Helpers.log(
          '[taon-helpers][getBranchesNames] not able to get branches names',
        );
        return [];
      }
    };
    export const allOrigins = (
      cwd: string,
    ): {
      origin: string;
      url: string;
    }[] => {
      // Determine the path to the .git/config file
      const gitConfigPath = crossPlatformPath([cwd, '.git', 'config']);
      // Read the contents of the .git/config file synchronously
      try {
        const configFile = fse.readFileSync(gitConfigPath, 'utf-8');
        const config = ini.parse(configFile);
        // Extract remotes from the config object
        const remotes = Object.keys(config)
          .filter(key => key.startsWith('remote '))
          .map(remoteKey => {
            const name = remoteKey.split('"')[1]; // Parse out the name from the section key
            const url = config[remoteKey].url;
            return { origin: name, url };
          });
        return remotes;
      } catch (error) {
        return [];
      }
    };
    export const currentBranchName = (cwd: string): string => {
      Helpers.log('[taon-helpers][currentBranchName] ' + cwd, 1);
      try {
        const branchName = child_process
          .execSync(`git rev-parse --abbrev-ref HEAD`, { cwd })
          .toString()
          .trim();
        return branchName;
      } catch (e) {
        return '';
      }
    };
    export const stageAllAndCommit = (
      cwd: string,
      commitMessage?: string,
    ): void => {
      stageAllFiles(cwd);
      commit(cwd, commitMessage);
    };
    export const commit = (cwd: string, commitMessage?: string): void => {
      Helpers.log('[taon-helpers][commit] ' + cwd, 1);
      if (!_.isString(commitMessage)) {
        commitMessage = 'update';
      }
      const tempCommitnameFile = crossPlatformPath([cwd, tempGitCommitMsgFile]);
      Helpers.writeFile(tempCommitnameFile, commitMessage);
      try {
        Helpers.info(`[taon-helpers][git][commit] trying to commit what it with argument:
      "${commitMessage}"
      location: ${cwd}
      `);
        var commandToExecute = `git commit --no-verify -F "${tempCommitnameFile}"`;
        // Helpers.info(`COMMITING WITH COMMAND: ${commandToExecute}`);
        // process.exit(0)
        Helpers.run(commandToExecute, { cwd }).sync();
        Helpers.removeFileIfExists(tempCommitnameFile);
      } catch (error) {
        Helpers.log(error);
        Helpers.removeFileIfExists(tempCommitnameFile);
        Helpers.log(
          `[taon-helpers][git][commit] not able to commit with command: ${commandToExecute}`,
        );
      }
    };
    export const getOriginURL = (
      cwd: string,
      differentOriginName = '',
    ): string => {
      Helpers.log('[taon-helpers][getOriginURL] ' + cwd, 1);
      if (!isInsideGitRepo(cwd)) {
        return '';
      }
      let url = '';
      try {
        // git config --get remote.origin.url
        url = Helpers.commandOutputAsString(
          `git config --get remote.${differentOriginName ? differentOriginName : 'origin'}.url`,
          cwd,
          {
            biggerBuffer: false,
          },
        )
          .toString()
          .trim();
      } catch (error) {
        return '';
      }
      if (!url.endsWith('.git')) {
        return `${url}.git`;
      }
      return url;
    };
    export const findGitRoot = (cwd: string) => {
      if (isGitRoot(cwd)) {
        return cwd;
      }
      let absoluteLocation = crossPlatformPath(cwd);
      let previousLocation: string;
      if (fse.existsSync(absoluteLocation)) {
        absoluteLocation = fse.realpathSync(absoluteLocation);
      }
      if (
        fse.existsSync(absoluteLocation) &&
        !fse.lstatSync(absoluteLocation).isDirectory()
      ) {
        absoluteLocation = path.dirname(absoluteLocation);
      }
      while (true) {
        if (
          path.basename(path.dirname(absoluteLocation)) ===
          config.folder.node_modules
        ) {
          absoluteLocation = path.dirname(path.dirname(absoluteLocation));
        }
        if (isGitRoot(absoluteLocation)) {
          break;
        }
        previousLocation = absoluteLocation;
        const newAbsLocation = path.join(absoluteLocation, '..');
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
      return absoluteLocation;
    };
    export const isGitRoot = (cwd: string): boolean => {
      Helpers.log('[taon-helpers][isGitRoot] ' + cwd, 1);
      if (!fse.existsSync(crossPlatformPath([cwd, '.git']))) {
        return false;
      }
      Helpers.log('[taon-helpers][isGitRepo] ' + cwd, 1);
      try {
        var rootGitCwd = Helpers.run('git rev-parse --show-toplevel', {
          biggerBuffer: false,
          cwd,
          output: false,
        })
          .sync()
          ?.toString()
          ?.trim();
        // console.log({
        //   rootGitCwd,
        //   cwd
        // })
        return (
          rootGitCwd && crossPlatformPath(rootGitCwd) === crossPlatformPath(cwd)
        );
      } catch (e) {
        return false;
      }
    };
    export const isInsideGitRepo = (cwd: string): boolean => {
      Helpers.log('[taon-helpers][isGitRepo] ' + cwd, 1);
      if (!HelpersTaon.git.hasAnyCommits(cwd)) {
        return false;
      }
      try {
        var test = Helpers.run('git rev-parse --is-inside-work-tree', {
          biggerBuffer: false,
          cwd,
          output: false,
        }).sync();
      } catch (e) {
        return false;
      }
      return !!test;
    };
    export const resetSoftHEAD = (cwd: string, HEAD = 1): void => {
      try {
        child_process.execSync(`git reset --soft HEAD~${HEAD}`, { cwd });
      } catch (error) {
        Helpers.error(
          `[${config.frameworkName}] not able to soft repository in ${self.location}`,
        );
      }
    };
    export const resetHard = (
      cwd: string,
      options?: {
        HEAD?: number;
      },
    ): void => {
      //#region @backendFunc
      const { HEAD } = options || {};
      Helpers.info(
        `[taon-helpers] [resetHard] ` +
          `${_.isNumber(HEAD) ? `HEAD~${HEAD}` : ''} ${cwd}`,
      );
      try {
        child_process.execSync(
          `git reset --hard ${_.isNumber(HEAD) ? `HEAD~${HEAD}` : ''}`,
          { cwd },
        );
      } catch (error) {
        Helpers.error(
          `[${config.frameworkName}] not able to reset repository in ${self.location}`,
        );
      }
      //#endregion
    };
    export const _pull = (
      cwd: string,
      options?: {
        branchName?: string;
        defaultHardResetCommits?: number;
      },
    ) => {
      let { branchName, defaultHardResetCommits } = options || {};
      if (_.isNumber(defaultHardResetCommits)) {
        resetHard(cwd, { HEAD: defaultHardResetCommits });
      } else {
        resetHard(cwd);
      }
      child_process.execSync(`git pull --tags --rebase origin ${branchName}`, {
        cwd,
      });
    };
    export const pullCurrentBranch = async (
      cwd: string,
      options?: {
        askToRetry?: boolean;
        /**
         * default true, when false it will throw error instead process.exit(0)
         */
        exitOnError?: boolean;
        defaultHardResetCommits?: number;
      },
    ): Promise<void> => {
      options = options || ({} as any);
      let { askToRetry, exitOnError } = options || {};
      if (_.isUndefined(exitOnError)) {
        options.exitOnError = true;
        exitOnError = true;
      }
      Helpers.log('[taon-helpers][pullCurrentBranch] ' + cwd, 1);
      if (global['tnpNonInteractive']) {
        askToRetry = false;
      }
      Helpers.log(`askToRetry: ${askToRetry}`);
      if (getOriginURL(cwd) === '') {
        Helpers.warn(
          `Not pulling branch without ` +
            `remote origin url.... in folder ${path.basename(cwd)}`,
        );
        return;
      }
      Helpers.info(
        `[taon-helpers][${dateformat(new Date(), 'dd-mm-yyyy HH:MM:ss')}] Pulling git changes in "${cwd}", origin=${HelpersTaon.git.getOriginURL(cwd)}  `,
      );
      let acknowledgeBeforePull = false;
      while (true) {
        const isSsh = HelpersTaon.git.getOriginURL(cwd).includes('git@');
        try {
          if (acknowledgeBeforePull) {
            HelpersTaon.pressKeyAndContinue(
              'Press any key to continue pulling...',
            );
          }
          let currentLocalBranch = currentBranchName(cwd);
          HelpersTaon.git._pull(cwd, {
            ...options,
            branchName: currentLocalBranch,
          });
          Helpers.info(
            `[taon-helpers] Branch "${currentLocalBranch}" updated successfully in ${path.basename(cwd)}`,
          );
          break;
        } catch (e) {
          // console.log(e)
          if (!askToRetry && exitOnError) {
            Helpers.error(
              `[taon-helpers] Cannot update current branch in: ${cwd}`,
              askToRetry,
              true,
            );
          }
          if (!askToRetry && !exitOnError) {
            throw e;
          }
          if (askToRetry) {
            //#region ask to retry question
            const pullOptions = {
              again: {
                name: 'Try pull again',
              },
              normalButSshOrHttpOrigin: {
                name: `Try pull again with ${isSsh ? 'HTTPS' : 'SSH'} origin ?`,
              },
              skip: {
                name: 'Skip pulling',
              },
              resetHardLast5Commits: {
                name: 'Reset hard last 5 commits and pull again',
              },
              openInVscode: {
                name: 'Open project in VSCode',
              },
              exit: {
                name: 'Exit process',
              },
            };
            const whatToDo = await UtilsTerminal.select<
              keyof typeof pullOptions
            >({
              question: 'What to do ?',
              choices: pullOptions,
            });
            acknowledgeBeforePull = whatToDo === 'openInVscode';
            if (whatToDo === 'normalButSshOrHttpOrigin') {
              if (isSsh) {
                await HelpersTaon.git.changeRemoveFromSshToHttps(cwd);
              } else {
                await HelpersTaon.git.changeRemoteFromHttpsToSSh(cwd);
              }
            }
            if (whatToDo === 'resetHardLast5Commits') {
              try {
                HelpersTaon.git.resetHard(cwd, { HEAD: 5 });
              } catch (error) {}
              continue;
            }
            if (whatToDo === 'openInVscode') {
              try {
                Helpers.run(`${UtilsOs.detectEditor()} .`, { cwd }).sync();
              } catch (error) {}
              continue;
            }
            if (whatToDo === 'skip') {
              break;
            }
            if (whatToDo === 'exit') {
              process.exit(0);
            }
            //#endregion
          }
        }
      }
      Helpers.info(
        `[${dateformat(new Date(), 'dd-mm-yyyy HH:MM:ss')}] DONE PULLING`,
      );
    };
    export const meltActionCommits = (cwd: string): number => {
      let i = 0;
      while (true) {
        if (
          lastCommitMessage(cwd) ===
          HelpersTaon.git.getACTION_MSG_RESET_GIT_HARD_COMMIT()
        ) {
          Helpers.logInfo(
            `[${config.frameworkName}-helpers] Melting action commit #`,
          );
          HelpersTaon.git.resetSoftHEAD(cwd, 1);
          ++i;
        } else {
          // TODO breaking cli processes - put outside this fn
          // HelpersTaon.git.unstageAllFiles(cwd);
          return i;
        }
      }
    };
    export const pushCurrentBranch = async (
      cwd: string,
      options?: {
        force?: boolean;
        origin?: string;
        askToRetry?: boolean;
        forcePushNoQuestion?: boolean;
      },
    ): Promise<boolean> => {
      options = options || {};
      options.origin = options.origin ? options.origin : 'origin';
      const { askToRetry, forcePushNoQuestion = false } = options;
      let { origin } = options;
      let { force } = options;
      if (force && !forcePushNoQuestion) {
        Helpers.info(`
      Pushing force branch ${HelpersTaon.git.currentBranchName(cwd)} in location

${cwd}

      `);
        if (!(await HelpersTaon.consoleGui.question.yesNo(`Are you sure ? `))) {
          process.exit(0);
        }
      }
      Helpers.log('[taon-helpers][pushCurrentBranch] ' + cwd, 1);
      const currentBranchName = HelpersTaon.git.currentBranchName(cwd);
      while (true) {
        const isSsh = HelpersTaon.git
          .getOriginURL(cwd, options.origin)
          .includes('git@');
        try {
          const taskName = `
    [${dateformat(new Date(), 'dd-mm-yyyy HH:MM:ss')}]
    Pushing ${force ? 'FORCE' : 'NORMALLY'} current branch (remote=${origin}): ${currentBranchName}
    `;
          Helpers.info(taskName);
          const command = `git push ${force ? '-f' : ''} ${origin} ${currentBranchName} --tags`;
          Helpers.info(
            `[git][push] [${dateformat(new Date(), 'dd-mm-yyyy HH:MM:ss')}] ${force ? 'force' : 'normal'} pushing current branch ${currentBranchName} ,` +
              ` origin=${HelpersTaon.git.getOriginURL(cwd, origin)}`,
          );
          Helpers.run(command, { cwd }).sync();
          Helpers.info(taskName);
          break;
        } catch (err) {
          Helpers.error(
            `[taon-helpers] Not able to push branch ${currentBranchName} in (origin=${origin}):
        ${cwd}`,
            true,
            true,
          );
          if (!askToRetry) {
            return false;
          }
          const pushOptions = {
            normal: {
              name: 'Try normal push again ?',
            },
            normalButSshOrHttpOrigin: {
              name: `Try normal ${isSsh ? 'HTTPS' : 'SSH'} origin push again ?`,
            },
            force: {
              name: 'Try again with force push ?',
            },
            skip: {
              name: 'Skip pushing',
            },
            openInVscode: {
              name: 'Open in vscode window',
            },
            exit: {
              name: 'Exit process',
            },
          };
          const whatToDo = await UtilsTerminal.select<keyof typeof pushOptions>(
            {
              question: 'What to do ?',
              choices: pushOptions,
            },
          );
          if (whatToDo === 'normalButSshOrHttpOrigin') {
            if (isSsh) {
              await HelpersTaon.git.changeRemoveFromSshToHttps(cwd);
            } else {
              await HelpersTaon.git.changeRemoteFromHttpsToSSh(cwd);
            }
          }
          if (whatToDo === 'openInVscode') {
            try {
              Helpers.run(`${UtilsOs.detectEditor()} .`, { cwd }).sync();
            } catch (error) {}
            continue;
          }
          if (whatToDo === 'skip') {
            return false;
          }
          if (whatToDo === 'exit') {
            process.exit(0);
          }
          force = whatToDo === 'force';
          continue;
        }
      }
      return true;
    };
    export const defaultRepoBranch = (cwd: string): string => {
      //#region @backendFunc
      Helpers.log('[defaultRepoBranch] ' + cwd, 1);
      try {
        const raw = child_process
          .execSync(`git symbolic-ref refs/remotes/origin/HEAD`, { cwd })
          .toString()
          .trim();
        // Remove the prefix manually
        const prefix = 'refs/remotes/origin/';
        const defaultBranch = raw.startsWith(prefix)
          ? raw.slice(prefix.length)
          : raw;
        return defaultBranch;
      } catch (e) {
        Helpers.logWarn(`Cannot find default branch for repo in: ${cwd}`);
        return '';
      }
      //#endregion
    };
    export const checkoutDefaultBranch = (cwd: string): void => {
      Helpers.log('[checkoutDefaultBranch] ' + cwd, 1);
      const defaultBranch = child_process
        .execSync(
          `git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`,
          { cwd },
        )
        .toString()
        .trim();
      child_process.execSync(`git checkout ${defaultBranch}`, { cwd });
    };
    export const stageAllFiles = (cwd: string): void => {
      try {
        child_process.execSync(`git add --all .`, { cwd });
      } catch (error) {}
    };
    export const stageFile = (cwd: string, fileRelativePath: string): void => {
      try {
        child_process.execSync(`git add ${fileRelativePath}`, { cwd });
      } catch (error) {}
    };
    export const stash = (
      cwd: string,
      optinos?: {
        onlyStaged?: boolean;
      },
    ): void => {
      const { onlyStaged } = optinos || {};
      // console.log({ onlyStaged, cwd });
      try {
        if (onlyStaged) {
          child_process.execSync(`git stash push --staged`, { cwd });
        } else {
          child_process.execSync(`git stash -u`, { cwd });
        }
      } catch (error) {
        Helpers.info('Not able to stash changes');
        console.error(error);
      }
    };
    export const rebase = (cwd: string, toBranch: string): void => {
      // console.log({ onlyStaged, cwd });
      try {
        child_process.execSync(`git rebase ${toBranch}`, { cwd });
      } catch (error) {
        Helpers.info('Not able to rebase');
        console.error(error);
      }
    };
    export const stashApply = (cwd: string): void => {
      try {
        child_process.execSync(`git stash apply`, { cwd });
      } catch (error) {}
    };
    export const fetch = (cwd: string, all = false): void => {
      Helpers.taskStarted('Fetching git changes');
      try {
        child_process.execSync(`git fetch ${all ? '--all' : ''}`, { cwd });
      } catch (error) {
        Helpers.error('Not able to git fetch.', false, true);
      }
      Helpers.taskDone('Fetching git changes');
    };
    export const cleanRepoFromAnyFilesExceptDotGitFolder = (
      cwd: string,
    ): void => {
      //#region @backendFunc
      const entries = fse.readdirSync(cwd);
      for (const entry of entries) {
        // Skip the .git directory
        if (entry === '.git') {
          continue;
        }
        const fullPath = crossPlatformPath([cwd, entry]);
        const stats = fse.statSync(fullPath);
        if (stats.isDirectory()) {
          try {
            // when link
            fse.unlinkSync(fullPath);
          } catch (error) {}
          // Recursively remove directories
          Helpers.remove(fullPath, true);
        } else {
          // Remove files
          try {
            fse.unlinkSync(fullPath);
          } catch (error) {}
        }
      }
      //#endregion
    };
    export const checkout = (
      cwd,
      branchName: string,
      options?: {
        createBranchIfNotExists?: boolean;
        fetchBeforeCheckout?: boolean;
        switchBranchWhenExists?: boolean;
      },
    ): void => {
      let {
        createBranchIfNotExists,
        fetchBeforeCheckout,
        switchBranchWhenExists,
      } = options || {};
      if (fetchBeforeCheckout) {
        fetch(cwd);
      }
      if (
        switchBranchWhenExists &&
        getBranchesNames(cwd, branchName).includes(branchName)
      ) {
        createBranchIfNotExists = false;
      }
      try {
        child_process.execSync(
          `git checkout ${createBranchIfNotExists ? '-b' : ''} ${branchName}`,
          { cwd },
        );
      } catch (error) {
        Helpers.error(
          `Not able to checkout branch: ${branchName}`,
          false,
          true,
        );
      }
    };
    export const checkoutFromTo = (
      checkoutFromBranch: string,
      targetBranch: string,
      origin = 'origin',
      cwd,
    ): void => {
      Helpers.log('[checkout] ' + cwd, 1);
      child_process.execSync(`git fetch`, { cwd });
      const currentBranchName = HelpersTaon.git.currentBranchName(cwd);
      if (currentBranchName === targetBranch) {
        Helpers.info('Already on proper branch.. just pulling');
        child_process.execSync(`git reset --hard`, { cwd });
        child_process.execSync(`git pull ${origin} ${checkoutFromBranch}`, {
          cwd,
        });
      } else {
        const targetBranchExists =
          getBranchesNames(cwd).filter(f => targetBranch === f).length > 0;
        child_process.execSync(`git reset --hard`, { cwd });
        if (currentBranchName !== checkoutFromBranch) {
          child_process.execSync(`git checkout ${checkoutFromBranch}`, { cwd });
        }
        child_process.execSync(`git pull ${origin} ${checkoutFromBranch}`, {
          cwd,
        });
        if (targetBranchExists) {
          child_process.execSync(`git checkout ${targetBranch}`, { cwd });
          child_process.execSync(`git rebase ${checkoutFromBranch}`, { cwd });
        } else {
          child_process.execSync(`git checkout -b ${targetBranch}`, { cwd });
        }
      }
    };
    export const revertFileChanges = (cwd, fileReletivePath: string): void => {
      try {
        Helpers.run(`git checkout ${fileReletivePath}`, { cwd }).sync();
      } catch (error) {}
    };
    export const getRemoteProvider = (cwd: string): string => {
      //#region @backendFunc
      const remoteUrl = getOriginURL(cwd);
      if (!remoteUrl) {
        return null;
      }
      try {
        // Handle SSH URLs like git@github.com:user/repo.git
        const sshMatch = remoteUrl.match(/^git@([^:]+):/);
        if (sshMatch) {
          return sshMatch[1];
        }
        // Handle HTTP/HTTPS URLs like https://github.com/user/repo.git
        const httpMatch = remoteUrl.match(/^https?:\/\/([^/]+)\//);
        if (httpMatch) {
          return httpMatch[1];
        }
        // Handle SSH URLs with ssh:// format
        const sshAltMatch = remoteUrl.match(/^ssh:\/\/(?:[^@]+@)?([^/]+)/);
        if (sshAltMatch) {
          return sshAltMatch[1];
        }
        return null;
      } catch (e) {
        // console.error("Failed to extract provider from remote URL:", e);
        return null;
      }
      //#endregion
    };
    export const clone = async ({
      cwd,
      url,
      destinationFolderName = '',
      throwErrors,
      override,
    }: {
      cwd: string;
      url: string;
      destinationFolderName?: string;
      throwErrors?: boolean;
      override?: boolean;
    }): Promise<string> => {
      cwd = crossPlatformPath(cwd);
      if (!Helpers.exists(cwd)) {
        try {
          Helpers.mkdirp(cwd);
        } catch (error) {
          Helpers.warn(`Not able to recreate path ${cwd}`);
        }
      }
      Helpers.log('[clone] ' + cwd, 1);
      // const ALWAYS_HTTPS = true;
      if (!url) {
        Helpers.error(`[taon-helpers] no url provided for cloning`);
      }
      if (url.split(' ').length > 2) {
        // const [rUrl, rDest] = url.split(' ');
        Helpers.error(`[taon-helpers]incorrect clone url "${url}"`);
      }
      if (url.split(' ').length === 2) {
        const [rUrl, rDest] = url.split(' ');
        if (destinationFolderName) {
          Helpers.error(`[taon-helpers] wrong cloning argument

        url = "${url}"
        destinationFolderName = "${destinationFolderName}"

        cant use both at the same time
        `);
        } else {
          destinationFolderName = rDest;
          url = rUrl;
        }
      }
      if (!url.endsWith('.git')) {
        url = url + '.git';
      }
      const cloneFolderPath = crossPlatformPath(
        path
          .join(
            cwd,
            !!destinationFolderName && destinationFolderName.trim() !== ''
              ? destinationFolderName
              : path.basename(url),
          )
          .trim()
          .replace('.git', ''),
      );
      // console.log({ cloneFolderPath })
      if (override) {
        Helpers.tryRemoveDir(cloneFolderPath);
      } else if (
        Helpers.exists(cloneFolderPath) &&
        Helpers.exists(path.join(cloneFolderPath, '.git'))
      ) {
        Helpers.warn(
          `[taon-helpers] Already cloned ${path.basename(cloneFolderPath)}...`,
        );
        return cloneFolderPath;
      }
      let isHttpCommand =
        url.startsWith('http://') || url.startsWith('https://');
      let command = isHttpCommand
        ? `git -c http.sslVerify=false clone ${url} ${path.basename(cloneFolderPath)}`
        : `git clone ${url} ${path.basename(cloneFolderPath)}`;
      Helpers.info(`

    Cloning:
    ${command}

    `);
      if (throwErrors) {
        Helpers.run(command, { cwd }).sync();
      } else {
        while (true) {
          isHttpCommand =
            url.startsWith('http://') || url.startsWith('https://');
          command = isHttpCommand
            ? `git -c http.sslVerify=false clone ${url} ${path.basename(cloneFolderPath)}`
            : `git clone ${url} ${path.basename(cloneFolderPath)}`;
          Helpers.info(`Cloning from url: ${CLI.chalk.bold(url)}..`);
          try {
            Helpers.run(command, { cwd, output: false }).sync();
            break;
          } catch (error) {
            if (error?.stderr?.toString()?.search('remote: Not Found') !== -1) {
              Helpers.error(
                `[taon-helpers][git] Project not found :${url}`,
                true,
                true,
              );
            } else {
              Helpers.error(
                `[taon-helpers] Can't clone from url: ${CLI.chalk.bold(url)}..`,
                true,
                true,
              );
            }
            const cloneLinkOpt = {
              again: {
                name: 'Try again',
              },
              againDif: {
                name: `Try again with ${isHttpCommand ? 'ssh' : 'http'} url`,
              },
              skip: {
                name: 'Skip cloning this repository',
              },
              exit: {
                name: 'Exit process',
              },
            };
            const res = await HelpersTaon.consoleGui.select<
              keyof typeof cloneLinkOpt
            >('What to do?', cloneLinkOpt);
            if (res === 'again') {
              continue;
            }
            if (res === 'againDif') {
              url = isHttpCommand
                ? HelpersTaon.git.originHttpToSsh(url)
                : HelpersTaon.git.originSshToHttp(url);
              continue;
            }
            if (res === 'exit') {
              process.exit(0);
            }
            if (res === 'skip') {
              break;
            }
          }
        }
      }
      return cloneFolderPath;
      // const packageJson = path.join(cloneFolderPath, config.file.package_json);
      // Helpers.info(packageJson)
      // if (!Helpers.exists(packageJson) && Helpers.exists(cloneFolderPath)) {
      //   Helpers.info(`[taon-helpers] Recreating unexited package.json for project ${path.basename(cloneFolderPath)}..`);
      //   try {
      //     Helpers.run(`npm init -y`, { cwd: cloneFolderPath, output: false }).sync();
      //   } catch (error) { }
      // }
    };
    export const checkIfthereAreSomeUncommitedChange = (
      cwd: string,
    ): boolean => {
      Helpers.log(
        '[taon-helpers][checkIfthereAreSomeUncommitedChange] ' + cwd,
        1,
      );
      return HelpersTaon.git.thereAreSomeUncommitedChangeExcept([], cwd);
    };
    export const thereAreSomeUncommitedChangeExcept = (
      filesList: string[] = [],
      cwd: string,
    ): boolean => {
      Helpers.log(
        '[taon-helpers][thereAreSomeUncommitedChangeExcept] ' + cwd,
        1,
      );
      filesList = filesList.map(f => crossPlatformPath(f));
      try {
        const res = Helpers.run(
          `git ls-files --deleted --modified --others --exclude-standard`,
          { output: false, cwd },
        )
          .sync()
          .toString()
          .trim();
        const list = !res
          ? []
          : res.split(/\r\n|\n|\r/).filter(f => {
              f = f?.trim();
              return !!f && !filesList.includes(crossPlatformPath(f));
            });
        return list.length > 0;
      } catch (error) {
        return false;
      }
    };
    export const uncommitedFiles = (cwd: string): string[] => {
      try {
        const res = Helpers.run(
          `git ls-files --deleted --modified --others --exclude-standard`,
          { output: false, cwd },
        )
          .sync()
          .toString()
          .trim();
        const list = !res
          ? []
          : res.split(/\r\n|\n|\r/).filter(f => {
              f = f?.trim();
              return !!f;
            });
        return list;
      } catch (error) {
        return [];
      }
    };
    export const restoreLastVersion = (
      cwd: string,
      relativeFilePath: string,
    ): void => {
      Helpers.log('[taon-helpers][restoreLastVersion] ' + cwd, 1);
      if (!Helpers.exists([cwd, relativeFilePath])) {
        return;
      }
      try {
        Helpers.log(
          `[taon-helpers][git] restoring last verion of file ${path.basename(cwd)}/${relativeFilePath}`,
        );
        Helpers.run(`git checkout -- ${relativeFilePath}`, { cwd }).sync();
      } catch (error) {
        Helpers.warn(
          `[taon-helpers][git] Not able to resotre last version of file ${relativeFilePath}`,
        );
      }
    };
    export const resetFiles = (
      cwd: string,
      ...relativePathes: string[]
    ): void => {
      Helpers.log('[taon-helpers][resetFiles] ' + cwd, 1);
      relativePathes.forEach(p => {
        try {
          Helpers.run(`git checkout HEAD -- ${p}`, { cwd }).sync();
        } catch (err) {
          Helpers.error(
            `[taon-helpers][git] Not able to reset files: ${p} inside project ${path.basename(cwd)}.`,
            true,
            true,
          );
        }
      });
    };
    export const stagedFiles = (
      cwd: string,
      outputRelatieve = false,
    ): string[] => {
      cwd = crossPlatformPath(cwd).replace(/\/$/, '');
      const command = `git diff --name-only --cached`.trim();
      const result = Helpers.commandOutputAsString(command, cwd, {}) || '';
      return (result ? result.split('\n') : []).map(relative => {
        if (outputRelatieve) {
          return crossPlatformPath(relative);
        }
        return crossPlatformPath([cwd, relative]);
      });
    };
    export const getChangedFiles = async (
      cwd: string,
      commitHash: string,
    ): Promise<string[]> => {
      const output = await Helpers.commandOutputAsStringAsync(
        'git diff-tree --no-commit-id --name-only -r ${commitHash}',
        cwd,
      );
      const changedFiles = output.trim().split('\n');
      return changedFiles;
    };
    export const originHttpToSsh = (
      originHttp: string,
      verbose = false,
    ): string => {
      if (!originHttp) {
        Helpers.warn(
          `[${config.frameworkName}-helpers][originHttpToSsh] originHttp is empty or undefined`,
        );
        return originHttp;
      }
      const httpsPattern = /^https:\/\/(.+?)\/(.+?\/.+?)(\.git)?$/;
      const match = originHttp.match(httpsPattern);
      if (originHttp === 'undefined' || _.isNil(originHttp)) {
        Helpers.error(
          '[taon-helpers][originHttpToSsh] Origin URL is not defined',
        );
        return originHttp;
      }
      if (!match) {
        verbose &&
          Helpers.warn(
            'The current remote URL is not in HTTPS format:' + originHttp,
          );
        return originHttp;
      }
      const host = match[1];
      const repoPath = match[2];
      const sshUrl = `git@${host}:${repoPath}.git`;
      return sshUrl;
    };
    export const changeRemoteFromHttpsToSSh = async (
      cwd: string,
      diffrentOriginName: string = 'origin',
    ): Promise<void> => {
      try {
        const currentUrl = (await getOriginURL(cwd, diffrentOriginName)) || '';
        const sshUrl = originHttpToSsh(currentUrl);
        await Helpers.run(
          `git remote set-url ${diffrentOriginName} ${sshUrl}`,
          {
            cwd,
          },
        ).sync();
        console.log('Remote URL has been changed to:', sshUrl);
      } catch (error) {
        console.error('Failed to change remote URL:', error);
      }
    };
    export const originSshToHttp = (
      originSsh: string,
      verbose = false,
    ): string => {
      if (!originSsh) {
        Helpers.warn(
          `[${config.frameworkName}-helpers][originSshToHttp] originSsh is empty or undefined`,
        );
        return originSsh;
      }
      const sshPattern = /^git@(.+?):(.+?\/.+?)(\.git)?$/;
      const match = originSsh.match(sshPattern);
      if (originSsh === 'undefined' || _.isNil(originSsh)) {
        Helpers.error(
          '[taon-helpers][originSshToHttp] Origin URL is not defined',
        );
        return originSsh;
      }
      if (!match) {
        verbose &&
          Helpers.warn(
            'The current remote URL is not in SSH format:' + originSsh,
          );
        return originSsh;
      }
      const host = match[1];
      const repoPath = match[2];
      const httpsUrl = `https://${host}/${repoPath}.git`;
      return httpsUrl;
    };
    export const changeRemoveFromSshToHttps = async (
      cwd: string,
      diffrentOriginName: string = 'origin',
    ): Promise<void> => {
      try {
        const currentUrl = (await getOriginURL(cwd, diffrentOriginName)) || '';
        const httpsUrl = originSshToHttp(currentUrl);
        await Helpers.run(`git remote set-url origin ${httpsUrl}`, {
          cwd,
        }).sync();
        console.log('Remote URL has been changed to:', httpsUrl);
      } catch (error) {
        console.error('Failed to change remote URL:', error);
      }
    };
    export const unstageAllFiles = (cwd: string): void => {
      try {
        Helpers.run(`git reset HEAD -- .`, { cwd }).sync();
      } catch (error) {}
    };
    export const getChangedFilesInCommitByHash = async (
      cwd: string,
      hash: string,
    ): Promise<string[]> => {
      //#region @backendFunc
      try {
        const git = simpleGit(cwd);
        const diffSummary = await git.diffSummary([`${hash}^!`]);
        return diffSummary.files.map(file => file.file);
      } catch (error) {
        console.error('Error getting changed files by hash:', error);
        throw error;
      }
      //#endregion
    };
    export const getChangedFilesInCommitByIndex = async (
      cwd: string,
      index: number,
    ): Promise<string[]> => {
      //#region @backendFunc
      try {
        const git = simpleGit(cwd);
        const log = await git.log();
        if (index >= log.total) {
          console.warn(
            '[taon-helpers][getChangedFilesInCommitByIndex] Index out of range',
          );
          return [];
        }
        const hash = log.all[index].hash;
        return getChangedFilesInCommitByHash(cwd, hash);
      } catch (error) {
        console.error('Error getting changed files by index:', error);
        throw error;
      }
      //#endregion
    };
    export const changesSummary = async (
      cwd: string,
      prefix = '',
    ): Promise<string> => {
      //#region @backendFunc
      try {
        const git = simpleGit(cwd);
        const changesSummary = (await git.status()).files.map(c => c.path);
        return (
          changesSummary.length === 0
            ? [` --- no changes --- `]
            : changesSummary
        )
          .map(f => `\n${prefix}${f}`)
          .join('');
      } catch (error) {
        console.error('Error getting changes summary:', error);
        return ' --- No changes ---';
      }
      //#endregion
    };
    export const getUserInfo = async (
      cwd: string,
      global = false,
    ): Promise<{
      name?: string;
      email?: string;
    }> => {
      try {
        const name = child_process
          .execSync(`git config ${global ? '--global' : ''} user.name`, {
            encoding: 'utf-8',
            cwd: cwd || process.cwd(),
          })
          .trim();
        const email = child_process
          .execSync(`git config ${global ? '--global' : ''} user.email`, {
            encoding: 'utf-8',
            cwd: cwd || process.cwd(),
          })
          .trim();
        return { name, email };
      } catch (error) {
        console.error('Error fetching Git user info:', error.message);
        return {};
      }
    };
    export const setUserInfos = async (optinos: {
      cwd: string;
      name: string;
      email: string;
      global?: boolean;
    }): Promise<void> => {
      const { cwd, name, email, global } = optinos;
      if (!global && !isInsideGitRepo(cwd)) {
        console.error('Not a Git repository:', cwd);
        return;
      }
      try {
        child_process.execSync(
          `git config ${global ? '--global' : ''} user.name "${name}"`,
          { cwd },
        );
        child_process.execSync(
          `git config ${global ? '--global' : ''} user.email "${email}"`,
          { cwd },
        );
      } catch (error) {
        console.error('Error setting Git user info:', error.message);
        await UtilsTerminal.pressAnyKeyToContinueAsync();
      }
    };
    export const backupBranch = async (
      cwd: string,
      branchName?: string,
    ): Promise<string> => {
      //#region @backendFunc
      const orgBranchName = currentBranchName(cwd);
      if (branchName) {
        if (branchName !== orgBranchName) {
          checkout(cwd, branchName, {
            createBranchIfNotExists: false,
            switchBranchWhenExists: true,
            fetchBeforeCheckout: true,
          });
        }
      } else {
        branchName = orgBranchName;
      }
      const backupBranchName = `backup/${branchName}-${dateformat(new Date(), 'yyyy-mm-dd-HH-MM-ss')}`;
      Helpers.log(
        `[taon-helpers][backupBranch] Creating backup branch: ${backupBranchName} in repo: ${cwd}`,
      );
      checkout(cwd, backupBranchName, { createBranchIfNotExists: true });
      Helpers.log(
        `[taon-helpers][backupBranch] Backup branch created and pushed: ${backupBranchName}`,
      );
      checkout(cwd, orgBranchName, {
        createBranchIfNotExists: false,
        switchBranchWhenExists: true,
      });
      return backupBranchName;
      //#endregion
    };
  }

  //#endregion

  //#region process
  export const restartApplicationItself = (nameOfApp: string) => {
    //#region @backendFunc
    Helpers.log(`Restarting ${nameOfApp}`);
    return new Promise(() => {
      setTimeout(function () {
        process.on('exit', function () {
          spawn(process.argv.shift(), [...process.argv, '--restarting'], {
            cwd: crossPlatformPath(process.cwd()),
            detached: true,
            stdio: 'inherit',
          });
        });
        process.exit();
      }, 5000);
    });
    //#endregion
  };
  export const osIsMacOs = (versino: 'big-sur' | 'catalina') => {
    //#region @backendFunc
    if (versino == 'big-sur') {
      return os.release().startsWith('20.');
    }
    if (versino == 'catalina') {
      return os.release().startsWith('19.');
    }
    // TODO other oses
    //#endregion
  };
  export const generatedFileWrap = (content: string) => {
    //#region @backendFunc
    return `${content}
  // [${config.frameworkName}] GENERATED CONTENT FOR BACKEND VERSION
  // [${config.frameworkName}] GENERATED CONTENT FOR BACKEND VERSION
          `.trim();
    //#endregion
  };
  export const changeCwdWrapper = async (
    dir: string,
    functionToExecure: Function,
    logLevel: Level = Level.__NOTHING,
  ) => {
    //#region @backendFunc
    const currentCwd = crossPlatformPath(process.cwd());
    HelpersTaon.changeCwd(dir);
    Log.disableLogs(logLevel);
    await Helpers.runSyncOrAsync({ functionFn: functionToExecure });
    Log.enableLogs();
    HelpersTaon.changeCwd(currentCwd);
    //#endregion
  };
  export const changeCwd = (dir?: string) => {
    //#region @backendFunc
    if (!dir) {
      return;
    }
    HelpersTaon.goToDir(dir);
    //#endregion
  };
  export const goToDir = (dir = '..') => {
    //#region @backendFunc
    const previous = crossPlatformPath(process.cwd());
    try {
      dir = path.isAbsolute(dir)
        ? dir
        : crossPlatformPath(
            path.resolve(path.join(crossPlatformPath(process.cwd()), dir)),
          );
      if (path.basename(dir) === config.folder.external) {
        const belowExternal = path.resolve(path.join(dir, '..'));
        const classProject = CLASS.getBy('Project') as typeof BaseProject;
        if (
          fse.existsSync(belowExternal) &&
          !!classProject.ins.From(belowExternal)
        ) {
          dir = belowExternal;
        }
      }
      process.chdir(dir);
    } catch (err) {
      goToDir(previous);
      return false;
    }
    return true;
    //#endregion
  };
  export const pressKeyOrWait = async (
    message = 'Press enter try again',
    printWaitMessages = 0,
  ) => {
    //#region @backendFunc
    if (_.isNumber(printWaitMessages) && printWaitMessages > 0) {
      Helpers.log(`Please wait (${printWaitMessages}) seconds`);
      await HelpersTaon.pressKeyOrWait(message, printWaitMessages - 1);
      return;
    }
    return new Promise(resovle => {
      Helpers.log(message);
      process.stdin.once('data', function () {
        resovle(void 0);
      });
    });
    //#endregion
  };
  export const pressKeyAndContinue = async (
    message = 'Press enter to continue..',
  ) => {
    //#region @backendFunc
    return UtilsTerminal.pressAnyKey({ message });
    //#endregion
  };
  export const list = async <T = any>(
    question: string,
    choices:
      | {
          name: string;
          value: T;
        }[]
      | {
          [choice: string]: {
            name: string;
          };
        },
  ) => {
    //#region @backendFunc
    if (!_.isArray(choices) && _.isObject(choices)) {
      choices = Object.keys(choices)
        .map(key => {
          return {
            name: choices[key].name,
            value: key,
          };
        })
        .reduce((a, b) => a.concat(b), []);
    }
    const inquirer = await import('inquirer');
    const res = (await inquirer.prompt({
      type: 'list',
      name: 'value',
      message: question,
      choices,
      pageSize: 10,
      loop: true,
    } as any)) as any;
    return res.value as T;
    //#endregion
  };
  export const multipleChoicesAsk = (
    question: string,
    choices: {
      name: string;
      value: string;
    }[],
    autocomplete: boolean = false,
    selected?: {
      name: string;
      value: string;
    }[],
  ): Promise<string[]> => {
    //#region @backendFunc
    return UtilsTerminal.multiselect({
      question,
      choices,
      autocomplete,
      defaultSelected: (selected || []).map(s => s.value),
    });
    //#endregion
  };
  export const input = async (options: {
    defaultValue?: string;
    question: string;
    // required?: boolean;
    validate?: (value: string) => boolean;
  }): Promise<string> => {
    //#region @backendFunc
    return await UtilsTerminal.input(options);
    //#endregion
  };
  export const selectChoicesAsk = async <T = any>(
    question: string,
    choices:
      | {
          name: string;
          value: T;
        }[]
      | {
          [choice: string]: {
            name: string;
          };
        },
  ): Promise<T> => {
    //#region @backendFunc
    // console.log({ choices })
    // HelpersTaon.pressKeyAndContinue()
    if (!_.isArray(choices) && _.isObject(choices)) {
      choices = Object.keys(choices)
        .map(key => {
          return {
            name: choices[key].name,
            value: key,
          };
        })
        .reduce((a, b) => a.concat(b), []);
    }
    const { AutoComplete } = require('enquirer');
    const prompt = new AutoComplete({
      name: 'value',
      message: question,
      limit: 10,
      multiple: false,
      autocomplete: false,
      choices,
      hint: '- Space to select. Return to submit',
      footer() {
        return CLI.chalk.green('(Scroll up and down to reveal more choices)');
      },
    });
    const res = await prompt.run();
    return res;
    //#endregion
  };
  export const autocompleteAsk = async <T = any>(
    question: string,
    choices: {
      name: string;
      value: T;
    }[],
    pageSize = 10,
  ): Promise<T> => {
    //#region @backendFunc
    const source = (__, input) => {
      input = input || '';
      return new Promise(resolve => {
        const fuzzy = require('fuzzy');
        const fuzzyResult = fuzzy.filter(
          input,
          choices.map(f => f.name),
        );
        resolve(
          fuzzyResult.map(el => {
            return {
              name: el.original,
              value: choices.find(c => c.name === el.original).value,
            };
          }),
        );
      });
    };
    const inquirer = await import('inquirer');
    const inquirerAutocomplete = await import('inquirer-autocomplete-prompt');
    inquirer.registerPrompt('autocomplete', inquirerAutocomplete);
    const res: {
      command: T;
    } = (await inquirer.prompt({
      type: 'autocomplete',
      name: 'command',
      pageSize,
      source,
      message: question,
      choices,
    } as any)) as any;
    return res.command;
    //#endregion
  };
  export const getWorkingDirOfProcess = (PID: number) => {
    //#region @backendFunc
    try {
      const cwd = child_process
        .execSync(`lsof -p ${PID} | awk '$4=="cwd" {print $9}'`)
        .toString()
        .trim();
      return cwd;
    } catch (e) {
      Helpers.error(e);
    }
    //#endregion
  };
  export const outputToVScode = (
    data:
      | {
          label: string;
          option: string;
        }[]
      | string,
    disableEncode = false,
  ) => {
    //#region @backendFunc
    if (_.isObject(data)) {
      data = JSON.stringify(data);
    }
    if (disableEncode) {
      console.log(data);
    } else {
      console.log(encodeURIComponent(data as any));
    }
    //#endregion
  };
  export const actionWrapper = async (
    fn: () => void,
    taskName: string = 'Task',
  ) => {
    //#region @backendFunc
    const currentDate = () => {
      return `[${dateformat(new Date(), 'dd-mm-yyyy HH:MM:ss')}]`;
    };
    // global.spinner && global.spinner.start()
    Helpers.taskStarted(`${currentDate()} "${taskName}" Started..`);
    await Helpers.runSyncOrAsync({ functionFn: fn });
    Helpers.taskDone(`${currentDate()} "${taskName}" Done`);
    // global.spinner && global.spinner.stop()
    //#endregion
  };
  export const terminalLine = () => {
    //#region @backendFunc
    return _.times(process.stdout.columns, () => '-').join('');
    //#endregion
  };
  export const killAllNodeExceptCurrentProcess = () => {
    //#region @backendFunc
    return new Promise<void>((resolve, reject) => {
      // Get the current process ID
      const currentProcessId = process.pid;
      // Command to list all Node.js processes
      const listProcessesCommand =
        process.platform === 'win32'
          ? 'tasklist /fi "imagename eq node.exe" /fo csv'
          : 'ps -A -o pid,command | grep node';
      // Execute the command to list processes
      exec(
        listProcessesCommand,
        { shell: process.platform === 'win32' ? 'cmd.exe' : void 0 },
        (error, stdout, stderr) => {
          if (error) {
            reject(
              new Error(
                `Error occurred while listing processes: ${error.message}`,
              ),
            );
            return;
          }
          if (stderr) {
            reject(
              new Error(`Error occurred while listing processes: ${stderr}`),
            );
            return;
          }
          // Split the output into lines and filter out non-node processes
          const processes = stdout
            .split('\n')
            .map(line => line.trim())
            .filter(
              line =>
                line.includes('node') &&
                !line.includes('grep') &&
                !line.includes('tasklist'),
            );
          // Extract the process IDs
          const processIds = processes.map(line =>
            parseInt(line.split(',')[1]),
          );
          // Filter out the current process ID
          const processesToKill = processIds
            .filter(id => id !== currentProcessId)
            .filter(f => !!f);
          // If there are no processes to kill, resolve immediately
          if (processesToKill.length === 0) {
            resolve();
            return;
          }
          // Kill the processes
          let numProcessesKilled = 0;
          processesToKill.forEach(id => {
            const killCommand =
              process.platform === 'win32'
                ? `taskkill /pid ${id} /f`
                : `kill ${id}`;
            exec(killCommand, error => {
              if (error) {
                console.error(
                  `Error occurred while killing process ${id}:`,
                  error,
                );
              } else {
                console.log(`Successfully killed process ${id}`);
              }
              numProcessesKilled++;
              if (numProcessesKilled === processesToKill.length) {
                resolve();
              }
            });
          });
        },
      );
    });
    //#endregion
  };
  export const killAllNode = () => {
    //#region @backendFunc
    Helpers.info('Killing all node processes...');
    try {
      if (process.platform === 'win32') {
        Helpers.run(`taskkill /f /im node.exe`, {
          output: false,
          silence: true,
        }).sync();
      } else {
        Helpers.run(`fkill -f node`, { output: false, silence: true }).sync();
      }
    } catch (error) {
      Helpers.error(
        `[${config.frameworkName}] not able to kill all node processes`,
        false,
        true,
      );
    }
    Helpers.info('DONE KILL ALL NODE PROCESSES');
    //#endregion
  };
  export const formatPath = (pathToFileOrFolder: string) => {
    //#region @backendFunc
    if (!_.isString(pathToFileOrFolder)) {
      return `\n< provided path is not string: ${pathToFileOrFolder} >\n`;
    }
    if (!path.isAbsolute(pathToFileOrFolder)) {
      return `\n
${HelpersTaon.terminalLine()}
relativePath: ${pathToFileOrFolder}
${HelpersTaon.terminalLine()}\n`;
    }
    if (!fse.existsSync(pathToFileOrFolder)) {
      return `\n
${HelpersTaon.terminalLine()}
< provided path does not exist: ${pathToFileOrFolder} >
${HelpersTaon.terminalLine()}\n`;
    }
    const isDirectory = fse.lstatSync(pathToFileOrFolder).isDirectory();
    return `
${HelpersTaon.terminalLine()}
<-- ${isDirectory ? 'Path to directory' : 'Path to file'}: -->
${
  isDirectory
    ? pathToFileOrFolder
        .split('/')
        .map(c => `/${c}`)
        .join('')
        .replace(/^\//, '')
    : path.dirname(
        pathToFileOrFolder
          .split('/')
          .map(c => `/${c}`)
          .join('')
          .replace(/^\//, ''),
      ) +
      '\n/' +
      CLI.chalk.bold(path.basename(pathToFileOrFolder))
}
${HelpersTaon.terminalLine()}\n`;
    //#endregion
  };
  export const prepareWatchCommand = cmd => {
    //#region @backendFunc
    return os.platform() === 'win32' ? `"${cmd}"` : `'${cmd}'`;
    //#endregion
  };
  export const getStringFrom = (
    command: string,
    descriptionOfCommand?: string,
  ) => {
    //#region @backendFunc
    try {
      const res = Helpers.run(command, { output: false }).sync().toString();
      return res;
    } catch (error) {
      Helpers.warn(
        `Not able to get string from "${descriptionOfCommand ? descriptionOfCommand : command}"`,
      );
      return void 0;
    }
    //#endregion
  };
  export const waitForMessegeInStdout = (
    proc: ChildProcess,
    message: string,
  ) => {
    //#region @backendFunc
    return new Promise((resolve, reject) => {
      let resolved = false;
      proc.stdout.on('data', data => {
        // console.log(`
        // [waitForMessegeInStdout] data: ${data}
        // [waitForMessegeInStdout] data typeof: ${typeof data}
        // `);
        if (_.isObject(data) && _.isFunction(data.toString)) {
          data = data.toString();
        }
        if (_.isString(data) && data.search(message) !== -1) {
          resolved = true;
          resolve(void 0);
        }
      });
      proc.once('exit', () => {
        // console.log(`
        // [waitForMessegeInStdout] exit: ${code}
        // `);
        if (!resolved) {
          reject();
        }
      });
    });
    //#endregion
  };

  //#endregion

  //#region arrays
  export namespace arrays {
    export const from = (s: string | string[]): string[] => {
      if (_.isArray(s)) {
        return s;
      }
      if (_.isString(s)) {
        return s.split(' ');
      }
    };
    export const second = arr => {
      if (!Array.isArray(arr) || arr.length < 2) {
        return void 0;
      }
      return arr[1];
    };
    export const arrayMoveElementBefore = <T = any>(
      arr: any[],
      a: any,
      b: any,
      prop?: keyof T,
    ) => {
      let indexA = prop
        ? arr.findIndex(elem => elem[prop] === a[prop])
        : arr.indexOf(a);
      _.pullAt(arr, indexA);
      let indexB = prop
        ? arr.findIndex(elem => elem[prop] === b[prop])
        : arr.indexOf(b);
      if (indexB === 0) {
        arr.unshift(a);
      } else {
        arr.splice(indexB - 1, 0, a);
      }
      return arr;
    };
    export const arrayMoveElementAfterB = <T = any>(
      arr: any[],
      a: any,
      b: any,
      prop?: keyof T,
    ) => {
      let indexA = prop
        ? arr.findIndex(elem => elem[prop] === a[prop])
        : arr.indexOf(a);
      _.pullAt(arr, indexA);
      let indexB = prop
        ? arr.findIndex(elem => elem[prop] === b[prop])
        : arr.indexOf(b);
      if (indexB === arr.length - 1) {
        arr.push(a);
      } else {
        arr.splice(indexB + 1, 0, a);
      }
      return arr;
    };
    export const moveObjectBefore = <T = any>(
      array: T[],
      target: T,
      before: T,
    ): T[] => {
      const newArray = [...array];
      const targetIndex = newArray.findIndex(item => item === target);
      const beforeIndex = newArray.findIndex(item => item === before);
      if (targetIndex === -1 || beforeIndex === -1) {
        // Handle the case when either the target or before object is not found in the array
        console.error('Target or Before object not found in the array');
        return newArray;
      }
      // Remove the target object from its current position
      newArray.splice(targetIndex, 1);
      // Insert the target object before the before object
      newArray.splice(beforeIndex, 0, target);
      return newArray;
    };
    export const moveObjectAfter = <T = any>(
      array: T[],
      target: T,
      after: T,
    ): T[] => {
      const newArray = [...array];
      const targetIndex = newArray.findIndex(item => item === target);
      const afterIndex = newArray.findIndex(item => item === after);
      if (targetIndex === -1 || afterIndex === -1) {
        // Handle the case when either the target or after object is not found in the array
        console.error('Target or After object not found in the array');
        return newArray;
      }
      // Remove the target object from its current position
      newArray.splice(targetIndex, 1);
      // Insert the target object after the after object
      newArray.splice(afterIndex + 1, 0, target);
      return newArray;
    };
    export const uniqArray = <T = any>(
      array: any[],
      uniqueProperty?: keyof T,
    ) => {
      return Utils.uniqArray(array, uniqueProperty);
    };
    export const sortKeys = obj => {
      return Utils.sortKeys(obj);
    };
    export const fuzzy = <T = any>(
      query: string,
      list: T[],
      valueFn?: (modelFromList: T) => string,
    ) => {
      // console.log('fuzzy search', query, list, valueFn)
      const fuzzyPkg = require('fuzzy');
      const resultsFuzzy = fuzzyPkg.filter(
        query,
        list.map(k => (valueFn ? valueFn(k) : k)),
      );
      const resultsFuzzyKebab = fuzzyPkg.filter(
        _.kebabCase(query),
        list.map(k => _.kebabCase((valueFn ? valueFn(k) : k) as any)),
      );
      const matches = resultsFuzzy.map(el => el.string);
      const matchesKebab = resultsFuzzyKebab.map(el => el.string);
      const results =
        resultsFuzzy.length === 0
          ? []
          : list.filter(k => {
              return matches.includes((valueFn ? valueFn(k) : k) as any);
            });
      if (matches.length === 0 && matchesKebab.length > 0) {
        const m = list.find(
          k =>
            _.kebabCase((valueFn ? valueFn(k) : k) as any) ===
            _.first(matchesKebab),
        );
        results.push(m);
        matches.push((valueFn ? valueFn(m) : m) as any);
      }
      return { matches, results };
    };
  }
  //#endregion

  //#region numbers
  export class HelpersNumber {
    /**
     * @deprecated
     * use _.random()
     */
    randomInteger = (max, min) => Math.round(Math.random() * (max - min)) + min;
  }
  //#endregion

  //#region strings
  export namespace strings {
    export const interpolateString = (value: string) => {
      if (typeof value !== 'string') {
        Helpers.warn(
          '[taon-heleprs] Value for interpolation is not string: ',
          value,
        );
        return value;
      }
      return {
        withParameters<T = any>(parameters: T) {
          if (typeof parameters !== 'object') {
            Helpers.log(parameters as any);
            Helpers.warn('[taon-heleprs] Parameters are not a object: ');
            return value;
          }
          return value.replace(/{([^{}]*)}/g, function (a, b) {
            var r = parameters[b];
            return typeof r === 'string' || typeof r === 'number' ? r : a;
          } as any);
        },
      };
    };
    export const numValue = (pixelsCss: string) => {
      // tslint:disable-next-line:radix
      return parseInt(pixelsCss.replace('px', ''));
    };
    export const splitIfNeed = (stringOrArr: string | string[]): string[] => {
      let res = [];
      if (_.isArray(stringOrArr)) {
        res = stringOrArr.map(s => {
          return s.trim();
        });
      }
      if (_.isString(stringOrArr)) {
        res = stringOrArr.split(/\s*[\s,]\s*/);
      }
      return res.filter(f => !!f && f.trim() !== '');
    };
    export const removeDoubleOrMoreEmptyLines = (s: string) => {
      s = s
        ?.split('\n')
        .map(f => f.trimRight())
        .join('\n');
      return s?.replace(/(\r\n|\r|\n){2,}/g, '$1\n');
    };
    export const plural = (word: string, amount?: number): string => {
      if (amount !== undefined && amount === 1) {
        return word;
      }
      const plural: {
        [key: string]: string;
      } = {
        '(quiz)$': '$1zes',
        '^(ox)$': '$1en',
        '([m|l])ouse$': '$1ice',
        '(matr|vert|ind)ix|ex$': '$1ices',
        '(x|ch|ss|sh)$': '$1es',
        '([^aeiouy]|qu)y$': '$1ies',
        '(hive)$': '$1s',
        '(?:([^f])fe|([lr])f)$': '$1$2ves',
        '(shea|lea|loa|thie)f$': '$1ves',
        sis$: 'ses',
        '([ti])um$': '$1a',
        '(tomat|potat|ech|her|vet)o$': '$1oes',
        '(bu)s$': '$1ses',
        '(alias)$': '$1es',
        '(octop)us$': '$1i',
        '(ax|test)is$': '$1es',
        '(us)$': '$1es',
        '([^s]+)$': '$1s',
      };
      const irregular: {
        [key: string]: string;
      } = {
        move: 'moves',
        foot: 'feet',
        goose: 'geese',
        sex: 'sexes',
        child: 'children',
        man: 'men',
        tooth: 'teeth',
        person: 'people',
      };
      const uncountable: string[] = [
        'sheep',
        'fish',
        'deer',
        'moose',
        'series',
        'species',
        'money',
        'rice',
        'information',
        'equipment',
        'bison',
        'cod',
        'offspring',
        'pike',
        'salmon',
        'shrimp',
        'swine',
        'trout',
        'aircraft',
        'hovercraft',
        'spacecraft',
        'sugar',
        'tuna',
        'you',
        'wood',
      ];
      // save some time in the case that singular and plural are the same
      if (uncountable.indexOf(word.toLowerCase()) >= 0) {
        return word;
      }
      // check for irregular forms
      for (const w in irregular) {
        const pattern = new RegExp(`${w}$`, 'i');
        const replace = irregular[w];
        if (pattern.test(word)) {
          return word.replace(pattern, replace);
        }
      }
      // check for matches using regular expressions
      for (const reg in plural) {
        const pattern = new RegExp(reg, 'i');
        if (pattern.test(word)) {
          return word.replace(pattern, plural[reg]);
        }
      }
      return word;
    };
    export const singular = (word: string, amount?: number): string => {
      if (amount !== undefined && amount !== 1) {
        return word;
      }
      const singular: {
        [key: string]: string;
      } = {
        '(quiz)zes$': '$1',
        '(matr)ices$': '$1ix',
        '(vert|ind)ices$': '$1ex',
        '^(ox)en$': '$1',
        '(alias)es$': '$1',
        '(octop|vir)i$': '$1us',
        '(cris|ax|test)es$': '$1is',
        '(shoe)s$': '$1',
        '(o)es$': '$1',
        '(bus)es$': '$1',
        '([m|l])ice$': '$1ouse',
        '(x|ch|ss|sh)es$': '$1',
        '(m)ovies$': '$1ovie',
        '(s)eries$': '$1eries',
        '([^aeiouy]|qu)ies$': '$1y',
        '([lr])ves$': '$1f',
        '(tive)s$': '$1',
        '(hive)s$': '$1',
        '(li|wi|kni)ves$': '$1fe',
        '(shea|loa|lea|thie)ves$': '$1f',
        '(^analy)ses$': '$1sis',
        '((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$':
          '$1$2sis',
        '([ti])a$': '$1um',
        '(n)ews$': '$1ews',
        '(h|bl)ouses$': '$1ouse',
        '(corpse)s$': '$1',
        '(us)es$': '$1',
        s$: '',
      };
      const irregular: {
        [key: string]: string;
      } = {
        move: 'moves',
        foot: 'feet',
        goose: 'geese',
        sex: 'sexes',
        child: 'children',
        man: 'men',
        tooth: 'teeth',
        person: 'people',
      };
      const uncountable: string[] = [
        'sheep',
        'fish',
        'deer',
        'moose',
        'series',
        'species',
        'money',
        'rice',
        'information',
        'equipment',
        'bison',
        'cod',
        'offspring',
        'pike',
        'salmon',
        'shrimp',
        'swine',
        'trout',
        'aircraft',
        'hovercraft',
        'spacecraft',
        'sugar',
        'tuna',
        'you',
        'wood',
      ];
      // save some time in the case that singular and plural are the same
      if (uncountable.indexOf(word.toLowerCase()) >= 0) {
        return word;
      }
      // check for irregular forms
      for (const w in irregular) {
        const pattern = new RegExp(`${irregular[w]}$`, 'i');
        const replace = w;
        if (pattern.test(word)) {
          return word.replace(pattern, replace);
        }
      }
      // check for matches using regular expressions
      for (const reg in singular) {
        const pattern = new RegExp(reg, 'i');
        if (pattern.test(word)) {
          return word.replace(pattern, singular[reg]);
        }
      }
      return word;
    };
  }
  //#endregion

  //#region paths
  export namespace paths {
    export function create(...pathPart: string[]) {
      return path.join(...pathPart);
    }

    export function PREFIX(baseFileName) {
      return `${BaselineSiteJoinprefix}${baseFileName}`;
    }
    export function removeRootFolder(filePath: string) {
      return filePath.replace(
        new RegExp(`^${config.regexString.pathPartStringRegex}`, 'g'),
        '',
      );
    }
    export function removeExtension(filePath: string) {
      return removeExt(filePath);
      // const ext = path.extname(filePath);
      // return path.join(path.dirname(filePath), path.basename(filePath, ext))
    }
    export function removeExt(filePath: string) {
      return filePath.replace(/\.[^\/.]+$/, '');
    }
  }
  //#endregion

  export const checksum = (
    absolutePathToFileOrContent: string,
    algorithm?: 'md5' | 'sha1',
  ) => {
    //#region @backendFunc
    const fileContent = path.isAbsolute(absolutePathToFileOrContent)
      ? Helpers.readFile(absolutePathToFileOrContent)
      : absolutePathToFileOrContent;
    return createHash(algorithm || 'md5')
      .update(fileContent, 'utf8')
      .digest('hex');
    //#endregion
  };
  export const getValueFromJSON = (
    filepath: string,
    lodashGetPath: string,
    defaultValue = void 0,
  ): any => {
    //#region @backendFunc
    if (!fse.existsSync(filepath)) {
      return defaultValue;
    }
    const json = Helpers.readJson(filepath);
    return _.get(json, lodashGetPath, defaultValue);
    //#endregion
  };
  export const getValueFromJSONC = (
    filepath: string,
    lodashGetPath: string,
    defaultValue = void 0,
  ): any => {
    //#region @backendFunc
    if (!fse.existsSync(filepath)) {
      return defaultValue;
    }
    const json = Helpers.readJson5(filepath);
    return _.get(json, lodashGetPath, defaultValue);
    //#endregion
  };
  export const readValueFromJson = (
    filepath: string,
    lodashGetPath: string,
    defaultValue = void 0,
  ): any => {
    //#region @backendFunc
    return HelpersTaon.getValueFromJSON(filepath, lodashGetPath, defaultValue);
    //#endregion
  };
  export const readValueFromJsonC = (
    filepath: string,
    lodashGetPath: string,
    defaultValue = void 0,
  ): any => {
    //#region @backendFunc
    return HelpersTaon.getValueFromJSONC(filepath, lodashGetPath, defaultValue);
    //#endregion
  };
  export const setValueToJSON = (
    filepath: string | string[],
    lodashGetPath: string,
    value: any,
  ): void => {
    //#region @backendFunc
    if (_.isArray(filepath)) {
      filepath = crossPlatformPath(filepath);
    }
    if (!fse.existsSync(filepath)) {
      Helpers.warn(`Recreating unexised json file: ${filepath}`);
      Helpers.writeFile(filepath, '{}');
    }
    const json = Helpers.readJson(filepath);
    _.set(json, lodashGetPath, value);
    Helpers.writeJson(filepath, json);
    //#endregion
  };
  export const setValueToJSONC = (
    filepath: string,
    lodashGetPath: string,
    value: any,
  ): void => {
    //#region @backendFunc
    if (!fse.existsSync(filepath)) {
      Helpers.warn(`Recreating unexised json file: ${filepath}`);
      Helpers.writeFile(filepath, '{}');
    }
    const json = Helpers.readJsonC(filepath);
    _.set(json, lodashGetPath, value);
    Helpers.writeJsonC(filepath, json);
    //#endregion
  };
  export const size = (filePath: string): number => {
    //#region @backendFunc
    if (!Helpers.exists(filePath) || Helpers.isFolder(filePath)) {
      return null;
    }
    return fse.lstatSync(filePath).size;
    //#endregion
  };
  export const pathFromLink = (filePath: string): string => {
    //#region @backendFunc
    return fse.readlinkSync(filePath);
    //#endregion
  };
  export const renameFolder = (
    from: string,
    to: string,
    cwd?: string,
  ): void => {
    //#region @backendFunc
    HelpersTaon.renameFiles(from, to, cwd);
    //#endregion
  };
  export const renameFiles = (from: string, to: string, cwd?: string): void => {
    //#region @backendFunc
    try {
      const directoryPath = cwd || '.';
      // Read all files in the directory
      const files = fse.readdirSync(directoryPath);
      files.forEach(file => {
        // Check if the file name includes the 'from' pattern
        if (file.includes(from)) {
          const newFileName = file.replace(from, to);
          const currentPath = path.join(directoryPath, file);
          const newPath = path.join(directoryPath, newFileName);
          // Rename the file
          fse.renameSync(currentPath, newPath);
          console.log(`Renamed file from ${currentPath} to ${newPath}`);
        }
      });
    } catch (error) {
      console.error(`Error renaming files from ${from} to ${to}:`, error);
    }
    //#endregion
  };
  export const getTempFolder = () => {
    //#region @backendFunc
    let tmp = '/tmp';
    if (process.platform === 'darwin') {
      tmp = '/private/tmp';
    }
    if (process.platform === 'win32') {
      tmp = crossPlatformPath([
        UtilsOs.getRealHomeDir(),
        '/AppData/Local/Temp',
      ]);
    }
    if (!Helpers.exists(tmp)) {
      Helpers.mkdirp(tmp);
    }
    return tmp;
    //#endregion
  };
  export const isPlainFileOrFolder = (filePath: string): boolean => {
    //#region @backendFunc
    return /^([a-zA-Z]|\-|\_|\@|\#|\$|\!|\^|\&|\*|\(|\))+$/.test(filePath);
    //#endregion
  };
  export const requireUncached = (module: string): any => {
    //#region @backendFunc
    delete require.cache[require.resolve(module)];
    return require(module);
    //#endregion
  };
  export const requireJs = (jsFilePath: string) => {
    //#region @backendFunc
    const orgPath = jsFilePath;
    if (!fse.existsSync(jsFilePath)) {
      jsFilePath = `${jsFilePath}.js`;
    }
    if (!fse.existsSync(jsFilePath)) {
      Helpers.error(`Not able to find path: ${orgPath}`);
    }
    let fileContent = fse.readFileSync(jsFilePath).toLocaleString();
    (() => {
      const stringForRegex = `require\\(("|')\\.\\/([a-zA-Z0-9]|\\/|\\-|\\_|\\+|\\.)*("|')\\)`;
      Helpers.log(
        `[taon-helpre][require][${jsFilePath}] stringForRegex: ${stringForRegex}`,
        1,
      );
      fileContent = fileContent
        .split('\n')
        .map(line => {
          const matches = line.match(new RegExp(stringForRegex));
          if (matches !== null) {
            // console.log('matched', matches)
            const rep = _.first(matches) as string;
            if (rep) {
              const newFilename = crossPlatformPath([
                path.dirname(jsFilePath),
                rep.split('(')[1].replace(/("|'|\))/g, ''),
              ]);
              line = line.replace(rep, `require('${newFilename}')`);
            }
            // console.log(line)
          }
          // console.log('matched', matches)
          return line;
        })
        .join('\n');
    })();
    (() => {
      const stringForRegex = `require\\(("|')([a-zA-Z0-9]|\\/|\\-|\\_|\\+|\\.)*("|')\\)`;
      Helpers.log(
        `[taon-helpre][require][${jsFilePath}] stringForRegex: ${stringForRegex}`,
        1,
      );
      fileContent = fileContent
        .split('\n')
        .map(line => {
          // console.log(`LINE: "${line}"`)
          const matches = line.match(new RegExp(stringForRegex));
          if (matches !== null) {
            // console.log('matched', matches)
            const rep = _.first(matches) as string;
            if (rep) {
              const relativePart = rep.split('(')[1].replace(/("|'|\))/g, '');
              // console.log(`RELATIVE PART: "${relativePart}"`)
              if (
                relativePart.search('/') !== -1 &&
                !relativePart.startsWith('/')
              ) {
                const newFilename = crossPlatformPath([
                  path.dirname(jsFilePath),
                  'node_modules',
                  relativePart,
                ]);
                line = line.replace(rep, `require('${newFilename}')`);
              }
            }
            // console.log(line)
          }
          // console.log('matched', matches)
          return line;
        })
        .join('\n');
    })();
    return eval(fileContent);
    //#endregion
  };
  export const tryRecreateDir = (dirpath: string): void => {
    //#region @backendFunc
    try {
      Helpers.mkdirp(dirpath);
    } catch (error) {
      Helpers.log(`Trying to recreate directory: ${dirpath}`);
      Helpers.sleep(1);
      Helpers.mkdirp(dirpath);
    }
    //#endregion
  };
  export const tryCopyFrom = (
    source: string,
    destination: string,
    options = {},
  ): void => {
    //#region @backendFunc
    Helpers.log(`Trying to copy from: ${source} to ${destination}`);
    destination = crossPlatformPath(destination);
    source = crossPlatformPath(source);
    if (source === destination) {
      Helpers.warn(
        '[taon-helpers] Probably error... trying to copy the same folder...',
      );
      return;
    }
    if (fse.existsSync(source) && !fse.lstatSync(source).isDirectory()) {
      // Helpers.warn(`[tryCopyFrom] This source is not directory: ${source} to ${destination}`);
      HelpersTaon.copyFile(source, destination);
      return;
    }
    if (fse.existsSync(destination.replace(/\/$/, ''))) {
      const destMaybe = destination.replace(/\/$/, '');
      const stats = fse.lstatSync(destMaybe);
      const isNotDirectory = !stats.isDirectory();
      const isSymbolicLink = stats.isSymbolicLink();
      if (isNotDirectory || isSymbolicLink) {
        rimraf.sync(destMaybe);
      }
    }
    options = _.merge(
      {
        overwrite: true,
        recursive: true,
      },
      options,
    );
    if (process.platform === 'win32') {
      // TODO QUICK_FIX
      options['dereference'] = true;
    }
    try {
      fse.copySync(source, destination, options);
    } catch (error) {
      rimraf.sync(destination);
      fse.copySync(source, destination, options);
    }
    //#endregion
  };
  export const move = (
    from: string,
    to: string,
    options?: {
      purpose?: string; // for logging purposes
    },
  ): void => {
    UtilsFilesFoldersSync.move(from, to, options);
  };
  export const findChildren = <T = any>(
    location: string,
    createFn: (childLocation: string) => T,
    options?: {
      allowAllNames: boolean;
    },
  ): T[] => {
    //#region @backendFunc
    const { allowAllNames } = options || {};
    let folders = Helpers.values(config.folder);
    folders = folders.filter(
      f =>
        ![
          config.folder.shared,
          // TODO add something more here ?
        ].includes(f),
    );
    const notAllowed: RegExp[] = [
      '.vscode',
      'node_modules',
      ...(allowAllNames
        ? []
        : [
            ...folders,
            'e2e',
            'tmp.*',
            'dist.*',
            'tests',
            'module',
            'browser',
            'bundle*',
            'components',
            '.git',
            'bin',
            'custom',
          ]),
    ]
      .filter(f => {
        return ![config.folder.external].includes(f) && _.isString(f);
      })
      .map(s => new RegExp(`^${Utils.escapeStringForRegEx(s)}$`));
    const isDirectory = (source: string): boolean =>
      fse.lstatSync(source).isDirectory();
    const getDirectories = (source: string): string[] =>
      fse
        .readdirSync(source)
        .map(name => path.join(source, name))
        .filter(isDirectory);
    let subdirectories = getDirectories(location).filter(f => {
      const folderNam = path.basename(f);
      const allowed = notAllowed.filter(p => p.test(folderNam)).length === 0;
      return allowed;
    });
    // console.log(subdirectories)
    return subdirectories
      .map(dir => {
        // console.log('child:', dir)
        return createFn(dir);
      })
      .filter(c => !!c);
    //#endregion
  };
  export const findChildrenNavi = <T = any>(
    location: string,
    createFn: (childLocation: string) => T,
  ): T[] => {
    //#region @backendFunc
    if (!fse.existsSync(location)) {
      return [];
    }
    const notAllowed: RegExp[] = [
      '.vscode',
      'node_modules',
      ...Helpers.values(config.folder),
      'e2e',
      'tmp.*',
      'dist.*',
      'tests',
      'module',
      'browser',
      'bundle*',
      'components',
      '.git',
      '.build',
      'bin',
      'custom',
    ].map(s => new RegExp(s));
    const isDirectory = source => fse.lstatSync(source).isDirectory();
    const getDirectories = source =>
      fse
        .readdirSync(source)
        .map(name => path.join(source, name))
        .filter(isDirectory);
    let subdirectories = getDirectories(location).filter(f => {
      const folderName = path.basename(f);
      if (/.*es\-.*/.test(folderName)) {
        return true;
      }
      return notAllowed.filter(p => p.test(folderName)).length === 0;
    });
    return subdirectories
      .map(dir => {
        return createFn(dir);
      })
      .filter(c => !!c);
    //#endregion
  };
  export const getRecrusiveFilesFrom = (
    dir: string,
    ommitFolders: string[] = [],
    options?: GetRecrusiveFilesFromOptions,
  ): string[] => {
    //#region @backendFunc
    options = options ? options : {};
    // const withNameOnly = options.withNameOnly;
    let files = [];
    const readedFilesAndFolders = fse.existsSync(dir)
      ? fse.readdirSync(dir)
      : [];
    const readed = readedFilesAndFolders
      .map(relativePathToFile => {
        const fullPath = crossPlatformPath([dir, relativePathToFile]);
        // console.log(`is direcotry ${fse.lstatSync(fullPath).isDirectory()} `, fullPath)
        if (fse.lstatSync(fullPath).isDirectory()) {
          if (
            ommitFolders.includes(path.basename(fullPath)) ||
            ommitFolders.includes(path.basename(path.dirname(fullPath)))
          ) {
            // Helpers.log(`Omitting: ${fullPath}`)
          } else {
            HelpersTaon.getRecrusiveFilesFrom(
              fullPath,
              ommitFolders,
              options,
            ).forEach(aa => files.push(aa));
          }
          return;
        }
        return fullPath;
      })
      .filter(f => !!f);
    if (Array.isArray(readed)) {
      readed.forEach(r => files.push(r));
    }
    return files;
    //#endregion
  };
  export const checkIfNameAllowedForTaonProj = (
    folderName: string,
  ): boolean => {
    //#region @backendFunc
    const notAllowed: RegExp[] = [
      '^.vscode$',
      '^node_modules$',
      ...Helpers.values(config.tempFolders).map(v => `^${v}$`),
      '^e2e$',
      '^tmp.*',
      '^dist.*',
      '^tests$',
      '^module$',
      '^browser',
      'bundle*',
      '^components$',
      '.git',
      '^bin$',
      '^custom$',
      '^linked-repos$',
    ].map(s => new RegExp(s));
    return notAllowed.filter(p => p.test(folderName)).length === 0;
    //#endregion
  };
  export const getLinesFromFiles = (
    filename: string,
    lineCount?: number,
  ): Promise<string[]> => {
    //#region @backendFunc
    return new Promise<string[]>((resolve, reject) => {
      let stream = fse.createReadStream(filename, {
        flags: 'r',
        encoding: 'utf-8',
        fd: null,
        mode: 438, // 0666 in Octal
        // bufferSize: 64 * 1024 as any
      });
      let data = '';
      let lines = [];
      stream.on('data', function (moreData) {
        data += moreData;
        lines = data.split('\n');
        // probably that last line is "corrupt" - halfway read - why > not >=
        if (lines.length > lineCount + 1) {
          stream.destroy();
          lines = lines.slice(0, lineCount); // junk as above
          resolve(lines);
        }
      });
      stream.on('error', function () {
        reject(`Error reading ${filename}`);
      });
      stream.on('end', function () {
        resolve(lines);
      });
    });
    //#endregion
  };
  export const getMostRecentFileName = (dir: string): string => {
    //#region @backendFunc
    let files = HelpersTaon.getRecrusiveFilesFrom(dir);
    const underscore = require('underscore');
    // use underscore for max()
    return underscore.max(files, f => {
      // TODO refactor to lodash
      // console.log(f);
      // ctime = creation time is used
      // replace with mtime for modification time
      // console.log( `${fse.statSync(f).mtimeMs} for ${f}`   )
      return fse.statSync(f).mtimeMs;
    });
    //#endregion
  };
  export const getMostRecentFilesNames = (dir: string): string[] => {
    //#region @backendFunc
    const allFiles = HelpersTaon.getRecrusiveFilesFrom(dir);
    const mrf = HelpersTaon.getMostRecentFileName(dir);
    const mfrMtime = fse.lstatSync(mrf).mtimeMs;
    return allFiles.filter(f => {
      const info = fse.lstatSync(f);
      return info.mtimeMs === mfrMtime && !info.isDirectory();
    });
    //#endregion
  };
  export const removeExcept = (
    fromPath: string,
    exceptFolderAndFiles: string[],
  ): void => {
    //#region @backendFunc
    fse
      .readdirSync(fromPath)
      .filter(f => {
        return !exceptFolderAndFiles.includes(f);
      })
      .map(f => path.join(fromPath, f))
      .forEach(af => Helpers.removeFolderIfExists(af));
    glob
      .sync(`${fromPath}/*.*`)
      .filter(f => {
        return !exceptFolderAndFiles.includes(path.basename(f));
      })
      .forEach(af => Helpers.removeFileIfExists(af));
    //#endregion
  };
  export const copyFolderOsNative = async (
    from: string,
    to: string,
    options?: {
      removeDestination?: boolean;
    },
  ): Promise<void> => {
    //#region @backendFunc
    options = options || {};
    if (options.removeDestination) {
      Helpers.removeSymlinks(to);
      Helpers.remove(to, true);
    }
    const isWin = os.platform() === 'win32';
    const escape = (p: string) =>
      isWin ? `"${p.replace(/\//g, '\\')}"` : `"${p}"`;
    const fromEscaped = escape(from);
    const toEscaped = escape(to);
    let command: string;
    if (isWin) {
      // robocopy returns code 1 for successful copy, so we ignore non-zero exit code
      // /E = copy all including empty folders
      // /NFL /NDL /NJH /NJS /NC /NS = reduce console noise
      command = `robocopy ${fromEscaped} ${toEscaped} /E /NFL /NDL /NJH /NJS /NC /NS`;
    } else {
      // -R = recursive, -p = preserve permissions
      command = `cp -Rp ${fromEscaped} ${toEscaped}`;
    }
    const execAsync = promisify(child_process.exec);
    try {
      const { stdout, stderr } = await execAsync(command);
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    } catch (err: any) {
      // robocopy returns non-zero even on success (code 1 = OK), so we allow that
      if (isWin && err.code === 1) return;
      throw new Error(`Failed to copy folder: ${err.message}`);
    }
    //#endregion
  };
  export const copy = (
    sourceDir: string | string[],
    destinationDir: string | string[],
    options?: {
      filter?: any;
      overwrite?: boolean;
      recursive?: boolean;
      asSeparatedFiles?: boolean;
      asSeparatedFilesAllowNotCopied?: boolean;
      asSeparatedFilesSymlinkAsFile?: boolean;
      /**
       * folders to omit: example: ['src','node_modules']
       *
       * This option works only with omitFoldersBaseFolder
       */
      omitFolders?: string[];
      /**
       * absolute path for base folder for omitFolder option
       */
      omitFoldersBaseFolder?: string;
      copySymlinksAsFiles?: boolean;
      copySymlinksAsFilesDeleteUnexistedLinksFromSourceFirst?: boolean;
      useTempFolder?: boolean;
      dontAskOnError?: boolean;
    } & CopyOptionsSync,
  ): void => {
    UtilsFilesFoldersSync.copy(sourceDir, destinationDir, options);
  };
  export const filterDontCopy = (
    basePathFoldersTosSkip: string[],
    projectOrBasepath: string,
  ) => {
    return UtilsFilesFoldersSync.filterDontCopy(
      basePathFoldersTosSkip,
      projectOrBasepath,
    );
  };
  export const filterOnlyCopy = (
    basePathFoldersOnlyToInclude: string[],
    projectOrBasepath: string,
  ) => {
    return UtilsFilesFoldersSync.filterOnlyCopy(
      basePathFoldersOnlyToInclude,
      projectOrBasepath,
    );
  };
  export const copyFile = (
    sourcePath: string | string[],
    destinationPath: string | string[],
    options?: {
      transformTextFn?: (input: string) => string;
      debugMode?: boolean;
      fast?: boolean;
      dontCopySameContent?: boolean;
    },
  ): boolean => {
    return UtilsFilesFoldersSync.copyFile(sourcePath, destinationPath, options);
  };

  /**
   * @deprecated
   * use _.random()
   */
  export const randomInteger = (max, min) =>
    Math.round(Math.random() * (max - min)) + min;

  export const resolve = (fileOrFolderPath: string): string => {
    //#region @backendFunc
    if (fileOrFolderPath.startsWith('~')) {
      fileOrFolderPath = crossPlatformPath([
        UtilsOs.getRealHomeDir(),
        fileOrFolderPath.replace(`~/`, ''),
      ]);
    }
    return crossPlatformPath(path.resolve(fileOrFolderPath));
    //#endregion
  };

  export const CLIWRAP = (f: Function, name: string) => {
    CLASS.setName(f, name);
    return f;
  };

  /**
   * Strips TypeScript types and emits plain JS files.
   * - No type-checking
   * - No bundling
   * - No tsconfig
   * - Preserves folder structure
   */
  export const stripTsTypesIntoJs = async (
    entrypointFolderAbsPathWithIndexTs: string,
    outFolderWithIndexJS: string,
  ): Promise<void> => {
    //#region @backendFunc
    UtilsTypescript.stripTsTypesIntoJs(entrypointFolderAbsPathWithIndexTs,outFolderWithIndexJS);
    return;
    // ESBULD does "extra" things to js output
    // entrypointFolderAbsPathWithIndexTs = crossPlatformPath(
    //   entrypointFolderAbsPathWithIndexTs,
    // );
    // const srcRoot = entrypointFolderAbsPathWithIndexTs;
    // const outRoot = outFolderWithIndexJS;
    // const esbuildImportName = 'esbuild';
    // const esbuild = await import(esbuildImportName);
    // await esbuild.build({
    //   entryPoints: [path.join(srcRoot, '**/*.ts')],

    //   outdir: outRoot,
    //   outbase: srcRoot,

    //   bundle: false, // 🚫 no graph walking
    //   format: 'esm', // matches your barrel exports
    //   platform: 'node',
    //   target: 'node20',

    //   sourcemap: false,
    //   minify: false,

    //   logOverride: {
    //     'unsupported-require-call': 'silent',
    //   },

    //   tsconfig: undefined, // 🚫 NO tsconfig
    //   logLevel: 'warning',

    //   loader: {
    //     '.ts': 'ts',
    //   },
    // });

    //#endregion
  };

  export const bundleCodeIntoSingleFile = async (
    pathToJsFile: string,
    outputFilePath: string,
    options?: {
      strategy?: 'cli' | 'vscode-ext' | 'node-app' | 'electron-app';
      /**
       * ! beforeWrite needs to return output
       */
      beforeWrite?: (options: {
        output?: string;
        copyToDestination?: (fileOrFolderAbsPath: string) => void;
      }) => string;
      additionalExternals?: string[];
      additionalReplaceWithNothing?: string[];
      skipFixingSQLlite?: boolean;
      minify?: boolean;
      /**
       * TODO
       */
      prod?: boolean;
      useTsConfig?: boolean;
    },
  ): Promise<void> => {
    //#region @backendFunc
    let {
      beforeWrite,
      additionalExternals,
      additionalReplaceWithNothing,
      skipFixingSQLlite,
      minify,
      prod,
      strategy,
      useTsConfig,
    } = options || {};
    if (!strategy) {
      strategy = 'cli';
    }
    Helpers.info(`Bundling (strategy = ${strategy})
       ${pathToJsFile}
       to
        ${outputFilePath}
       `);
    let replaceWithNothing = Utils.uniqArray([
      'esbuild',
      ...(additionalReplaceWithNothing || []),
    ]);
    let externals = Utils.uniqArray([
      'esbuild',
      'electron',
      'vscode',
      'ts-node',
      // 'webpack',
      // 'typescript',
      ...(additionalExternals || []),
    ]);
    Helpers.logInfo(`Externals for bundle: ${externals.join(',')}`);
    // if (strategy === 'vscode-ext') {
    //   // typescript is needed/bundle with vscode extension
    //   externals = externals.filter(f => f !== 'typescript');
    // }
    if (strategy === 'vscode-ext') {
      replaceWithNothing.push('ts-node');
    }
    if (strategy !== 'electron-app') {
      replaceWithNothing.push('electron');
    }
    if (strategy === 'node-app') {
      externals.push('sql.js');
    }
    Helpers.logInfo(
      `Replace with 'nothing' in destination bundle: ${replaceWithNothing.join(',')}`,
    );
    Helpers.taskStarted(`Bundling node_modules for file: ${pathToJsFile}`);
    // debugger
    const esbuildImportName = 'esbuild';
    const esbuild = await import(esbuildImportName);
    const data = await esbuild.build({
      entryPoints: [pathToJsFile],
      bundle: true,
      platform: 'node',
      target: 'node20', // closest to es2022 in runtime
      minify: !!minify,
      sourcemap: false,
      treeShaking: true,
      external: externals, // array of package names to leave unbundled
      // outfile: outputFilePath, // or use write: false if you want in-memory result
      write: false, // don’t write to disk, just return the result
      logLevel: 'silent', // like quiet: true
      format: 'cjs', // CommonJS output like NCC
      ...(useTsConfig
        ? {
            tsconfigRaw: {
              compilerOptions: {
                skipLibCheck: true,
                strict: false,
                jsx: 'preserve',
                experimentalDecorators: true,
                emitDecoratorMetadata: true, // if you use TypeORM / Angular DI
                useDefineForClassFields: false, // Angular-safe default
              },
            },
          }
        : {}),
    } as BuildOptions);
    let output = data.outputFiles[0].text;
    // const data = await require('@vercel/ncc')(pathToJsFile, {
    //   //#region ncc options
    //   // provide a custom cache path or disable caching
    //   cache: false,
    //   // externals to leave as requires of the build
    //   externals,
    //   // directory outside of which never to emit assets
    //   // filterAssetBase: process.cwd(), // default
    //   minify: !!minify, // default
    //   sourceMap: false, // default
    //   // assetBuilds: false, // default
    //   // sourceMapBasePrefix: '../', // default treats sources as output-relative
    //   // when outputting a sourcemap, automatically include
    //   // source-map-support in the output file (increases output by 32kB).
    //   // sourceMapRegister: true, // default
    //   watch: false, // default
    //   license: '', // default does not generate a license file
    //   target: 'es2022', // default
    //   v8cache: false, // default
    //   quiet: false, // default
    //   debugLog: false, // default
    //   //#endregion
    // });
    // let output = data.code;
    if (!skipFixingSQLlite) {
      output = UtilsQuickFixes.replaceKnownFaultyCode(output);
    }
    replaceWithNothing.forEach(r => {
      if (output) {
        output = UtilsQuickFixes.replaceElectronWithNothing(output, r);
      }
    });
    if (_.isFunction(beforeWrite)) {
      output = await Helpers.runSyncOrAsync({
        functionFn: beforeWrite,
        arrayOfParams: [
          {
            output,
            copyToDestination(fileOrFolderAbsPath: string): void {
              const destiantion = crossPlatformPath([
                path.dirname(outputFilePath),
                path.basename(fileOrFolderAbsPath),
              ]);
              if (Helpers.isFolder(fileOrFolderAbsPath)) {
                HelpersTaon.copy(fileOrFolderAbsPath, destiantion);
              } else {
                HelpersTaon.copy(fileOrFolderAbsPath, destiantion);
              }
            },
          },
        ],
      });
    }
    Helpers.writeFile(outputFilePath, output);
    Helpers.taskDone('[ncc] Bundling done');
    //#endregion
  };
  export const uniqArray = <T = any>(
    array: any[],
    uniqueProperty?: keyof T,
  ): T[] => {
    //#region @backendFunc
    // @ts-ignore
    return HelpersTaon.arrays.uniqArray<T>(array, uniqueProperty);
    //#endregion
  };
  export const slash = (pathFromWindowsOrUnixType: string) => {
    //#region @backendFunc
    return crossPlatformPath(pathFromWindowsOrUnixType);
    //#endregion
  };
  export const isElevated = async () => {
    //#region @backend
    if (!(await isElevatedCore())) {
      Helpers.error(
        `[taon-helpers] Please run this program as sudo (or admin on windows)`,
        false,
        true,
      );
    }
    //#endregion
  };
  export const mesureExectionInMs = async (
    description: string,
    functionToExecute: Function,
    ...functionArguments: any[]
  ): Promise<number> => {
    var start = new Date();
    await Helpers.runSyncOrAsync({
      functionFn: functionToExecute,
      arrayOfParams: functionArguments,
    });
    //@ts-ignore
    var end = new Date() - start;
    if (Helpers.getIsBrowser()) {
      Helpers.info(`Execution time: ${end.toString()}ms for "${description}"`);
    }
    //#region @backend
    Helpers.info(
      `Execution time: ${CLI.chalk.bold(end.toString())}ms for "${CLI.chalk.bold(description)}"`,
    );
    //#endregion
    return end;
  };
  export const mesureExectionInMsSync = (
    description: string,
    functionToExecute: () => void,
  ): number => {
    var start = new Date();
    functionToExecute();
    //@ts-ignore
    var end = new Date() - start;
    if (Helpers.getIsBrowser()) {
      Helpers.info(`Execution time: ${end.toString()}ms for "${description}"`);
    }
    //#region @backend
    Helpers.info(
      `Execution time: ${CLI.chalk.bold(end.toString())}ms for "${CLI.chalk.bold(description)}"`,
    );
    //#endregion
    return end;
  };
  export const waitForCondition = (
    conditionFn: (any) => boolean,
    howOfftenCheckInMs = 1000,
  ) => {
    return new Promise(async (resolve, reject) => {
      const result = await Helpers.runSyncOrAsync({ functionFn: conditionFn });
      if (result) {
        resolve(void 0);
      } else {
        setTimeout(() => {
          waitForCondition(conditionFn, howOfftenCheckInMs).then(() => {
            resolve(void 0);
          });
        }, howOfftenCheckInMs);
      }
    });
  };
  export const getMethodName = (classObject, method): string => {
    var methodName = null;
    Object.getOwnPropertyNames(classObject).forEach(prop => {
      if (classObject[prop] === method) {
        methodName = prop;
      }
    });
    if (methodName !== null) {
      return methodName;
    }
    var proto = Object.getPrototypeOf(classObject);
    if (proto) {
      return getMethodName(proto, method);
    }
    return null;
  };
  export const fixWebpackEnv = (env: Object) => {
    _.forIn(env, (v, k) => {
      const value: string = v as any;
      if (value === 'true') env[k] = true;
      if (value === 'false') env[k] = false;
    });
  };
  export const workerCalculateArray = async (
    dataToSplit: any[],
    operation: (
      dataChunk: any[],
      workerNumber?: number | undefined,
    ) => Promise<void>,
    options?: {
      maxesForWorkes?: {
        [workerMaxes: number]: number;
      };
      workerLimit?: number;
      globals?: any;
    },
  ) => {
    //#region @backend
    let { maxesForWorkes, workerLimit, globals } = options || {};
    if (_.isUndefined(globals)) {
      globals = {};
    }
    if (_.isUndefined(maxesForWorkes)) {
      maxesForWorkes = {
        0: 5, // no worker for 5 chunks
        1: 10, // 1 worker up to 10 chunks
        2: 15, // 2 workers up to 15 chunks,
        3: 25, // 2 workers up to 15 chunks,
        // above 15 chunks => {workerLimit}
      };
    }
    if (_.isUndefined(workerLimit) || workerLimit === Infinity) {
      workerLimit = os.cpus().length - 1;
    }
    if (workerLimit <= 0) {
      workerLimit = 0;
    }
    if (
      (_.isNumber(maxesForWorkes[0]) &&
        maxesForWorkes[0] > 0 &&
        dataToSplit.length <= maxesForWorkes[0]) ||
      workerLimit === 0
    ) {
      return await operation(dataToSplit, void 0);
    }
    const workersNumber = Number(
      Object.keys(maxesForWorkes)
        .filter(key => key != '0')
        .sort()
        .reverse()
        .find(key => maxesForWorkes[key] <= dataToSplit.length),
    );
    // Helpers.log('workersNumber', workersNumber)
    // Helpers.log('_.isNumber(workersNumber)', _.isNumber(workersNumber))
    let chunks: any[][] = [];
    if (_.isNumber(workersNumber)) {
      const splitEven = Math.floor(dataToSplit.length / workersNumber);
      for (let workerIndex = 0; workerIndex <= workersNumber; workerIndex++) {
        if (workerIndex === workersNumber) {
          chunks[chunks.length - 1] = chunks[chunks.length - 1].concat(
            dataToSplit.slice(workerIndex * splitEven, dataToSplit.length),
          );
        } else {
          chunks.push(
            dataToSplit.slice(
              workerIndex * splitEven,
              workerIndex * splitEven + splitEven,
            ),
          );
        }
      }
    }
    const promises = [];
    for (let n = 0; n < chunks.length; n++) {
      ((chunks, n) => {
        const dataChunk = chunks[n];
        Helpers.log(`worker ${n} ` + dataChunk.join(',\t'));
        // Helpers.log('pass to worker', Helpers)
        let task = new Task({
          globals: _.merge(globals, {
            n,
            dataChunk,
          }),
          requires: {
            request: 'request-promise',
          },
        });
        promises.push(task.run(operation));
      })(chunks, n);
    }
    return await Promise.all(promises);
    //#endregion
  };
  export const checkEnvironment = (deps?: CoreModels.GlobalDependencies) => {
    //#region @backendFunc
    return CLI.checkEnvironment(deps);
    //#endregion
  };
  /**
   * Mixing for multiclass inheritance
   *
   * How to use It:
   *
   * class Wolverine {}
   * class Jean {}
   * export class Child {}
   * export interface MyChild implements Wolverine, Jean {}
   * applyMixing(Child,[Wolverine, Jean]);
   *
   * @param derivedCtor Target Class
   * @param baseCtors Base Classes
   */
  export function applyMixins(derivedCtor: any, baseCtors: any[]) {
    baseCtors.forEach(baseCtor => {
      Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
        Object.defineProperty(
          derivedCtor.prototype,
          name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name),
        );
      });
    });
  }
}
