//#region imports
import {
  _, os,
  path, fse,
  child_process,
  fkill,
  crossPlatformPath,
  chalk,
} from 'tnp-core';
import { CLI } from 'tnp-cli';
import * as dateformat from 'dateformat';
import { exec } from 'child_process';
import type { BaseProject } from '../index';
import { Helpers } from '../index';
import { CLASS } from 'typescript-class-helpers';
import { config } from 'tnp-config';
import { Log, Level } from 'ng2-logger';
declare const global: any;
const prompts = require('prompts');
import * as fuzzy from 'fuzzy';
import * as inquirer from 'inquirer';
import * as inquirerAutocomplete from 'inquirer-autocomplete-prompt';
inquirer.registerPrompt('autocomplete', inquirerAutocomplete);
const { AutoComplete } = require('enquirer');
import * as spawn from 'cross-spawn';
//#endregion

// TODO idea of procees someday to change

/**
 * - long buffer by default
 * - easy catch output of commands
 * - wrap with try catch
 * - handle backgroud proceses
 */
// function childExc(command: string) {
//   return {
//     syncExecutedValue({ displayOutput = false }): string {
//       return '';
//     },
//     asycRun({ hideOutput: 'all' | 'stdout' | 'stder' }) {

//     }
//   }
// }


export class HelpersProcess {

  async restartApplicationItself(nameOfApp: string) {
    Helpers.log(`Restarting ${nameOfApp}`);
    return new Promise(() => {
      setTimeout(function () {
        process.on('exit', function () {
          spawn(process.argv.shift(), [...process.argv, '--restarting'], {
            cwd: crossPlatformPath(process.cwd()),
            detached: true,
            stdio: 'inherit'
          });
        });
        process.exit();
      }, 5000);
    });
  }

  osIsMacOs(versino: 'big-sur' | 'catalina') {
    if (versino == 'big-sur') {
      return os.release().startsWith('20.');
    }
    if (versino == 'catalina') {
      return os.release().startsWith('19.');
    }
    // TODO other oses
  }

  generatedFileWrap(content: string) {
    return `${content}
  // [${config.frameworkName}] GENERATED CONTENT FOR BACKEND VERSION
  // [${config.frameworkName}] GENERATED CONTENT FOR BACKEND VERSION
          `.trim()
  }

  async changeCwdWrapper(dir: string, functionToExecure: Function, logLevel: Level = Level.__NOTHING) {
    const currentCwd = crossPlatformPath(process.cwd());
    Helpers.changeCwd(dir);
    Log.disableLogs(logLevel)
    await Helpers.runSyncOrAsync({ functionFn: functionToExecure });
    Log.enableLogs();
    Helpers.changeCwd(currentCwd);
  }

  changeCwd(dir?: string) {
    if (!dir) {
      return;
    }
    Helpers.goToDir(dir);
  }

  goToDir(dir = '..') {
    const previous = crossPlatformPath(process.cwd())
    try {

      dir = path.isAbsolute(dir) ? dir :
        crossPlatformPath(path.resolve(path.join(crossPlatformPath(process.cwd()), dir)));

      if (path.basename(dir) === config.folder.external) {

        const belowExternal = path.resolve(path.join(dir, '..'))
        const classProject = CLASS.getBy('Project') as typeof BaseProject;
        if (fse.existsSync(belowExternal) && !!(classProject).ins.From(belowExternal)) {
          dir = belowExternal;
        }
      }

      process.chdir(dir)
    }
    catch (err) {
      this.goToDir(previous)
      return false;
    }
    return true;
  }

  async pressKeyOrWait(message = 'Press enter try again', printWaitMessages = 0) {
    if (_.isNumber(printWaitMessages) && printWaitMessages > 0) {
      Helpers.log(`Please wait (${printWaitMessages}) seconds`);
      await Helpers.pressKeyOrWait(message, printWaitMessages - 1);
      return;
    }

    return new Promise((resovle) => {
      Helpers.log(message);
      process.stdin.once('data', function () {
        resovle(void 0)
      });
    })
  }

  /**
   * @deprecated use questions instead
   */
  pressKeyAndContinue(message = 'Press enter to continue..') {
    console.log(chalk.bold(message));
    if (process.platform === 'win32') {
      spawn.sync('pause', '', { shell: true, stdio: [0, 1, 2] });
      return;
    }
    require('child_process').spawnSync('read _ ', { shell: true, stdio: [0, 1, 2] });
    // return new Promise((resovle) => {
    //   Helpers.log(message);
    //   process.stdin.once('data', function () {
    //     resovle()
    //   });
    // })
  }

