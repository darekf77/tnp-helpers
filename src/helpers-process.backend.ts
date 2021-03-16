//#region imports
import * as child from 'child_process'
import * as _ from 'lodash';
import chalk from 'chalk';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as fkill from 'fkill';
import * as dateformat from 'dateformat';

import type { Project } from './project';
import { Helpers } from './index';
import { Models } from 'tnp-models';
import { CLASS } from 'typescript-class-helpers';
import { config } from 'tnp-config';
declare const global: any;
const prompts = require('prompts');
import * as fuzzy from 'fuzzy'
import * as inquirer from 'inquirer'
import * as inquirerAutocomplete from 'inquirer-autocomplete-prompt';
inquirer.registerPrompt('autocomplete', inquirerAutocomplete)
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
    return new Promise(resolve => {
      setTimeout(function () {
        process.on('exit', function () {
          child.spawn(process.argv.shift(), [...process.argv, '--restarting'], {
            cwd: process.cwd(),
            detached: true,
            stdio: 'inherit'
          });
        });
        process.exit();
      }, 5000);
    });
  }

  goToDir(dir = '..') {
    const previous = process.cwd()
    try {

      dir = path.isAbsolute(dir) ? dir : path.resolve(path.join(process.cwd(), dir));

      if (path.basename(dir) === config.folder.external) {

        const belowExternal = path.resolve(path.join(dir, '..'))
        const classProject = CLASS.getBy('Project');
        if (fse.existsSync(belowExternal) && !!(classProject as typeof Project).From(belowExternal)) {
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

  pressKeyAndContinue(message = 'Press enter to continue..') {
    Helpers.info(message);
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
    return res.value;
  }

  async autocompleteAsk<T = string>(
    question: string,
    choices: { name: string; value: T; }[],
    pageSize = 10
  ) {

    function source(answers, input) {
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

  async questionYesNo(message: string,
    callbackTrue?: () => any, callbackFalse?: () => any, defaultValue = true) {

    let response = {
      value: defaultValue
    };
    if (global.tnpNonInteractive) {
      Helpers.info(`${message} - AUTORESPONSE: ${defaultValue ? 'YES' : 'NO'}`);
    } else {
      response = await prompts({
        type: 'toggle',
        name: 'value',
        message,
        initial: defaultValue,
        active: 'yes',
        inactive: 'no'
      });
    }
    if (response.value) {
      if (callbackTrue) {
        await Helpers.runSyncOrAsync(callbackTrue);
      }
    } else {
      if (callbackFalse) {
        await Helpers.runSyncOrAsync(callbackFalse);
      }
    }
    return response.value;
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
      const cwd = child.execSync(`lsof -p ${PID} | awk '$4=="cwd" {print $9}'`).toString().trim()
      return cwd;
    } catch (e) {
      Helpers.error(e);
    }
  }

  commnadOutputAsString(command: string, cwd = process.cwd(), biggerBuffer = false): string {
    let output = '';
    try {
      output = Helpers.run(command, { output: false, cwd, biggerBuffer }).sync().toString().trim()
      const splited = (output || '').split('\n');
      output = splited.pop();
    } catch (e) {
      Helpers.warn(`[tnp-helepr] Not able to get output from command:
      "${command}"
      `);
    }
    return output;
  }

  sleep(seconds = 1) {
    return Helpers.run(`sleep ${seconds}`).sync();
  }

  async actionWrapper(fn: () => void, taskName: string = 'Task') {
    function currentDate() {
      return `[${dateformat(new Date(), 'HH:MM:ss')}]`;
    }
    // global.spinner && global.spinner.start()
    Helpers.info(`${currentDate()} "${taskName}" Started..`)
    await Helpers.runSyncOrAsync(fn);
    Helpers.info(`${currentDate()} "${taskName}" Done\u2713`)
    // global.spinner && global.spinner.stop()
  }

  async compilationWrapper(fn: () => void, taskName: string = 'Task',
    executionType: 'Compilation of' | 'Code execution of' | 'Event:' = 'Compilation of') {
    function currentDate() {
      return `[${dateformat(new Date(), 'HH:MM:ss')}]`;
    }
    if (!fn || !_.isFunction(fn)) {
      Helpers.error(`${executionType} wrapper: "${fn}" is not a function.`)
      process.exit(1)
    }

    try {
      Helpers.log(`${currentDate()} ${executionType} "${taskName}" Started..`)
      await Helpers.runSyncOrAsync(fn)
      Helpers.log(`${currentDate()} ${executionType} "${taskName}" Done\u2713`)
    } catch (error) {
      Helpers.log(chalk.red(error));
      Helpers.log(`${currentDate()} ${executionType} ${taskName} ERROR`);
      process.exit(1);
    }

  }

  terminalLine() {
    return _.times(process.stdout.columns, () => '-').join('')
  }

  killProcess(byPid: number) {
    Helpers.run(`kill -9 ${byPid}`).sync()
  }

  async killProcessByPort(portOrPortsToKill: number | number[]) {
    if (!_.isArray(portOrPortsToKill)) {
      portOrPortsToKill = [portOrPortsToKill];
    }
    for (let index = 0; index < portOrPortsToKill.length; index++) {
      let port = portOrPortsToKill[index];
      const org = port;
      port = Number(port);
      if (!_.isNumber(port)) {
        Helpers.warn(`[tnp-helpers] Can't kill on port: "${org}"`);
        return;
      }
      try {
        await fkill(`:${port}`);
        // run(`fkill -f :${port} &> /dev/null`, { output: false }).sync()
        Helpers.info(`Processs killed successfully on port: ${port}`)
      } catch (e) {
        Helpers.warn(`No process to kill  on port: ${port}... `)
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
    console.log('\x1Bc');

    // process.stdout.write('\033c\033[3J');
    // try {
    //   run('clear').sync()
    // } catch (error) {
    //   console.log('clear console not succedd')
    // }

  }


  cleanExit() {
    Helpers.processes.forEach(p => {
      p.kill('SIGINT')
      p.kill('SIGTERM')
      Helpers.log(`Killing child process on ${p.pid}`)
    })
    Helpers.log(`Killing parent on ${process.pid}`)
    process.exit()
  };

  constructor() {
    process.on('SIGINT', Helpers.cleanExit); // catch ctrl-c
    process.on('SIGTERM', Helpers.cleanExit); // catch kill
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
        + '\n/' + chalk.bold(path.basename(pathToFileOrFolder))
      )
      }
${Helpers.terminalLine()}\n`;
  };

  modifyLineByLine(
    data: string | Buffer | Error,
    outputLineReplace: (outputLine: string) => string,
    prefix: string,
    extractFromLine?: (string | Function)[],
  ) {
    const checkExtract = (_.isArray(extractFromLine) && extractFromLine.length > 0);
    let modifyOutput = _.isFunction(outputLineReplace);
    if (modifyOutput && _.isString(data)) {
      data = data.split(/\r?\n/).map(line => outputLineReplace(line)).join('\n');
    }
    if (prefix && _.isString(data)) {
      return data.split('\n').map(singleLine => {
        if (!singleLine || singleLine.trim().length === 0 || singleLine.trim() === '.') {
          return singleLine;
        }
        if (checkExtract) {
          const sFuncs = extractFromLine
            .filter(f => _.isString(f))
          if (sFuncs.filter(f => (singleLine.search(f as string) !== -1)).length === sFuncs.length) {
            const fun = extractFromLine.find(f => _.isFunction(f));
            if (fun) {
              let s = singleLine;
              sFuncs.forEach(f => { s = s.replace(f as string, '') });
              (fun as Function)(s.trim());
            }
          }
        }
        return `${prefix} ${singleLine}`
      }).join('\n');
    }
    return data as string;
  }

  logProc(proc: child.ChildProcess, output = true, stdio,
    outputLineReplace: (outputLine: string) => string, prefix: string,
    extractFromLine?: (string | Function)[]) {
    Helpers.processes.push(proc);

    if (stdio) {
      // @ts-ignore
      proc.stdio = stdio;
    }


    if (!prefix) {
      prefix = '';
    }

    if (output) {
      proc.stdout.on('data', (data) => {
        process.stdout.write(Helpers.modifyLineByLine(data, outputLineReplace, prefix, extractFromLine))
      })

      proc.stdout.on('error', (data) => {
        console.log(Helpers.modifyLineByLine(data, outputLineReplace, prefix, extractFromLine));
      })

      proc.stderr.on('data', (data) => {
        process.stderr.write(Helpers.modifyLineByLine(data, outputLineReplace, prefix, extractFromLine))
      })

      proc.stderr.on('error', (data) => {
        console.log(Helpers.modifyLineByLine(data, outputLineReplace, prefix, extractFromLine));
      })

    }

    return proc;
  }

  checkProcess(dirPath: string, command: string) {
    if (!fse.existsSync(dirPath)) {
      Helpers.error(`
Path for process cwd doesn't exist: ${dirPath}
command: ${command}
`);
    }
    if (!command) {
      Helpers.error(`Bad command: ${command}`);
    }
  }

  readonly bigMaxBuffer = 2024 * 500;

  async waitForMessegeInStdout(proc: child.ChildProcess, message: string) {
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
      proc.once('exit', (code) => {
        // console.log(`

        // [waitForMessegeInStdout] exit: ${code}

        // `);
        if (!resolved) {
          reject();
        }
      })
    })

  }

  getStdio(options?: Models.dev.RunOptions) {
    const {
      output, silence,
      // pipeToParentProcerss = false,
      // inheritFromParentProcerss = false
    } = options;
    let stdio = output ? [0, 1, 2] : ((_.isBoolean(silence) && silence) ? 'ignore' : undefined);
    // if (pipeToParentProcerss) {
    //   stdio = ['pipe', 'pipe', 'pipe'] as any;
    // }
    // if (inheritFromParentProcerss) {
    //   stdio = ['inherit', 'inherit', 'inherit'] as any;
    // }
    return stdio;
  }

  runSyncIn(command: string, options?: Models.dev.RunOptions) {
    const { cwd, biggerBuffer } = options;
    const maxBuffer = biggerBuffer ? Helpers.bigMaxBuffer : undefined;
    let stdio = Helpers.getStdio(options)
    Helpers.checkProcess(cwd, command);
    return child.execSync(command, { stdio, cwd, maxBuffer } as any)
  }

  runAsyncIn(command: string, options?: Models.dev.RunOptions) {
    const { output, cwd, biggerBuffer, outputLineReplace, extractFromLine, detach } = options;
    const maxBuffer = biggerBuffer ? Helpers.bigMaxBuffer : undefined;
    let stdio = Helpers.getStdio(options)
    Helpers.checkProcess(cwd, command);
    let proc: child.ChildProcess;
    if (detach) {
      const cmd = _.first(command.split(' '));
      const argsForCmd = command.split(' ').slice(1);
      console.log(`cmd: "${cmd}",  args: "${argsForCmd.join(' ')}"`)
      proc = child.spawn(cmd, argsForCmd, { cwd, detached: true });
      console.log(`

      DETACHED PROCESS IS WORKING ON PID: ${proc.pid}

      `)
      // proc = child.exec(`${command} &`, { cwd, maxBuffer, });
    } else {
      proc = child.exec(command, { cwd, maxBuffer, });
    }
    return Helpers.logProc(proc,
      detach ? true : output,
      detach ? void 0 : stdio,
      outputLineReplace, options.prefix, extractFromLine);
  }

  prepareWatchCommand(cmd) {
    return os.platform() === 'win32' ? `"${cmd}"` : `'${cmd}'`
  }

  get watcher() {
    const that = Helpers;
    return {
      run(command: string, folderPath: string = 'src', options: Models.system.WatchOptions) {
        const { cwd = process.cwd(), wait } = options;
        let cmd = `tnp command ${command}`;
        const toRun = `watch ${that.prepareWatchCommand(cmd)} ${folderPath} ${wait ? ('--wait=' + wait) : ''}`;
        console.log('WATCH COMMAND ', toRun)
        return that.run(toRun, { cwd }).async()
      },

      call(fn: Function | string, params: string, folderPath: string = 'src', options: Models.system.WatchOptions) {
        const { cwd = process.cwd() } = options;
        if (!fn) {
          Helpers.error(`Bad function: ${fn} for watcher on folder: ${folderPath}, with params: ${params}`)
        }
        const fnName = typeof fn === 'function' ? CLASS.getName(fn) : fn;
        // console.log('Function name ', fnName)
        let cmd = `tnp ${Helpers.cliTool.simplifiedCmd(fnName)} ${params}`;
        const toRun = `watch ${that.prepareWatchCommand(cmd)} ${folderPath}`;
        return that.run(toRun, { cwd }).async()
      }
    }
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


  run(command: string,
    options?: Models.dev.RunOptions) {

    if (!options) options = {};
    if (options.output === undefined) options.output = true;
    if (options.biggerBuffer === undefined) options.biggerBuffer = false;
    if (options.cwd === undefined) options.cwd = process.cwd()
    if (!_.isString(command)) {
      Helpers.error(`[tnp-helper] command is not a string`)
    }
    return {
      sync(): Buffer {
        if (_.isArray(options.extractFromLine)) {
          Helpers.error(`[tnp-helper] extractFromLine only for:
          - asyncAsPromise
          - async
          - unitlOutputContains

          `, false, true);
        }
        if (_.isNumber(options.tryAgainWhenFailAfter) && options.tryAgainWhenFailAfter > 0) {
          // TODO try again when fail
          // try {
          const proc = Helpers.runSyncIn(command, options);
          return proc as any;
          // } catch (error) {

          //  TODO: WAIT FUNCTION HERE
          //   return Helpers.run(command, options).sync()
          // }
        }
        return Helpers.runSyncIn(command, options) as any;
      },
      async(detach = false) {
        options.detach = detach;
        return Helpers.runAsyncIn(command, options);
      },
      asyncAsPromise(): Promise<void> {
        let isResolved = false;
        return new Promise<any>((resolve, reject) => {
          const proc = Helpers.runAsyncIn(command, options);
          proc.on('exit', () => {
            if (!isResolved) {
              isResolved = true;
              resolve(void 0);
            }

          });
          proc.on('error', () => {
            if (!isResolved) {
              isResolved = true;
              reject();
            }
          });
        });
      },
      unitlOutputContains(stdoutMsg: string | string[], stderMsg?: string | string[]) {
        let isResolved = false;
        return new Promise<any>((resolve, reject) => {

          if (_.isString(stdoutMsg)) {
            stdoutMsg = [stdoutMsg];
          }
          if (_.isString(stderMsg)) {
            stderMsg = [stderMsg];
          }
          if (!_.isArray(stdoutMsg)) {
            reject(`[unitlOutputContains] Message not a array`);
          }

          const proc = Helpers.runAsyncIn(command, options);
          proc.stderr.on('data', (message) => {
            const data: string = message.toString().trim();
            if (!isResolved) {
              for (let index = 0; index < stderMsg.length; index++) {
                const rejectm = stderMsg[index];
                if ((data.search(rejectm) !== -1)) {
                  Helpers.info(`[unitlOutputContains] Rejected move to next step...`);
                  isResolved = true;
                  reject();
                  proc.kill('SIGINT');
                  break;
                }
              }
            }
          });

          proc.stdout.on('data', (message) => {
            const data: string = message.toString().trim();

            if (!isResolved) {
              for (let index = 0; index < stdoutMsg.length; index++) {
                const m = stdoutMsg[index];
                if ((data.search(m) !== -1)) {
                  Helpers.info(`[unitlOutputContains] Move to next step...`)
                  isResolved = true;
                  resolve(void 0);
                  break;
                }
              }
            }
            if (!isResolved) {
              for (let index = 0; index < stderMsg.length; index++) {
                const rejectm = stderMsg[index];
                if ((data.search(rejectm) !== -1)) {
                  Helpers.info(`[unitlOutputContains] Rejected move to next step...`);
                  isResolved = true;
                  reject();
                  proc.kill('SIGINT');
                  break;
                }
              }
            }

          });
        });
      }
    }
  }

  //#endregion

}
