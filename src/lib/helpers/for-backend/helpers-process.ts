//#region imports
import { exec } from 'child_process';
import type { ChildProcess } from 'child_process';

import * as spawn from 'cross-spawn';
import * as dateformat from 'dateformat';
import * as fuzzy from 'fuzzy';
import { Log, Level } from 'ng2-logger/src';
import { config } from 'tnp-config/src';
import {
  _,
  os,
  path,
  fse,
  child_process,
  fkill,
  crossPlatformPath,
  chalk,
} from 'tnp-core/src';
import { CLI, UtilsProcess, UtilsTerminal } from 'tnp-core/src';
import { CLASS } from 'typescript-class-helpers/src';

import type { BaseProject } from '../../index';
import { Helpers } from '../../index';

//#endregion

export class HelpersProcess {
  //#region restart application itself
  async restartApplicationItself(nameOfApp: string) {
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
  }
  //#endregion

  //#region os is macos
  osIsMacOs(versino: 'big-sur' | 'catalina') {
    //#region @backendFunc
    if (versino == 'big-sur') {
      return os.release().startsWith('20.');
    }
    if (versino == 'catalina') {
      return os.release().startsWith('19.');
    }
    // TODO other oses
    //#endregion
  }
  //#endregion

  //#region  generate file wrap
  generatedFileWrap(content: string) {
    //#region @backendFunc
    return `${content}
  // [${config.frameworkName}] GENERATED CONTENT FOR BACKEND VERSION
  // [${config.frameworkName}] GENERATED CONTENT FOR BACKEND VERSION
          `.trim();
    //#endregion
  }
  //#endregion

  //#region change cwd wrapper
  async changeCwdWrapper(
    dir: string,
    functionToExecure: Function,
    logLevel: Level = Level.__NOTHING,
  ) {
    //#region @backendFunc
    const currentCwd = crossPlatformPath(process.cwd());
    Helpers.changeCwd(dir);
    Log.disableLogs(logLevel);
    await Helpers.runSyncOrAsync({ functionFn: functionToExecure });
    Log.enableLogs();
    Helpers.changeCwd(currentCwd);
    //#endregion
  }
  //#endregion

  //#region change cwd
  changeCwd(dir?: string) {
    //#region @backendFunc
    if (!dir) {
      return;
    }
    Helpers.goToDir(dir);
    //#endregion
  }
  //#endregion

