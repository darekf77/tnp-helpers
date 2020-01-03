//#region @backend
import chalk from 'chalk';
//#endregion
import { Morphi } from 'morphi';

declare const global: any;
declare const ENV: any;
const config = ENV.config as any;
const PROGRESS_DATA = ENV.PROGRESS_DATA as any;
import { Helpers } from './index';

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
          if (noTrace) {
            !global.muteMessages && console.log(chalk.red(json));
          } else {
            !global.muteMessages && console.trace(chalk.red(json));
          }
        } else {
          console.log(json)
          return;
        }


      } catch (error) {
        if (global.tnp_normal_mode) {
          if (noTrace) {
            !global.muteMessages && console.log(details);
          } else {
            !global.muteMessages && console.trace(details);
          }
        } else {
          console.log(details)
          return;
        }
      }
    } else {
      if (global.tnp_normal_mode) {
        if (noTrace) {
          !global.muteMessages && console.log(chalk.red(details));
        } else {
          !global.muteMessages && console.trace(chalk.red(details));
        }
      } else {
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
      console.log(chalk.green(details))
      global.tnpNonInteractive && PROGRESS_DATA.log({ msg: details })
    }
    //#endregion
  }

  log(details: string) {
    if (Helpers.isBrowser) {
      console.log(details);
      return;
    }
    //#region @backend
    // console.log('global.muteMessages', global.muteMessages);
    // console.log('global.hideLog', global.hideLog);
    if ((!global.muteMessages && !global.hideLog)) {
      console.log(chalk.gray(details))
      global.tnpNonInteractive && PROGRESS_DATA.log({ msg: details })
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
    if (trace) {
      (!global.muteMessages && !global.hideWarnings) && console.trace(chalk.yellow(details))
    } else {
      (!global.muteMessages && !global.hideWarnings) && console.log(chalk.yellow(details))
    }
    //#endregion
  }
}
