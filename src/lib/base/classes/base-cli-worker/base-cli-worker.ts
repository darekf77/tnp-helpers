//#region imports
// @ts-ignore
import { EndpointContext, Taon } from 'taon/src';
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
  UtilsOs,
} from 'tnp-core/src';

import { CfontAlign, CfontStyle, Helpers } from '../../../index';

import { BaseCliWorkerConfig } from './base-cli-worker-config';
import type { BaseCliWorkerController } from './base-cli-worker-controller';
import { BaseCliWorkerTerminalUI } from './base-cli-worker-terminal-ui';
//#endregion

//#region constants
const WORKER_INIT_START_TIME_LIMIT = 25; // 15 seconds max to start worker
const START_PORT_FOR_SERVICES = 3600;
//#endregion

export abstract class BaseCliWorker<
  REMOTE_CTRL extends BaseCliWorkerController,
  TERMINAL_UI extends BaseCliWorkerTerminalUI<any>,
> {
  //#region fields & getters
  public readonly SPECIAL_WORKER_READY_MESSAGE = '$$$ WORKER_READY $$$';

  // @ts-ignore TODO weird inheritance problem
  readonly terminalUI: TERMINAL_UI = new BaseCliWorkerTerminalUI(this);
  readonly workerContextTemplate: ReturnType<typeof Taon.createContextTemplate>;
  private workerMainContext: ReturnType<typeof Taon.createContext>;
  private workerRemoteContext: ReturnType<typeof Taon.createContext>;
  readonly controllerClass: new () => REMOTE_CTRL;
  private contextForRemoteConnection: EndpointContext;

  //#region fields & getters / path to process local info
  protected get pathToProcessLocalInfoJson(): string {
    //#region @backendFunc
    // console.log('os.userInfo()', os.userInfo());
    return crossPlatformPath([
      UtilsOs.getRealHomeDir(),
      `.taon`,
      '__workers-service-process-info__',
      `${this.serviceID}.json`,
    ]);
    //#endregion
  }
  //#endregion

  //#region fields & getters / process local info json object
  public get processLocalInfoObj(): BaseCliWorkerConfig {
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

  //#region constructor
  constructor(
    /**
     * unique id for service
     */
    public readonly serviceID: string,
    /**
     * external command that will start service
     */
    public readonly startCommand: string,
    /**
     * unique id for service
     */
    public readonly serviceVersion: string,
  ) {}
  //#endregion

  //#region methods / start normally in current process
  /**
   * start normally process
   * this will crash if process already started
   */
  protected async startNormallyInCurrentProcess(): Promise<void> {
    //#region @backendFunc
    Helpers.taskStarted(
      `[${this.serviceID}] Process start in current process...`,
    );
    await this.killWorkerWithLowerVersion();
    await this.preventStartIfAlreadyStarted();
    const port = await this.getServicePort();

    this.workerMainContext = this.workerContextTemplate();
    await this.workerMainContext.initialize({
      overrideHost: `http://localhost:${port}`,
    });

    await this.initializeWorkerMetadata();

    Helpers.info(`Service started !`);
    this.preventExternalConfigChange();
    this.terminalUI.displaySpecialWorkerReadyMessage();
    await this.terminalUI.infoScreen();
    //#endregion
  }
  //#endregion

  //#region methods / get controller for remote connection
  async getControllerForRemoteConnection(): Promise<REMOTE_CTRL> {
    //#region @backendFunc
    await this.waitForProcessPortSavedToDisk();

    if (
      this.contextForRemoteConnection &&
      !_.isNaN(this.contextForRemoteConnection.port) &&
      !_.isNaN(this.processLocalInfoObj.port) &&
      this.contextForRemoteConnection.port !== this.processLocalInfoObj.port
    ) {
      Helpers.logInfo('Destroying old context for remote connection...');
      // debugger;
      await this.contextForRemoteConnection.destroy();
      delete this.contextForRemoteConnection;
    }

    if (!this.contextForRemoteConnection) {
      Helpers.logInfo('Creating new context for remote connection...');
      this.workerRemoteContext = this.workerContextTemplate();
      this.contextForRemoteConnection =
        await this.workerRemoteContext.initialize({
          overrideRemoteHost: `http://localhost:${this.processLocalInfoObj.port}`,
        });
    }

    const taonProjectsController =
      this.contextForRemoteConnection.getInstanceBy(this.controllerClass);
    return taonProjectsController;
    //#endregion
  }
  //#endregion

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
    const detached = !!cliParams['detached'] || !!cliParams['detach'];
    //#region @backendFunc
    if (cliParams['restart']) {
      await this.restart({
        detached,
      });
      process.exit(0);
    }

    if (cliParams['kill']) {
      await this.kill();
      process.exit(0);
    }

    if (detached) {
      await this.startDetachedIfNeedsToBeStarted();
      process.exit(0);
    } else {
      await this.startNormallyInCurrentProcess();
    }
    //#endregion
  }
  //#endregion

  //#region prevent external config change
  protected preventExternalConfigChange() {
    //#region @backendFunc
    Helpers.info(`watching: ${this.pathToProcessLocalInfoJson}`);
    const currentConfig = this.processLocalInfoObj;
    chokidar.watch(this.pathToProcessLocalInfoJson).on('change', () => {
      Helpers.log(`Service data changed...`);
      if (!this.processLocalInfoObj.isEquals(currentConfig)) {
        UtilsTerminal.clearConsole();
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

  //#region prevent prevent start if already started
  protected async preventStartIfAlreadyStarted(): Promise<void> {
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

  //#region prevent kill worker with lower version
  protected async killWorkerWithLowerVersion(): Promise<void> {
    //#region @backendFunc
    Helpers.taskStarted(
      `[${this.serviceID}] Checking if current working version is up to date...`,
    );
    try {
      const ctrl = await this.getControllerForRemoteConnection();
      Helpers.logInfo(
        `[${this.serviceID}] Checking if current working version is up to date...`,
      );
      // console.log('this.processLocalInfoObj', this.processLocalInfoObj);
      const req = await ctrl.baseCLiWorkerCommand_hasUpToDateVersion(
        _.merge(this.processLocalInfoObj, {
          version: this.serviceVersion,
        }),
      ).received;
      Helpers.logInfo(`[${this.serviceID}] Request done...`);
      const isUpToDate = req.body.booleanValue;
      if (!isUpToDate) {
        Helpers.info(
          `[${this.serviceID}] Killing service with lower version...`,
        );
        await this.kill({
          dontRemoveConfigFile: true,
        });
        await UtilsTerminal.wait(1);
      }
    } catch (error) {}
    Helpers.taskDone(
      `[${this.serviceID}] Current working version is up to date !`,
    );
    //#endregion
  }
  //#endregion

  //#region is service healthy
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
      Helpers.logInfo(
        `[${this.serviceID}][timestamp-checking] Checking if service "${this.serviceID}" is starting...`,
      );
      const workerIsStarting = !!this.processLocalInfoObj.startTimestamp;

      if (!workerIsStarting) {
        // initialized worker does not have startTimestamp
        break;
      }
      if (i > WORKER_INIT_START_TIME_LIMIT) {
        return false;
      }
      Helpers.log(
        '[timestamp-checking] Waiting 500 miliseonds for service to start...',
      );
      await UtilsTerminal.wait(1);
    }

    i = 0;

    const isWaitingNotCheckingWhen = 10;

    while (true) {
      i++;
      try {
        // const isWaitingNotChecking = i >= isWaitingNotCheckingWhen;
        // TODO: check why this is may not work
        if (isWaitingNotCheckingWhen === i) {
          Helpers.info(
            `[${this.serviceID}] Waiting for service "${this.serviceID}" ` +
              `to start...`,
          );
        } else {
          Helpers.log(
            `[${this.serviceID}] Checking if service "${this.serviceID}" ` +
              `is healthy...`,
          );
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
          await UtilsTerminal.wait(1);
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
          await UtilsTerminal.wait(1);
          continue;
        }
      }
    }
    //#endregion
  }
  //#endregion

  //#region start detached
  /**
   * start if not started detached process
   */
  protected async startDetached(options?: {
    useCurrentWindowForDetach?: boolean;
  }): Promise<void> {
    //#region @backendFunc
    options = options || {};

    if (options.useCurrentWindowForDetach) {
      Helpers.logInfo(
        `[${this.serviceID}][startDetached] Starting in new terminal "${chalk.bold(this.startCommand)}"...`,
      );
      await UtilsProcess.startAsyncChildProcessCommandUntil(this.startCommand, {
        untilOptions: {
          stdout: [this.SPECIAL_WORKER_READY_MESSAGE],
          stderr: [this.SPECIAL_WORKER_READY_MESSAGE],
        },
        resolveAfterAnyExitCode: true,
      });
    } else {
      Helpers.logInfo(
        `[${this.serviceID}][startDetached] Starting in current terminal "${chalk.bold(this.startCommand)}"...`,
      );
      await UtilsProcess.startInNewTerminalWindow(this.startCommand);
    }

    Helpers.logInfo(
      `"${chalk.bold(this.serviceID)}" - waiting until healthy (Infinite health check trys )...`,
    );
    const isServiceHealthy = await this.isServiceHealthy({
      healthCheckRequestTrys: Infinity, // wait infinity until started
    });
    if (!isServiceHealthy) {
      Helpers.throw(`Not able to start service "${this.serviceID}"...`);
      return;
    }
    Helpers.logInfo(`Healthy service "${chalk.bold(this.serviceID)}" started.`);
    //#endregion
  }
  //#endregion

  //#region save process info
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

  //#region initialize worker
  protected async initializeWorkerMetadata() {
    //#region @backendFunc
    while (true) {
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
        break;
      } catch (error) {
        Helpers.error(error, false, false);
        this.saveProcessInfo({
          startTimestamp: null,
        });
        Helpers.info(
          `[${this.serviceID}][${this.serviceVersion}] Retrying to initialize worker metadata...`,
        );
        await UtilsTerminal.wait(1);
      }
    }

    // process.on('SIGINT', () => {
    //   this.kill();
    // });
    //#endregion
  }
  //#endregion

  //#region wait for process port saved to disk
  protected async waitForProcessPortSavedToDisk(): Promise<void> {
    //#region @backendFunc
    Helpers.logInfo(
      `[${this.serviceID}] Waiting for process port saved to disk...`,
    );
    Helpers.log(`in ${this.pathToProcessLocalInfoJson}`);
    let portForRemote = this.processLocalInfoObj.port;
    const MAX_TRYS = 10;
    let i = 0;
    if (!portForRemote) {
      while (!portForRemote) {
        i++;
        portForRemote = this.processLocalInfoObj.port;
        if (portForRemote) {
          Helpers.taskDone(
            `[${this.serviceID}][${this.serviceVersion}] port assigned: ${portForRemote}`,
          );
          break;
        } else {
          Helpers.logInfo(
            `[${this.serviceID}][${this.serviceVersion}] waiting/checking again for port...`,
          );
          if (i > MAX_TRYS) {
            Helpers.throw(
              `Can't get port for remote connection..` +
                ` worker process did not start correctly`,
            );
          }
          await UtilsTerminal.wait(1);
        }
      }
    }
    //#endregion
  }
  //#endregion

  //#region get free port
  public async getServicePort(): Promise<number> {
    //#region @backendFunc
    Helpers.logInfo(`Getting free port for service...`);
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
    Helpers.logInfo(`Done getting free port for service...`);
    return port;
    //#endregion
  }
  //#endregion
}
