import * as _ from 'lodash';

import { HelpersArrayObj } from './helpers-array-obj';
import { HelpersMessages } from './helpers-messages';
import { HelpersStringsRegexes } from './helpers-strings-regexes';
import { HelpersEnvironment } from './helpers-environment';
import { HelpersStrings } from './helpers-strings';
import { Helpers as HelperNg2Logger } from 'ng2-logger';
import { conditionWait } from './condition-wait';
//#region @backend
import * as Task from 'task.js';
import * as os from 'os';
import * as child from 'child_process';
import { URL } from 'url';
import { HelpersGit } from './helpers-git.backend';
import { HelpersCliTool } from './helpers-cli-tool.backend';
import { HelpersMorphiFramework } from './helpers-morphi-framework.backend';
import { HelpersProcess } from './helpers-process.backend';
import { TsCodeModifer } from './ts-code-modifier';
import { HelpersNpm } from './helpers-npm.backend';
import { HelpersTerminal } from './helpers-system-terminal.backend';
import { HelpersFileFolders } from './helpers-file-folders.backend';
import chalk from 'chalk';
import { HelpersDependencies } from './helpers-dependencies.backend';
import { HelpersPath } from './helpers-path.backend';
import { HelpersNetwork } from './helpers-network.backend';
//#endregion
import { config, ConfigModels } from 'tnp-config';
import { Helpers } from './index';
import { CLASS } from 'typescript-class-helpers';
import { Morphi, Models as MorphiModels } from 'morphi';


export function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach(baseCtor => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
      Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name));
    });
  });
}


export class HelpersTnp {

  private static _instance: HelpersTnp;
  public static get Instance() {
    if (!HelpersTnp._instance) {
      HelpersTnp._instance = new HelpersTnp();
    }
    return HelpersTnp._instance;
  }


  //#region @backend
  readonly processes: child.ChildProcess[] = [];
  //#endregion

  private constructor(
    //#region @backend
    public tsCodeModifier = new TsCodeModifer(),
    public cliTool = new HelpersCliTool(),
    public terminal = new HelpersTerminal(),
    public git = new HelpersGit(),
    public npm = new HelpersNpm(),
    public morphi = new HelpersMorphiFramework(),
    public deps = new HelpersDependencies(),
    public path = new HelpersPath(),
    public network = new HelpersNetwork(),
    //#endregion
    public arrays = new HelpersArrayObj(),
    public strings = new HelpersStrings(),

  ) {

  }

  CLIWRAP(f: Function, name: string) {
    CLASS.setName(f, name);
    return f;
  }

  //#region @backend
  urlParse(portOrHost: (number | string | URL), forceDomain = false) {
    let url: URL;
    if (portOrHost instanceof URL) {
      url = portOrHost;
    } else if (_.isNumber(portOrHost)) {
      url = new URL(`http://localhost:${portOrHost}`);
    } else if (!_.isNaN(Number(portOrHost))) {
      url = new URL(`http://localhost:${Number(portOrHost)}`);
    } else if (_.isString(portOrHost)) {
      try {
        url = new URL(portOrHost);
      } catch (error) { }
      if (Helpers.isValidIp(portOrHost)) {
        try {
          url = new URL(`http://${portOrHost}`);
        } catch (error) {
          Helpers.warn(`Not able to get port from ${portOrHost}`)
        }
      }
      if (forceDomain) {
        const domain = (portOrHost as string)
        url = new URL(domain.startsWith('http') ? domain : `http://${portOrHost}`);
      }
    }
    return url;
  }
  //#endregion

  get isBrowser() {
    return HelperNg2Logger.isBrowser;
  }

  get isNode() {
    return HelperNg2Logger.isNode;
  }

  //#region @backend
  localIpAddress() {
    return Helpers.getStringFrom('ipconfig getifaddr en0', `ip v4 address of first ethernet interface`)
  }
  //#endregion

  async runSyncOrAsync(fn: Function, ...firstArg: any[]) {
    if (_.isUndefined(fn)) {
      return;
    }
    // let wasPromise = false;
    let promisOrValue = fn(...firstArg);
    if (promisOrValue instanceof Promise) {
      // wasPromise = true;
      promisOrValue = Promise.resolve(promisOrValue)
    }
    // console.log('was promis ', wasPromise)
    return promisOrValue;
  }

  async mesureExectionInMs(
    description: string,
    functionToExecute: Function,
    ...functionArguments: any[]): Promise<number> {
    var start = new Date()
    await Helpers.runSyncOrAsync(functionToExecute, ...functionArguments);
    //@ts-ignore
    var end = new Date() - start
    if (Morphi.IsBrowser) {
      Helpers.info(`Execution time: ${end.toString()}ms for "${description}"`);
    }
    //#region @backend
    Helpers.info(`Execution time: ${chalk.bold(end.toString())}ms for "${chalk.bold(description)}"`);
    //#endregion
    return end;
  }

