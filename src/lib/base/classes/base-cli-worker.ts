//#region imports
import { config } from 'tnp-config/src';
import {
  chalk,
  crossPlatformPath,
  _,
  os,
  chokidar,
  UtilsProcess,
  Utils,
  UtilsTerminal,
} from 'tnp-core/src';

import { Helpers } from '../../index';

import { BaseCliWorkerConfig } from './base-cli-worker-config';
import type { BaseCliWorkerController } from './base-cli-worker-controller';
//#endregion

//#region constants
const WORKER_INIT_START_TIME_LIMIT = 25; // 15 seconds max to start worker
const START_PORT_FOR_SERVICES = 3600;
//#endregion

//#region models
export type CfontStyle =
  | 'block'
  | 'slick'
  | 'tiny'
  | 'grid'
  | 'pallet'
  | 'shade'
  | 'chrome'
  | 'simple'
  | 'simpleBlock'
  | '3d'
  | 'simple3d'
  | 'huge';

export type CfontAlign = 'left' | 'center' | 'right' | 'block';
//#endregion

export abstract class BaseCliWorker<
  REMOTE_CTRL extends BaseCliWorkerController = BaseCliWorkerController,
> {
  protected SPECIAL_WORKER_READY_MESSAGE = '$$$ WORKER_READY $$$';

  //#region constructor
  constructor(
    /**
     * unique id for service
     */
    protected readonly serviceID: string,
    /**
     * external command that will start service
     */
    protected readonly startCommand: string,
    /**
     * unique id for service
     */
    protected readonly serviceVersion: string,
  ) {}
  //#endregion

  //#region abstract
  protected abstract startNormallyInCurrentProcess(options?: {});

  public abstract getControllerForRemoteConnection(): Promise<REMOTE_CTRL>;
  //#endregion

  //#region fields & getters

  //#region fields & getters / path to process local info
  protected get pathToProcessLocalInfoJson(): string {
    //#region @backendFunc
    // console.log('os.userInfo()', os.userInfo());
    return crossPlatformPath([
      os.userInfo().homedir,
      `.taon`,
      '__workers-service-process-info__',
      `${this.serviceID}.json`,
    ]);
    //#endregion
  }
  //#endregion

  //#region fields & getters / process local info json object
  protected get processLocalInfoObj(): BaseCliWorkerConfig {
    //#region @backendFunc
    const configJson = Helpers.readJson5(this.pathToProcessLocalInfoJson) || {};
    if (_.isObject(configJson)) {
      return _.merge(new BaseCliWorkerConfig(), configJson);
    }
    return new BaseCliWorkerConfig();
    //#endregion
  }
  //#endregion

  //#endregion

  //#region public methods

  //#region public methods / start if needs to be started
  public async startDetachedIfNeedsToBeStarted(options?: {
    useCurrentWindowForDetach?: boolean;
  }) {
    //#region @backendFunc

    if (this.processLocalInfoObj.isEmpty) {
      // not started ever yet
      await this.startDetached(options);
      return;
    }

    const serviceIsHealthy = await this.isServiceHealthy({
      healthCheckRequestTrys: 1, // just quick check
    });
    if (!serviceIsHealthy) {
      await this.startDetached(options);
      return;
    }
    Helpers.log(`Service "${this.serviceID}" is already started/healthy...`);
    //#endregion
  }
  //#endregion

  //#region public methods / kill
  /**
   * stop if started
   */
  async kill(options?: { dontRemoveConfigFile?: boolean }) {
    //#region @backendFunc
    options = options || {};
    Helpers.log(`Killing service "${this.serviceID}"...`);
    if (this.processLocalInfoObj.isEmpty) {
      Helpers.log(
        `Service "${this.serviceID}" not started - nothing to kill...`,
      );
      return;
    }
    const ctrl = await this.getControllerForRemoteConnection();
    try {
      if (!options.dontRemoveConfigFile) {
        Helpers.removeFileIfExists(this.pathToProcessLocalInfoJson);
      }
      await ctrl.baseCLiWorkerCommand_kill().received;
      Helpers.log(`Service "${this.serviceID}" killed...`);
    } catch (error) {
      Helpers.log(error);
      Helpers.log(`Service "${this.serviceID}" not killed...   `);
    }
    //#endregion
  }
  //#endregion

  //#region public methods / restart
  /**
   * kill detached process and start again
   * @param options.detached - default true
   */
  async restart(options?: {
    detached?: boolean;
    useCurrentWindowForDetach?: boolean;
  }) {
    options = options || {};
    options.detached = _.isUndefined(options.detached) ? true : false;
    await this.kill();
    //longer because os is disposing process previous process

    if (options.detached) {
      Helpers.info(
        `Restarting service "${this.serviceID}" in detached mode...`,
      );
      await this.startDetached(options);
    } else {
      Helpers.info(
        `Restarting service "${this.serviceID}" in current process...`,
      );
      await this.startNormallyInCurrentProcess();
    }
  }
  //#endregion

  //#region public methods / cli start
  /**
   * only for cli start
   * @param cliParams on from cli
   */
  async cliStartProcedure(cliParams: any) {
    const instance: BaseCliWorker = this;
    const detached = !!cliParams['detached'] || !!cliParams['detach'];
    //#region @backendFunc
    if (cliParams['restart']) {
      await instance.restart({
        detached,
      });
      process.exit(0);
    }

    if (cliParams['kill']) {
      await instance.kill();
      process.exit(0);
    }

    if (detached) {
      await instance.startDetachedIfNeedsToBeStarted();
      process.exit(0);
    } else {
      await instance.startNormallyInCurrentProcess();
    }
    //#endregion
  }
  //#endregion

  //#endregion

  //#region protected methods

  //#region protected methods / prevent external config change
  protected preventExternalConfigChange() {
    //#region @backendFunc
    Helpers.info(`watching: ${this.pathToProcessLocalInfoJson}`);
    const currentConfig = this.processLocalInfoObj;
    chokidar.watch(this.pathToProcessLocalInfoJson).on('change', () => {
      Helpers.log(`Service data changed...`);
      if (!this.processLocalInfoObj.isEquals(currentConfig)) {
        Helpers.error(
          `Service config data externally changed... killing service`,
          false,
          true,
        );
      }
    });
    //#endregion
  }
  //#endregion

  //#region protected methods / prevent start if already started
  protected async preventStartIfAlreadyStarted() {
    //#region @backendFunc
    try {
      const isHealthy = await this.isServiceHealthy({
        healthCheckRequestTrys: 2, // check only twice
      });
      if (isHealthy) {
        Helpers.error(
          `Service already started on port ${this.processLocalInfoObj.port} !`,
          false,
          true,
        );
      }
    } catch (error) {}
    //#endregion
  }
  //#endregion

  //#region protected methods / prevent start if already started
  protected async killWorkerWithLowerVersion() {
    //#region @backendFunc
    try {
      const ctrl = await this.getControllerForRemoteConnection();
      Helpers.log(`Checking if current working version is up to date...`);
      // console.log('this.processLocalInfoObj', this.processLocalInfoObj);
      const req = await ctrl.baseCLiWorkerCommand_hasUpToDateVersion(
        _.merge(this.processLocalInfoObj, {
          version: this.serviceVersion,
        }),
      ).received;
      const isUpToDate = req.body.booleanValue;
      if (!isUpToDate) {
        Helpers.info(`Killing service with lower version...`);
        await this.kill({
          dontRemoveConfigFile: true,
        });
        await Helpers.wait(1);
      }
    } catch (error) {}
    //#endregion
  }
  //#endregion

  //#region protected methods / is service healthy
  /**
   * This has 2 purposes:
   * - infinite check when when detached process finished starting
   * - quick check if service is healthy / already started
   */
  protected async isServiceHealthy(options: {
    healthCheckRequestTrys?: number;
  }): Promise<boolean> {
    //#region @backendFunc
    options = options || {};
    const healthCheckRequestTrys = options.healthCheckRequestTrys || 1;
    let i = 0; // 15 seconds to start worker
    while (true) {
      i++;
      Helpers.log(`Checking if service "${this.serviceID}" is starting...`);
      const workerIsStarting = !!this.processLocalInfoObj.startTimestamp;

      if (!workerIsStarting) {
        // initialized worker does not have startTimestamp
        break;
      }
      if (i > WORKER_INIT_START_TIME_LIMIT) {
        return false;
      }
      await Helpers.wait(1);
    }

    i = 0;

    const isWaitingNotCheckingWhen = 10;

    while (true) {
      i++;
      try {
        // const isWaitingNotChecking = i >= isWaitingNotCheckingWhen;
        // TODO: check why this is may not work
        if (isWaitingNotCheckingWhen === i) {
          Helpers.info(`Waiting for service "${this.serviceID}" to start...`);
        } else {
          Helpers.log(`Checking if service "${this.serviceID}" is healthy...`);
        }
        const ctrl = await this.getControllerForRemoteConnection();
        Helpers.log(`Sending is healthy request...`);
        // console.log('this.processLocalInfoObj', this.processLocalInfoObj);
        const req = await ctrl.baseCLiWorkerCommand_isHealthy(
          this.processLocalInfoObj,
        ).received;
        const isHealthy = req.body.booleanValue;
        // console.log('isHealthy', { isHealthy });
        if (isHealthy) {
          Helpers.log(
            `Service "${this.serviceID}" is healthy (response is true)...`,
          );
        } else {
          Helpers.log(
            `Service "${this.serviceID}" is not healthy (response is false)...`,
          );
        }
        if (isHealthy || i === healthCheckRequestTrys) {
          return isHealthy;
        } else {
          Helpers.log('Trying again...');
          await Helpers.wait(1);
          continue;
        }
      } catch (error) {
        if (i >= isWaitingNotCheckingWhen && error?.message) {
          console.error(error.message);
        }

        Helpers.log(
          `Service "${this.serviceID}" is not healthy (can't check health)...`,
        );
        if (i === healthCheckRequestTrys) {
          return false;
        } else {
          Helpers.log('Trying again...');
          await Helpers.wait(1);
          continue;
        }
      }
    }
    //#endregion
  }
  //#endregion

  //#region protected methods / start detached
  /**
   * start if not started detached process
   */
  protected async startDetached(options?: {
    useCurrentWindowForDetach?: boolean;
  }) {
    //#region @backendFunc
    options = options || {};
    Helpers.log(
      `Starting detached command in new terminal "${chalk.bold(this.startCommand)}"...`,
    );
    if (options.useCurrentWindowForDetach) {
      await UtilsProcess.startAsyncChildProcessCommandUntil(this.startCommand, {
        untilOptions: {
          stdout: [this.SPECIAL_WORKER_READY_MESSAGE],
          stderr: [this.SPECIAL_WORKER_READY_MESSAGE],
        },
      });
    } else {
      await UtilsProcess.startInNewTerminalWindow(this.startCommand);
    }

    Helpers.log(
      `Starting detached service "${chalk.bold(this.serviceID)}" - waiting until healthy...`,
    );
    const isServiceHealthy = await this.isServiceHealthy({
      healthCheckRequestTrys: Infinity, // wait infinity until started
    });
    if (!isServiceHealthy) {
      Helpers.throw(`Not able to start service "${this.serviceID}"...`);
      return;
    }
    Helpers.log(
      `Healthy detached service "${chalk.bold(this.serviceID)}" started.`,
    );
    //#endregion
  }
  //#endregion

  //#region protected methods / text for header
  protected async headerText(): Promise<string> {
    return _.startCase(this.serviceID);
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

      Service ${chalk.bold.red(this.serviceID)}` +
        ` (version: ${this.serviceVersion}) started..
      Check info here http://localhost:${chalk.bold(
        this.processLocalInfoObj?.port?.toString(),
      )}/${'info' as keyof BaseCliWorkerController}

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

  //#region protected methods / display special worker ready message
  protected displaySpecialWorkerReadyMessage() {
    console.log(this.SPECIAL_WORKER_READY_MESSAGE);
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
            `http://localhost:${this.processLocalInfoObj.port}/info`,
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
            await this.kill();
            process.exit(0);
          }
        },
      },
    };
    //#endregion
  }
  //#endregion

  //#region protected methods / info screen
  public async infoScreen(options?: { exitIsOnlyReturn?: boolean }) {
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

  //#region protected methods / save process info
  private saveProcessInfo(processConfig: Partial<BaseCliWorkerConfig>) {
    //#region @backendFunc
    processConfig = processConfig || ({} as any);
    if (Helpers.exists(this.pathToProcessLocalInfoJson)) {
      const jsonConfig = Helpers.readJson(this.pathToProcessLocalInfoJson);
      if (_.isObject(jsonConfig) && Object.keys(jsonConfig).length > 0) {
        processConfig = _.merge(jsonConfig, processConfig);
      }
    }

    Helpers.log(
      `Saving process info to "${this.pathToProcessLocalInfoJson}"...`,
    );
    Helpers.log(processConfig);

    Helpers.writeJson(this.pathToProcessLocalInfoJson, processConfig);
    //#endregion
  }
  //#endregion

  //#region protected methods / initialize worker
  protected async initializeWorkerMetadata() {
    //#region @backendFunc
    try {
      const portControllerInstance =
        await this.getControllerForRemoteConnection();

      await portControllerInstance.baseCLiWorkerCommand_initializeMetadata(
        this.serviceID,
        this.serviceVersion,
      ).received;
      this.saveProcessInfo({
        startTimestamp: null,
      });
    } catch (error) {
      this.saveProcessInfo({
        startTimestamp: null,
      });
      Helpers.throw(error);
    }
    // process.on('SIGINT', () => {
    //   this.kill();
    // });
    //#endregion
  }
  //#endregion

  //#region protected methods / wait for process port saved to disk
  protected async waitForProcessPortSavedToDisk(): Promise<void> {
    //#region @backendFunc
    let portForRemote = this.processLocalInfoObj.port;
    const MAX_TRYS = 10;
    let i = 0;
    if (!portForRemote) {
      while (!portForRemote) {
        i++;
        portForRemote = this.processLocalInfoObj.port;
        if (portForRemote) {
          break;
        } else {
          Helpers.log(`Waiting for port to be available...`);
          if (i > MAX_TRYS) {
            Helpers.throw(
              `Can't get port for remote connection..` +
                ` worker process did not start correctly`,
            );
          }
          await Helpers.wait(1);
        }
      }
    }
    //#endregion
  }
  //#endregion

  //#region protected methods / get free port
  async getServicePort(): Promise<number> {
    //#region @backendFunc
    const port = await Utils.getFreePort({
      startFrom: START_PORT_FOR_SERVICES,
    });

    this.saveProcessInfo({
      port,
      serviceID: this.serviceID,
      pid: process.pid,
      startTimestamp: Date.now(),
      version: this.serviceVersion,
    });
    return port;
    //#endregion
  }
  //#endregion

  //#endregion
}
