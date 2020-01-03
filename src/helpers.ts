import * as _ from 'lodash';
import { HelpersArrayObj } from './helpers-array-obj';
import { HelpersMessages } from './helpers-messages';
import { HelpersStringsRegexes } from './helpers-strings-regexes';
import { HelpersEnvironment } from './helpers-environment';
import { Helpers as HelperNg2Logger } from 'ng2-logger';
//#region @backend
import * as child from 'child_process';
import { Helpers as MorpiHelpers } from 'morphi';
import { HelpersGit } from './helpers-git.backend';
import { HelpersCliTool } from './helpers-cli-tool.backend';
import { HelpersMorphiFramework } from './helpers-morphi-framework.backend';
import { HelpersProcess } from './helpers-process.backend';
import { TsCodeModifer } from './ts-code-modifier';
import { HelpersNpm } from './helpers-npm.backend';
import { HelpersTerminal } from './helpers-system-terminal.backend';
import { HelpersFileFolders } from './helpers-file-folders.backend';
import { Models } from 'tnp-models';
//#endregion
import { Helpers } from './index';
declare const ENV: any;
const config = ENV.config as any;

export function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach(baseCtor => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
      Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name));
    });
  });
}


export class HelpersTnp {
  //#region singleton
  private static _instance: HelpersTnp;
  public static get Instance() {
    if (!HelpersTnp._instance) {
      HelpersTnp._instance = new HelpersTnp();
    }
    return HelpersTnp._instance;
  }
  //#endregion

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
    //#endregion
    public arrays = new HelpersArrayObj(),

  ) {

  }

  get isBrowser() {
    return HelperNg2Logger.isBrowser;
  }

  get isNode() {
    return HelperNg2Logger.isNode;
  }

  async  runSyncOrAsync(fn: Function, args?: any[]) {
    if (_.isUndefined(fn)) {
      return;
    }
    // let wasPromise = false;
    let promisOrValue = fn(args);
    if (promisOrValue instanceof Promise) {
      // wasPromise = true;
      promisOrValue = Promise.resolve(promisOrValue)
    }
    // console.log('was promis ', wasPromise)
    return promisOrValue;
  }

  waitForCondition(conditionFn: (any) => boolean, howOfftenCheckInMs = 1000) {
    return new Promise(async (resolve, reject) => {

      const result = await Helpers.runSyncOrAsync(conditionFn);
      if (result) {
        resolve()
      } else {
        setTimeout(() => {
          Helpers.waitForCondition(conditionFn, howOfftenCheckInMs).then(() => {
            resolve();
          })
        }, howOfftenCheckInMs);
      }
    })
  }

  getBrowserVerPath(moduleName?: string) {
    if (!moduleName) {
      return config.folder.browser;
    }
    return `${config.folder.browser}-for-${moduleName}`;
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
  checkEnvironment = (deps?: Models.morphi.GlobalDependencies) => MorpiHelpers.checkEnvironment(deps)
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