  mesureExectionInMsSync(
    description: string,
    functionToExecute: () => void): number {
    var start = new Date()
    functionToExecute();
    //@ts-ignore
    var end = new Date() - start
    if (Morphi.IsBrowser) {
      Helpers.info(`Execution time: ${end.toString()}ms for "${description}"`);
    }
    //#region @backend
    Helpers.info(`Execution time: ${chalk.bold(end.toString())}ms for "${chalk.bold(description)}"`);
    //#endregion
    return end;
  }

  conditionWait = conditionWait;

  waitForCondition(conditionFn: (any) => boolean, howOfftenCheckInMs = 1000) {
    return new Promise(async (resolve, reject) => {

      const result = await Helpers.runSyncOrAsync(conditionFn);
      if (result) {
        resolve(void 0)
      } else {
        setTimeout(() => {
          Helpers.waitForCondition(conditionFn, howOfftenCheckInMs).then(() => {
            resolve(void 0);
          })
        }, howOfftenCheckInMs);
      }
    })
  }

  getBrowserVerPath(moduleName?: string) {
    //#region @backend
    if (!moduleName) {
      return config.folder.browser;
    }
    return `${config.folder.browser}-for-${moduleName}`;
    //#endregion
  }

  getMethodName(obj, method): string {
    var methodName = null;
    Object.getOwnPropertyNames(obj).forEach(prop => {
      if (obj[prop] === method) {
        methodName = prop;
      }
    });

    if (methodName !== null) {
      return methodName;
    }

    var proto = Object.getPrototypeOf(obj);
    if (proto) {
      return Helpers.getMethodName(proto, method);
    }
    return null;
  }

  fixWebpackEnv(env: Object) {
    _.forIn(env, (v, k) => {
      const value: string = v as any;
      if (value === 'true') env[k] = true;
      if (value === 'false') env[k] = false;
    })
  }

  //#region @backend
  async  workerCalculateArray(
    dataToSplit: any[],
    operation: (dataChunk: any[], workerNumber?: number | undefined) => Promise<void>,
    options?: {
      maxesForWorkes?: { [workerMaxes: number]: number; };
      workerLimit?: number;
      globals?: any;
    }
  ) {

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
      }
    }
    if (_.isUndefined(workerLimit) || workerLimit === Infinity) {
      workerLimit = (os.cpus().length - 1);
    }
    if (workerLimit <= 0) {
      workerLimit = 0;
    }

    if ((_.isNumber(maxesForWorkes[0]) && maxesForWorkes[0] > 0 && dataToSplit.length <= maxesForWorkes[0]) ||
      workerLimit === 0) {
      return await operation(dataToSplit, void 0);
    }
    const workersNumber = Number(Object
      .keys(maxesForWorkes)
      .filter(key => key != '0')
      .sort()
      .reverse()
      .find(key => maxesForWorkes[key] <= dataToSplit.length));
    // console.log('workersNumber', workersNumber)
    // console.log('_.isNumber(workersNumber)', _.isNumber(workersNumber))

    let chunks: (any[])[] = [];
    if (_.isNumber(workersNumber)) {
      const splitEven = Math.floor(dataToSplit.length / workersNumber);
      for (let workerIndex = 0; workerIndex <= workersNumber; workerIndex++) {
        if (workerIndex === workersNumber) {
          chunks[chunks.length - 1] = chunks[chunks.length - 1].concat(dataToSplit.slice(workerIndex * splitEven, dataToSplit.length))
        } else {
          chunks.push(dataToSplit.slice(workerIndex * splitEven, workerIndex * splitEven + splitEven));
        }
      }
    }

    const promises = [];
    for (let n = 0; n < chunks.length; n++) {
      ((chunks, n) => {
        const dataChunk = chunks[n];
        console.log(`worker ${n} ` + dataChunk.join(',\t'))
        // console.log('pass to worker', Helpers)
        let task = new Task({
          globals: _.merge(globals, {
            n,
            dataChunk
          }),
          requires: {
            request: 'request-promise',
          }
        });
        promises.push(task.run(operation))
      })(chunks, n);
    }
    return await Promise.all(promises);
  }
  //#endregion

  //#region @backend
  checkEnvironment = (deps?: ConfigModels.GlobalDependencies) => config.checkEnvironment(deps);
  //#endregion
  public applyMixins = applyMixins;
}

export interface HelpersTnp extends
  HelpersMessages,
  HelpersStringsRegexes,
  HelpersEnvironment
  //#region @backend
  ,
  HelpersProcess,
  HelpersFileFolders
//#endregion
{ }

applyMixins(HelpersTnp, [
  HelpersMessages,
  HelpersStringsRegexes,
  HelpersEnvironment,
  //#region @backend
  HelpersProcess,
  HelpersFileFolders,
  //#endregion
]);