  async list<T = string>(
    question: string,
    choices: { name: string; value: T; }[]
  ) {
    const res = await inquirer.prompt({
      type: 'list',
      name: 'value',
      message: question,
      choices,
      pageSize: 10,
      loop: false,
    } as any) as any;
    return res.value as T;
  }

  async multipleChoicesAsk(
    question: string,
    choices: { name: string; value: string; }[],
    autocomplete: boolean = false,
  ): Promise<string[]> {
    if (autocomplete) {
      // console.log({ choices })
      // Helpers.pressKeyAndContinue()
      const prompt = new AutoComplete({
        name: 'value',
        message: question,
        limit: 10,
        multiple: true,
        choices,
        hint: '- Space to select. Return to submit',
        footer() {
          return CLI.chalk.green('(Scroll up and down to reveal more choices)');
        },
      });

      const res = await prompt.run();
      // console.log({ res })
      return res;
    } else {
      const res = await inquirer.prompt({
        type: 'checkbox',
        name: 'value',
        message: question,
        choices,
        pageSize: 10,
        loop: false,
      } as any) as any;
      return res.value;
    }
  }

  async autocompleteAsk<T = string>(
    question: string,
    choices: { name: string; value: T; }[],
    pageSize = 10
  ) {

    function source(__, input) {
      input = input || '';
      return new Promise((resolve) => {
        const fuzzyResult = fuzzy.filter(input, choices.map(f => f.name));
        resolve(
          fuzzyResult.map((el) => {
            return { name: el.original, value: choices.find(c => c.name === el.original).value };
          })
        );
      });
    }

    const res: { command: T } = await inquirer.prompt({
      type: 'autocomplete',
      name: 'command',
      pageSize,
      source,
      message: question,
      choices
    } as any) as any;

    return res.command;
  }

  get isWsl() {
    if (process.platform !== 'linux') {
      return false;
    }

    if (os.release().toLowerCase().includes('microsoft')) {
      return true;
    }

    try {
      return fse.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');
    } catch (_) {
      return false;
    }
  };

  getWorkingDirOfProcess(PID: number) {
    try {
      const cwd = child_process.execSync(`lsof -p ${PID} | awk '$4=="cwd" {print $9}'`).toString().trim()
      return cwd;
    } catch (e) {
      Helpers.error(e);
    }
  }

  outputToVScode(data: { label: string; option: string; }[] | string, disableEncode = false) {
    if (_.isObject(data)) {
      data = JSON.stringify(data);
    }
    if (disableEncode) {
      console.log(data);
    } else {
      console.log(encodeURIComponent(data as any));
    }
  }

  sleep(seconds = 1) {
    return Helpers.run(`sleep ${seconds}`).sync();
  }

  async actionWrapper(fn: () => void, taskName: string = 'Task') {
    function currentDate() {
      return `[${dateformat(new Date(), 'dd-mm-yyyy HH:MM:ss')}]`;
    }
    // global.spinner && global.spinner.start()
    Helpers.taskStarted(`${currentDate()} "${taskName}" Started..`)
    await Helpers.runSyncOrAsync({ functionFn: fn });
    Helpers.taskDone(`${currentDate()} "${taskName}" Done`)
    // global.spinner && global.spinner.stop()
  }



  terminalLine() {
    return _.times(process.stdout.columns, () => '-').join('')
  }

