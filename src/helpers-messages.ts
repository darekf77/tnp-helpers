//#region @backend
import chalk from 'chalk';

declare const global: any;
if (!global['ENV']) {
  global['ENV'] = {};
}
const config = global['ENV'].config as any;
//#endregion
import { PROGRESS_DATA } from 'tnp-models';
import { Level } from 'ng2-logger';
import { Helpers } from './index';

const KEY = {
  LAST_ERROR: Symbol(),
  LAST_INFO: Symbol(),
  LAST_WARN: Symbol(),
  LAST_LOG: Symbol(),
}

// export class Log {
//   private static _instance: Log;
//   public Instance() {
//     if (!Log._instance) {
//       Log._instance = new Log();
//     }
//     return Log._instance;
//   }

//   create(name: string, level?: Level) {
//     if (level === void 0) {
//       level = Level.DATA;
//     }
//     return {
//       d(details: string, debugLevel?: number) {
//         return Helpers.log(`[${name}] ${details}`, debugLevel)
//       },
//       i(details: string) {
//         return Helpers.info(`[${name}] ${details}`)
//       },

//       w(details: string, noExit = false, noTrace = false) {
//         return Helpers.error(`[${name}] ${details}`, noExit, noTrace);
//       },
//       er(details: string, ) {
//         return Helpers.info(`[${name}] ${details}`)
//       },
//     }
//   }

// }

export class HelpersMessages {
  error(details: any, noExit = false, noTrace = false) {
    if (Helpers.isBrowser) {
      console.error(details)
      return;
    }
    //#region @backend
    // Error.stackTraceLimit = Infinity;
    if (!global.globalSystemToolMode) {
      noTrace = true;
    }
    if (typeof details === 'object') {
      try {
        const json = JSON.stringify(details)
        if (global.globalSystemToolMode) {
          if (global[KEY.LAST_ERROR] === json) {
            process.stdout.write('.');
            return;
          } else {
            global[KEY.LAST_ERROR] = json;
          }
          if (noTrace) {
            !global.muteMessages && console.log(chalk.red(json));
          } else {
            !global.muteMessages && console.trace(chalk.red(json));
          }
        } else {
          if (global[KEY.LAST_ERROR] === json) {
            process.stdout.write('.');
            return;
          } else {
            global[KEY.LAST_ERROR] = json;
          }
          console.log(json);
          return;
        }


      } catch (error) {
        if (global.globalSystemToolMode) {
          if (global[KEY.LAST_ERROR] === details) {
            process.stdout.write('.');
            return;
          } else {
            global[KEY.LAST_ERROR] = details;
          }
          if (noTrace) {
            !global.muteMessages && console.log(details);
          } else {
            !global.muteMessages && console.trace(details);
          }
        } else {
          if (global[KEY.LAST_ERROR] === details) {
            process.stdout.write('.');
            return;
          } else {
            global[KEY.LAST_ERROR] = details;
          }
          console.log(details)
          return;
        }
      }
    } else {
      if (global.globalSystemToolMode) {
        if (global[KEY.LAST_ERROR] === details) {
          process.stdout.write('.');
          return;
        } else {
          global[KEY.LAST_ERROR] = details;
        }
        if (noTrace) {
          !global.muteMessages && console.log(chalk.red(details));
        } else {
          !global.muteMessages && console.trace(chalk.red(details));
        }
      } else {
        if (global[KEY.LAST_ERROR] === details) {
          process.stdout.write('.');
          return;
        } else {
          global[KEY.LAST_ERROR] = details;
        }
        console.log(details)
        return;
      }

    }

    if (global[config.message.globalSystemToolMode]) {
      if (!noExit) {
        process.exit(1);
      }
    }
    //#endregion
  }

  info(details: string) {
    if (Helpers.isBrowser) {
      console.info(details);
      return;
    }
    //#region @backend
    if (!global.muteMessages && !global.hideInfos) {
      if (global[KEY.LAST_INFO] === details) {
        process.stdout.write('.');
        return;
      } else {
        global[KEY.LAST_INFO] = details;
      }
      console.log(chalk.green(details))
      if (global.tnpNonInteractive) {
        PROGRESS_DATA.log({ msg: details })
      }
    }
    //#endregion
  }

  log(details: string, debugLevel = 0) {
    if (Helpers.isBrowser) {
      console.log(details);
      return;
    }
    //#region @backend
    if (debugLevel > global.verboseLevel) {
      return;
    }
    // console.log('global.muteMessages', global.muteMessages);
    // console.log('global.hideLog', global.hideLog);
    if ((!global.muteMessages && !global.hideLog)) {
      if (global[KEY.LAST_LOG] === details) {
        process.stdout.write('.');
        return;
      } else {
        global[KEY.LAST_LOG] = details;
      }
      if (global.globalSystemToolMode) {
        console.log(chalk.gray(details))
      }
      if (global.tnpNonInteractive) {
        PROGRESS_DATA.log({ msg: details })
      }
    }
    //#endregion
  }

  warn(details: string, trace = false) {
    if (Helpers.isBrowser) {
      console.warn(details);
      return;
    }
    //#region @backend
    if (!global.globalSystemToolMode) {
      trace = false;
    }
    if (global[KEY.LAST_WARN] === details) {
      process.stdout.write('.');
      return;
    } else {
      global[KEY.LAST_WARN] = details;
    }
    if (trace) {
      (!global.muteMessages && !global.hideWarnings) && console.trace(chalk.yellow(details))
    } else {
      (!global.muteMessages && !global.hideWarnings) && console.log(chalk.yellow(details))
    }
    //#endregion
  }
}
