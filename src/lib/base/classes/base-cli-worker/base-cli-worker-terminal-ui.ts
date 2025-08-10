//#region imports
import { config } from 'tnp-config/src';
import { Helpers, UtilsTerminal } from 'tnp-core/src';
import { _, chalk } from 'tnp-core/src';

import type { CfontAlign, CfontStyle } from '../../../models';

import type { BaseCliWorker } from './base-cli-worker';
import type { BaseCliWorkerController } from './base-cli-worker-controller';
//#endregion

export class BaseCliWorkerTerminalUI<
  WORKER extends BaseCliWorker<BaseCliWorkerController, any>,
> {
  constructor(protected worker: WORKER) {}

  //#region protected methods / text for header
  protected async headerText(): Promise<string> {
    return _.startCase(this.worker.serviceID);
  }
  //#endregion

  //#region protected methods / text header style
  protected textHeaderStyle(): CfontStyle {
    return 'block';
  }
  //#endregion

  //#region protected methods / header text align
  protected headerTextAlign(): CfontAlign {
    return 'left';
  }
  //#endregion

  //#region protected methods / header
  /**
   * override whole terminal header
   */
  protected async header(): Promise<void> {
    //#region @backendFunc
    const cfonts = require('cfonts');
    const output = cfonts.render(await this.headerText(), {
      font: this.textHeaderStyle(),
      align: this.headerTextAlign(),
      colors: ['system'],
      background: 'transparent',
      letterSpacing: 1,
      lineHeight: 1,
      space: true,
      maxLength: '0',
      gradient: false,
      independentGradient: false,
      transitionGradient: false,
      env: 'node',
    });
    console.log(output.string);
    //#endregion
  }
  //#endregion

  //#region protected methods / info message below header
  async infoMessageBelowHeader(): Promise<void> {
    //#region @backendFunc
    Helpers.info(
      `

      Service ${chalk.bold.red(this.worker.serviceID)}` +
        ` (version: ${this.worker.serviceVersion}) started..
      Check info here http://localhost:${chalk.bold(
        this.worker.processLocalInfoObj?.port?.toString(),
      )}/${'info' as keyof BaseCliWorkerController}
      Worker started by ${chalk.bold(config.frameworkName)}

        `,
    );
    //#endregion
  }
  //#endregion

  //#region protected methods / get back action
  protected get backAction() {
    return {
      back: {
        name: 'Back',
      },
    };
  }
  //#endregion

  //#region protected methods / choose action
  protected get chooseAction() {
    return {
      emptyAction: {
        name: ' -- choose any action below --',
        action: async () => {},
      },
    };
  }
  //#endregion

  //#region protected methods / worker terminal actions
  protected getWorkerTerminalActions(options?: {
    exitIsOnlyReturn?: boolean;
    chooseAction?: boolean;
  }): {
    [uniqeActionName: string]: {
      name: string;
      action: () => unknown | Promise<unknown>;
    };
  } {
    //#region @backendFunc
    options = options || {};
    options.chooseAction = _.isBoolean(options.chooseAction)
      ? options.chooseAction
      : true;

    return {
      ...(options.chooseAction ? this.chooseAction : {}),
      openBrowser: {
        name: 'Open browser with service info',
        action: async () => {
          const openInBrowser = require('open');
          openInBrowser(
            `http://localhost:${this.worker.processLocalInfoObj.port}/info`,
          );
        },
      },
      exit: {
        name: options.exitIsOnlyReturn
          ? '< Return to previous menu'
          : `Shut down service`,
        action: async () => {
          if (options.exitIsOnlyReturn) {
            return true; // false will keep loop running
          }
          if (
            await UtilsTerminal.confirm({
              defaultValue: false,
              message: 'Are you sure you want to shut down service?',
            })
          ) {
            await this.worker.kill();
            process.exit(0);
          }
        },
      },
    };
    //#endregion
  }
  //#endregion

  //#region protected methods / info screen
  public async infoScreen(options?: {
    exitIsOnlyReturn?: boolean;
  }): Promise<void> {
    options = options || {};
    while (true) {
      Helpers.clearConsole();

      await this.header();

      await this.infoMessageBelowHeader();
      const choices = this.getWorkerTerminalActions(options);
      const choice = await UtilsTerminal.select<keyof typeof choices>({
        choices,
        question: 'Choose action',
      });
      const action = choices[choice].action;
      const result = await action();
      if (choice === 'exit' && result) {
        break;
      }
    }
  }
  //#endregion

  //#region protected methods / display special worker ready message
  public displaySpecialWorkerReadyMessage(): void {
    console.log(this.worker.SPECIAL_WORKER_READY_MESSAGE);
  }
  //#endregion
}