  async killAllNodeExceptCurrentProcess() {
    return new Promise<void>((resolve, reject) => {
      // Get the current process ID
      const currentProcessId = process.pid;

      // Command to list all Node.js processes
      const listProcessesCommand = process.platform === 'win32'
        ? 'tasklist /fi "imagename eq node.exe" /fo csv' : 'ps -A -o pid,command | grep node';

      // Execute the command to list processes
      exec(listProcessesCommand, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Error occurred while listing processes: ${error.message}`));
          return;
        }
        if (stderr) {
          reject(new Error(`Error occurred while listing processes: ${stderr}`));
          return;
        }

        // Split the output into lines and filter out non-node processes
        const processes = stdout.split('\n')
          .map(line => line.trim())
          .filter(line => line.includes('node') && !line.includes('grep') && !line.includes('tasklist'));

        // Extract the process IDs
        const processIds = processes.map(line => parseInt(line.split(',')[1]));

        // Filter out the current process ID
        const processesToKill = processIds.filter(id => id !== currentProcessId);

        // If there are no processes to kill, resolve immediately
        if (processesToKill.length === 0) {
          resolve();
          return;
        }

        // Kill the processes
        let numProcessesKilled = 0;
        processesToKill.forEach(id => {
          const killCommand = process.platform === 'win32' ? `taskkill /pid ${id} /f` : `kill ${id}`;
          exec(killCommand, (error) => {
            if (error) {
              console.error(`Error occurred while killing process ${id}:`, error);
            } else {
              console.log(`Successfully killed process ${id}`);
            }
            numProcessesKilled++;
            if (numProcessesKilled === processesToKill.length) {
              resolve();
            }
          });
        });
      });
    });
  }

  killAllNode() {
    Helpers.info('Killing all node processes before pull...')
    try {
      if (process.platform === 'win32') {
        Helpers.run(`taskkill /f /im node.exe`, { output: false, silence: true }).sync();
      } else {
        Helpers.run(`fkill -f node`, { output: false, silence: true }).sync();
      }
    } catch (error) {
      Helpers.error(`[${config.frameworkName}] not able to kill all node processes`)
    }
    Helpers.info('DONE KILL ALL NODE PROCESSES')
  }

  async killProcessByPort(portOrPortsToKill: number | number[], options?: {
    silent?: boolean
  }) {
    const showOutoput = (!options || !options.silent);
    if (!_.isArray(portOrPortsToKill)) {
      portOrPortsToKill = [portOrPortsToKill];
    }
    for (let index = 0; index < portOrPortsToKill.length; index++) {
      let port = portOrPortsToKill[index];
      const org = port;
      port = Number(port);
      if (!_.isNumber(port)) {
        showOutoput && Helpers.warn(`[firedev-helpers] Can't kill on port: "${org}"`);
        return;
      }
      try {
        await fkill(`:${port}`, { force: true });
        // run(`fkill -f :${port} &> /dev/null`, { output: false }).sync()
        showOutoput && Helpers.info(`Processs killed successfully on port: ${port}`);
      } catch (e) {
        showOutoput && Helpers.warn(`No process to kill  on port: ${port}... `);
      }


      // console.log(`Killing process on port ${port} in progress`);
      // try {
      //   if (os.platform() === 'linux') {
      //     run(`lsof -i:${port}`, { output: false }).sync()
      //   } else if (os.platform() === 'darwin') {
      //     run(`lsof -P | grep ':${port}' | awk '{print $2}' | xargs kill -9 `, { output: false }).sync()
      //   }
      //   info(`Process killed on port: ${port}`)
      // } catch (e) {
      //   error(`Problem with killing process on port ${port}:
      //   ${e}
      //   `, true)
      // }
    }
  }

  clearConsole() {
    Helpers.msgCacheClear();
    console.log('\x1Bc');

    // process.stdout.write('\033c\033[3J');
    // try {
    //   run('clear').sync()
    // } catch (error) {
    //   console.log('clear console not succedd')
    // }

  }





  // process.on('uncaughtException', cleanExit)
  // process.on('unhandledRejection', cleanExit)


  // process.once('unhandledRejection', (err, aa) => {
  //   error(`'Exiting unhandledRejection

  //     Reason: ${err}
  //     ${JSON.stringify(aa)}
  //   `);
  // })
  formatPath(pathToFileOrFolder: string) {
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
${isDirectory ? pathToFileOrFolder.split('/').map(c => `/${c}`).join('').replace(/^\//, '') : (
        path.dirname(pathToFileOrFolder.split('/').map(c => `/${c}`).join('').replace(/^\//, ''))
        + '\n/' + CLI.chalk.bold(path.basename(pathToFileOrFolder))
      )
      }
${Helpers.terminalLine()}\n`;
  };


  prepareWatchCommand(cmd) {
    return os.platform() === 'win32' ? `"${cmd}"` : `'${cmd}'`
  }

  getStringFrom(command: string, descriptionOfCommand?: string) {
    try {
      const res = Helpers.run(command, { output: false }).sync().toString();
      return res;
    } catch (error) {
      Helpers.warn(`Not able to get string from "${descriptionOfCommand ? descriptionOfCommand : command}"`);
      return void 0;
    }
  }

  async waitForMessegeInStdout(proc: child_process.ChildProcess, message: string) {
    return new Promise((resolve, reject) => {
      let resolved = false;
      proc.stdout.on('data', (data) => {

        // console.log(`

        // [waitForMessegeInStdout] data: ${data}
        // [waitForMessegeInStdout] data typeof: ${typeof data}

        // `);
        if (_.isObject(data) && _.isFunction(data.toString)) {
          data = data.toString()
        }

        if (_.isString(data) && data.search(message) !== -1) {
          resolved = true;
          resolve(void 0);
        }
      })
      proc.once('exit', () => {
        // console.log(`

        // [waitForMessegeInStdout] exit: ${code}

        // `);
        if (!resolved) {
          reject();
        }
      })
    })

  }


  //#endregion

}
