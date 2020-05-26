//#region @backend
import chalk from 'chalk';
//#endregion
import { PROGRESS_DATA } from 'tnp-models';

declare const global: any;
if (!global['ENV']) {
  global['ENV'] = {};
}
const config = global['ENV'].config as any;

import { Helpers } from './index';

const KEY = {
  LAST_ERROR: Symbol(),
  LAST_INFO: Symbol(),
  LAST_WARN: Symbol(),
  LAST_LOG: Symbol(),
}

export class HelpersMessages {
  error(details: any, noExit = false, noTrace = false) {
    if (Helpers.isBrowser) {
      console.error(details)
      return;
    }
    //#region @backend
    // Error.stackTraceLimit = Infinity;
    if (!global.tnp_normal_mode) {
      noTrace = true;
    }
    if (typeof details === 'object') {
      try {
        const json = JSON.stringify(details)
        if (global.tnp_normal_mode) {
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
        if (global.tnp_normal_mode) {
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
      if (global.tnp_normal_mode) {
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

    if (global[config.message.tnp_normal_mode]) {
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
    if (debugLevel > global.verboseLevel) {
      return;
    }
    //#region @backend
    // console.log('global.muteMessages', global.muteMessages);
    // console.log('global.hideLog', global.hideLog);
    if ((!global.muteMessages && !global.hideLog)) {
      if (global[KEY.LAST_LOG] === details) {
        process.stdout.write('.');
        return;
      } else {
        global[KEY.LAST_LOG] = details;
      }
      if(global.tnp_normal_mode) {
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
    if (!global.tnp_normal_mode) {
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