  //#region go to dir
  /**
   * // TODO refactor this
   * @deprecated
   */
  goToDir(dir = '..') {
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
      this.goToDir(previous);
      return false;
    }
    return true;
    //#endregion
  }
  //#endregion

  //#region press key or wait
  async pressKeyOrWait(
    message = 'Press enter try again',
    printWaitMessages = 0,
  ) {
    //#region @backendFunc
    if (_.isNumber(printWaitMessages) && printWaitMessages > 0) {
      Helpers.log(`Please wait (${printWaitMessages}) seconds`);
      await Helpers.pressKeyOrWait(message, printWaitMessages - 1);
      return;
    }

    return new Promise(resovle => {
      Helpers.log(message);
      process.stdin.once('data', function () {
        resovle(void 0);
      });
    });
    //#endregion
  }
  //#endregion

  //#region press key and continue
  /**
   * @deprecated use UtilsTerminal.pressAnyKey
   */
  pressKeyAndContinue(message = 'Press enter to continue..') {
    //#region @backendFunc
    return UtilsTerminal.pressAnyKey({ message });
    //#endregion
  }
  //#endregion

  //#region list
  /**
   * @deprecated use UtilsTerminal.multiselect
   */
  async list<T = string>(
    question: string,
    choices:
      | { name: string; value: T }[]
      | { [choice: string]: { name: string } },
  ) {
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
  }
  //#endregion

  //#region multiple choices ask
  /**
   * @deprecated use UtilsTerminal.multiselect
   */
  async multipleChoicesAsk(
    question: string,
    choices: { name: string; value: string }[],
    autocomplete: boolean = false,
    selected?: { name: string; value: string }[],
  ): Promise<string[]> {
    //#region @backendFunc
    return UtilsTerminal.multiselect({
      question,
      choices,
      autocomplete,
      defaultSelected: (selected || []).map(s => s.value),
    });
    //#endregion
  }
  //#endregion

  //#region input
  /**
   * @deprecated use UtilsTerminal.input
   */
  async input(options: {
    defaultValue?: string;
    question: string;
    // required?: boolean;
    validate?: (value: string) => boolean;
  }): Promise<string> {
    //#region @backendFunc
    return await UtilsTerminal.input(options);
    //#endregion
  }
  //#endregion

  //#region select
  /**
   * @deprecated use UtilsTerminal.multiselect
   * TODO wierd problem when pressing key like "i"
   */
  async selectChoicesAsk<T = string>(
    question: string,
    choices:
      | { name: string; value: T }[]
      | { [choice: string]: { name: string } },
  ): Promise<T> {
    //#region @backendFunc
    // console.log({ choices })
    // Helpers.pressKeyAndContinue()

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
  }
  //#endregion

  //#region autocomplete ask
  async autocompleteAsk<T = string>(
    question: string,
    choices: { name: string; value: T }[],
    pageSize = 10,
  ): Promise<T> {
    //#region @backendFunc
    const source = (__, input) => {
      input = input || '';
      return new Promise(resolve => {
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

    const res: { command: T } = (await inquirer.prompt({
      type: 'autocomplete',
      name: 'command',
      pageSize,
      source,
      message: question,
      choices,
    } as any)) as any;

    return res.command;
    //#endregion
  }
  //#endregion

  //#region get working dir of process
  getWorkingDirOfProcess(PID: number) {
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
  }
  //#endregion

  //#region output to vscode
  outputToVScode(
    data: { label: string; option: string }[] | string,
    disableEncode = false,
  ) {
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
  }
  //#endregion

  //#region action wrapper
  async actionWrapper(fn: () => void, taskName: string = 'Task') {
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
  }
  //#endregion

  //#region terminal line
  terminalLine() {
    //#region @backendFunc
    return _.times(process.stdout.columns, () => '-').join('');
    //#endregion
  }
  //#endregion

  //#region kill all node except current process
  /**
   * THIS DEOS NOT WORK !
   * ! TOOD FIX THIS
   */
  async killAllNodeExceptCurrentProcess() {
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
  }
  //#endregion

  //#region kill all node
  killAllNode() {
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
  }
  //#endregion

  //#region format path
  formatPath(pathToFileOrFolder: string) {
    //#region @backendFunc
    if (!_.isString(pathToFileOrFolder)) {
      return `\n< provided path is not string: ${pathToFileOrFolder} >\n`;
    }
    if (!path.isAbsolute(pathToFileOrFolder)) {
      return `\n
${Helpers.terminalLine()}
relativePath: ${pathToFileOrFolder}
${Helpers.terminalLine()}\n`;
    }
    if (!fse.existsSync(pathToFileOrFolder)) {
      return `\n
${Helpers.terminalLine()}
< provided path does not exist: ${pathToFileOrFolder} >
${Helpers.terminalLine()}\n`;
    }

    const isDirectory = fse.lstatSync(pathToFileOrFolder).isDirectory();
    return `
${Helpers.terminalLine()}
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
${Helpers.terminalLine()}\n`;
    //#endregion
  }
  //#endregion

  //#region prepare wathc command
  /**
   * @deprecated
   */
  prepareWatchCommand(cmd) {
    //#region @backendFunc
    return os.platform() === 'win32' ? `"${cmd}"` : `'${cmd}'`;
    //#endregion
  }
  //#endregion

  //#region get string from
  /**
   * @deprecated
   */
  getStringFrom(command: string, descriptionOfCommand?: string) {
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
  }
  //#endregion

  //#region wait for message in stdout
  async waitForMessegeInStdout(proc: ChildProcess, message: string) {
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
  }
  //#endregion
}
