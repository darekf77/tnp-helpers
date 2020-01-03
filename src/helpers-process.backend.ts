//#region imports
import * as child from 'child_process'
import * as _ from 'lodash';
import chalk from 'chalk';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as sleep from 'sleep';
import * as fkill from 'fkill';
import * as dateformat from 'dateformat';

import { Helpers } from './index';
import { Models } from 'tnp-models';
import { CLASS } from 'typescript-class-helpers';
declare const global: any;
const prompts = require('prompts');
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

  pressKeyAndContinue(message = 'Press enter try again') {
    Helpers.log(message);
    require('child_process').spawnSync('read _ ', { shell: true, stdio: [0, 1, 2] });
    // return new Promise((resovle) => {
    //   Helpers.log(message);
    //   process.stdin.once('data', function () {
    //     resovle()
    //   });
    // })
  }

  async  questionYesNo(message: string,
    callbackTrue?: () => any, callbackFalse?: () => any) {

    let response = {
      value: true
    };
    if (!global.tnpNonInteractive) {
      response = await prompts({
        type: 'toggle',
        name: 'value',
        message,
        initial: true,
        active: 'yes',
        inactive: 'no'
      });
    }
    if (response.value) {
      await Helpers.runSyncOrAsync(callbackTrue);
    } else {
      await Helpers.runSyncOrAsync(callbackFalse);
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

  async  compilationWrapper(fn: () => void, taskName: string = 'Task',
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

  async  killProcessByPort(port: number) {
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

  modifyLineByLine(data: string | Buffer | Error, outputLineReplace: (outputLine: string) => string) {
    let modifyOutput = _.isFunction(outputLineReplace);
    if (modifyOutput && _.isString(data)) {
      data = data.split(/\r?\n/).map(line => outputLineReplace(line)).join('\n');
    }
    return data as string;
  }

  logProc(proc: child.ChildProcess, output = true, stdio,
    outputLineReplace: (outputLine: string) => string) {
    Helpers.processes.push(proc);

    proc.stdio = stdio;



    if (output) {
      proc.stdout.on('data', (data) => {
        process.stdout.write(Helpers.modifyLineByLine(data, outputLineReplace))
      })

      proc.stdout.on('error', (data) => {
        console.log(Helpers.modifyLineByLine(data, outputLineReplace));
      })

      proc.stderr.on('data', (data) => {
        process.stderr.write(Helpers.modifyLineByLine(data, outputLineReplace))
      })

      proc.stderr.on('error', (data) => {
        console.log(Helpers.modifyLineByLine(data, outputLineReplace));
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
    return child.execSync(command, { stdio, cwd, maxBuffer })
  }

  runAsyncIn(command: string, options?: Models.dev.RunOptions) {
    const { output, cwd, biggerBuffer, outputLineReplace } = options;
    const maxBuffer = biggerBuffer ? Helpers.bigMaxBuffer : undefined;
    let stdio = Helpers.getStdio(options)
    Helpers.checkProcess(cwd, command);
    return Helpers.logProc(child.exec(command, { cwd, maxBuffer }), output, stdio, outputLineReplace);
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
        let cmd = `tnp ${Helpers.cliTool.paramsFrom(fnName)} ${params}`;
        const toRun = `watch ${that.prepareWatchCommand(cmd)} ${folderPath}`;
        return that.run(toRun, { cwd }).async()
      }
    }
  }





  run(command: string,
    options?: Models.dev.RunOptions) {
    // console.log(`Command: "${command}" , options "${_.isObject(options) ? JSON.stringify(options) : options}"`)
    if (!options) options = {};
    if (options.output === undefined) options.output = true;
    if (options.biggerBuffer === undefined) options.biggerBuffer = false;
    if (options.cwd === undefined) options.cwd = process.cwd()
    return {
      sync(): Buffer {
        if (_.isNumber(options.tryAgainWhenFailAfter) && options.tryAgainWhenFailAfter > 0) {
          try {
            const proc = Helpers.runSyncIn(command, options);
            return proc;
          } catch (error) {
            console.log(`Trying again command: ${command}`)
            sleep.msleep(options.tryAgainWhenFailAfter)
            return Helpers.run(command, options).sync()
          }
        }
        return Helpers.runSyncIn(command, options);
      },
      async() {
        return Helpers.runAsyncIn(command, options);
      }
    }
  }

  //#endregion

}
