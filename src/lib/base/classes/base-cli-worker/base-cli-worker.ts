//#region imports
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
  CoreModels,
} from 'tnp-core/src';

import {
  //  BaseCliWorkerOptionCallable,
  Helpers,
} from '../../../index';

import { BaseCliWorkerConfig } from './base-cli-worker-config';
import type { BaseCliWorkerController } from './base-cli-worker-controller';
import { BaseCliWorkerTerminalUI } from './base-cli-worker-terminal-ui';
import {
  BaseCliMethodOptions,
  BaseCLiWorkerStartMode,
} from './base-cli-worker.models';
import { BaseCliWorkerUtils } from './base-cli-worker.utils';
//#endregion

//#region constants
const WORKER_INIT_START_TIME_LIMIT = 25; // 15 seconds max to start worker
const START_PORT_FOR_SERVICES = 3600;
//#endregion

export abstract class BaseCliWorker<
  REMOTE_CTRL extends BaseCliWorkerController<any>,
  TERMINAL_UI extends BaseCliWorkerTerminalUI<any> = any,
> {
  //#region fields & getters
  public readonly SPECIAL_WORKER_READY_MESSAGE =
    CoreModels.SPECIAL_WORKER_READY_MESSAGE;

  // @ts-ignore TODO weird inheritance problem
  readonly terminalUI: TERMINAL_UI = new BaseCliWorkerTerminalUI(this);
  readonly workerContextTemplate: ReturnType<typeof Taon.createContextTemplate>;

  readonly controllerClass: new () => REMOTE_CTRL;

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

  //#region public

  //#region public fields & getters / process local info json object
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

  //#region public methods / get remote controller
  public async getRemoteControllerFor<ctrl = REMOTE_CTRL>(options?: {
    methodOptions: Partial<BaseCliMethodOptions>;
    /**
     * Optionally get other controller from remote context
     */
    controllerClass?: new () => ctrl;
  }): Promise<ctrl> {
    options = options || ({} as any);
    options.methodOptions = BaseCliMethodOptions.from(options.methodOptions);
    const remoteEndpointContext = await this.getRemoteContextFor(options);

    const taonProjectsController = remoteEndpointContext.getInstanceBy(
      options.controllerClass
        ? (options.controllerClass as any)
        : this.controllerClass,
    );
    return taonProjectsController as any;
  }
  //#endregion

  //#region public methods / kill
  /**
   * stop if started
   */
  public async kill(options?: {
    methodOptions?: Partial<BaseCliMethodOptions>;
    dontRemoveConfigFile?: boolean;
  }): Promise<void> {
    //#region @backendFunc
    options = options || ({} as any);
    options.methodOptions = BaseCliMethodOptions.from(options.methodOptions);

    Helpers.log(`Killing service "${this.serviceID}"...`);
    if (this.processLocalInfoObj.isEmpty) {
      Helpers.log(
        `Service "${this.serviceID}" not started - nothing to kill...`,
      );
      return;
    }
    const ctrl = await this.getRemoteControllerFor({
      methodOptions: options.methodOptions.clone(opt => {
        opt.calledFrom = `${opt.calledFrom}.kill`;
        return opt;
      }),
    });
    try {
      await ctrl
        .baseCLiWorkerCommand_kill(options.dontRemoveConfigFile)
        .request();
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
    methodOptions?: BaseCliMethodOptions;
  }): Promise<void> {
    options = options || ({} as any);
    options.methodOptions = BaseCliMethodOptions.from(options.methodOptions);

    await this.kill({
      methodOptions: options.methodOptions,
    });
    //longer because os is disposing process previous process
    Helpers.info(
      `Restarting service "${this.serviceID}" ` +
        `in ${options.methodOptions.cliParams.mode} mode...`,
    );

    if (
      options.methodOptions.cliParams.mode ===
      BaseCLiWorkerStartMode.IN_CURRENT_PROCESS
    ) {
      await this.startNormallyInCurrentProcess({
        methodOptions: options.methodOptions,
      });
    } else {
      await this.startDetached({
        methodOptions: options.methodOptions,
      });
    }
  }
  //#endregion

  //#region public methods / cli start
  /**
   * only for cli start
   * @param cliParams on from cli
   */
  async cliStartProcedure(options: {
    methodOptions?: Partial<BaseCliMethodOptions>;
  }): Promise<REMOTE_CTRL> {
    //#region @backendFunc
    options = options || ({} as any);
    const methodOptions = BaseCliMethodOptions.from(options.methodOptions);
    if (methodOptions.cliParams.restart) {
      Helpers.logInfo(`--- RESTARTING ----`);
      await this.restart({
        methodOptions,
      });
      process.exit(0);
    }

    if (methodOptions.cliParams.kill) {
      await this.kill({
        methodOptions,
      });
      process.exit(0);
    }

    if (
      options.methodOptions.cliParams.mode ===
      BaseCLiWorkerStartMode.IN_CURRENT_PROCESS
    ) {
      await this.startNormallyInCurrentProcess({
        methodOptions,
      });
    } else {
      await this.startDetachedIfNeedsToBeStarted({
        methodOptions,
      });
    }
    return await this.getRemoteControllerFor({
      methodOptions: methodOptions.clone(opt => {
        opt.calledFrom = `${opt.calledFrom}.cliStartProcedure`;
        return opt;
      }),
    });
    //#endregion
  }
  //#endregion

  //#endregion

  //#region protected

  //#region protected methods / get remote context
  protected async getRemoteContextFor(options?: {
    methodOptions?: Partial<BaseCliMethodOptions>;
  }): Promise<EndpointContext> {
    options = options || ({} as any);
    options.methodOptions = BaseCliMethodOptions.from(options.methodOptions);

    const ipAddressOfTaonInstance =
      options.methodOptions.connectionOptions.ipAddressOfTaonInstance ||
      CoreModels.localhostDomain;
    // on localhost read data from  processLocalInfoObj json
    let port =
      options.methodOptions.connectionOptions.port ||
      this.processLocalInfoObj.port;
    // TODO @LAST throw errror when port is not available
    // -> this can happen in method killWorkerWithLowerVersion()
    // -> this can happen in method preventStartIfAlreadyStarted()
    if (ipAddressOfTaonInstance === CoreModels.localhostDomain && !port) {
      if (this.workerIsStarting) {
        try {
          await this.waitForProcessPortSavedToDisk({
            methodOptions: options.methodOptions.clone(opt => {
              opt.calledFrom = `${opt.calledFrom}.getRemoteContextFor.localhost`;
              return opt;
            }),
          });
        } catch (error) {
          console.error(
            `[getRemoteContextFor] Error while waiting for process port saved to disk`,
          );
        }
      }

      if (this.processLocalInfoPortNotInited) {
        throw new Error(
          `Can't connect to remote context on localhost - port is not defined.
        This can happen when the worker process is not started yet.
      `,
        );
      } else {
        port = this.processLocalInfoObj.port;
      }
    }

    // this.workerRemoteContextFor[ipAddressOfTaonInstance] = remoteCtx;
    const useHttps = ipAddressOfTaonInstance !== CoreModels.localhostDomain;
    const protocol = useHttps ? 'https' : 'http';
    const overrideRemoteHost = `${protocol}://${ipAddressOfTaonInstance}${
      port ? `:${port}` : ''
    }`;

    const remoteCtx = this.workerContextTemplate().cloneAsRemote({
      overrideRemoteHost,
    });
    // @LAST chache remote context per ipAddressOfTaonInstance

    const remoteEndpoitnContext = await remoteCtx.initialize();
    return remoteEndpoitnContext;
  }
  //#endregion

  //#region protected fields & getters / path to process local info
  protected get pathToProcessLocalInfoJson(): string {
    //#region @backendFunc
    // console.log('os.userInfo()', os.userInfo());
    return BaseCliWorkerUtils.getPathToProcessLocalInfoJson(this.serviceID);
    //#endregion
  }
  //#endregion

  //#region protected fields & getters / should wait for process port saved to disk
  protected get processLocalInfoPortNotInited(): boolean {
    return (
      !this.processLocalInfoObj.port ||
      isNaN(Number(this.processLocalInfoObj.port))
    );
  }
  //#endregion

  //#region protected fields & getters / worker is starting
  protected get workerIsStarting(): boolean {
    return !!this.processLocalInfoObj.startTimestamp;
  }
  //#endregion

  //#region protected methods / start if needs to be started
  protected async startDetachedIfNeedsToBeStarted(options?: {
    methodOptions?: Partial<BaseCliMethodOptions>;
  }): Promise<void> {
    //#region @backendFunc
    options = options || ({} as any);
    options.methodOptions = BaseCliMethodOptions.from(options.methodOptions);

    if (this.processLocalInfoObj.isEmpty) {
      // not started ever yet
      await this.startDetached({
        methodOptions: options.methodOptions,
      });
      return;
    }

    const serviceIsHealthy = await this.isServiceHealthy({
      healthCheckRequestTrys: 1, // just quick check
      methodOptions: options.methodOptions,
    });
    if (!serviceIsHealthy) {
      await this.startDetached({
        methodOptions: options.methodOptions,
      });
      return;
    }
    Helpers.log(`Service "${this.serviceID}" is already started/healthy...`);
    //#endregion
  }
  //#endregion

  //#region protected methods / start normally in current process
  /**
   * <strong>IMPORTANT USE ONLY IN DEVELOPMENT !!!</strong>
   * for production use startDetachedIfNeedsToBeStarted()
   * start normally process
   * this will crash if process already started
   */
  protected async startNormallyInCurrentProcess(options?: {
    methodOptions?: Partial<BaseCliMethodOptions>;
    actionBeforeTerminalUI?: () => Promise<void>;
  }): Promise<void> {
    //#region @backendFunc
    options = options || ({} as any);
    options.methodOptions = BaseCliMethodOptions.from(options.methodOptions);
    Helpers.taskStarted(
      `[${this.serviceID}] Process start in current process...`,
    );
    await this.killWorkerWithLowerVersion({
      methodOptions: options.methodOptions,
    });
    await this.preventStartIfAlreadyStarted({
      methodOptions: options.methodOptions,
    });
    const port = await this.getServicePort();

    this.saveProcessInfo({
      port,
      serviceID: this.serviceID,
      pid: process.pid,
      startTimestamp: Date.now(),
      version: this.serviceVersion,
    });

    const workerMainContext = this.workerContextTemplate().cloneAsNormal({
      overrideHost: `http://localhost:${port}`,
    });
    await workerMainContext.initialize();

    await this.initializeWorkerMetadata({
      methodOptions: options.methodOptions,
    });

    Helpers.info(`Service started !`);
    this.preventExternalConfigChange();

    if (_.isFunction(options.actionBeforeTerminalUI)) {
      await options.actionBeforeTerminalUI();
    }
    if (this.terminalUI) {
      this.terminalUI.displaySpecialWorkerReadyMessage();
      await this.terminalUI.infoScreen();
    } else {
      console.log(`
      [${config.frameworkName}-helpers] No terminal UI configured. Not displaying anything.
      `);
    }
    //#endregion
  }
  //#endregion

  //#region protected methods / prevent external config change
  protected preventExternalConfigChange(): void {
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

  //#region protected methods / prevent prevent start if already started
  protected async preventStartIfAlreadyStarted(options?: {
    methodOptions?: Partial<BaseCliMethodOptions>;
  }): Promise<void> {
    //#region @backendFunc
    options = options || ({} as any);
    options.methodOptions = BaseCliMethodOptions.from(options.methodOptions);
    if (!this.processLocalInfoObj.pid || this.processLocalInfoPortNotInited) {
      return;
    }
    try {
      const isHealthy = await this.isServiceHealthy({
        methodOptions: options.methodOptions,
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

  //#region protected methods / prevent kill worker with lower version
  protected async killWorkerWithLowerVersion(options?: {
    methodOptions?: Partial<BaseCliMethodOptions>;
  }): Promise<void> {
    //#region @backendFunc
    options = options || ({} as any);
    options.methodOptions = BaseCliMethodOptions.from(options.methodOptions);
    if (!this.processLocalInfoObj.pid) {
      Helpers.logInfo(`No pid found - skipping version check...`);
      return;
    }
    Helpers.taskStarted(
      `[${this.serviceID}] Checking if current working version is up to date...`,
    );
    try {
      const ctrl = await this.getRemoteControllerFor({
        methodOptions: options.methodOptions.clone(opt => {
          opt.calledFrom = `${opt.calledFrom}.killWorkerWithLowerVersion`;
          return opt;
        }),
      });
      Helpers.logInfo(
        `[${this.serviceID}] Checking if current working version is up to date...`,
      );
      // console.log('this.processLocalInfoObj', this.processLocalInfoObj);
      const req = await ctrl
        .baseCLiWorkerCommand_hasUpToDateVersion(
          _.merge(this.processLocalInfoObj, {
            version: this.serviceVersion,
          }),
        )
        .request();
      Helpers.logInfo(`[${this.serviceID}] Request done...`);
      const isUpToDate = req.body.booleanValue;
      if (!isUpToDate) {
        Helpers.info(
          `[${this.serviceID}] Killing service with lower version...`,
        );
        await this.kill({
          dontRemoveConfigFile: true,
          methodOptions: options.methodOptions,
        });
        await UtilsTerminal.wait(1);
      }
    } catch (error) {
      Helpers.logInfo(`Probably no need to kill worker with lower version`);
    }
    Helpers.taskDone(
      `[${this.serviceID}] Current working version is up to date !`,
    );
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
    methodOptions?: Partial<BaseCliMethodOptions>;
  }): Promise<boolean> {
    //#region @backendFunc
    options = options || ({} as any);
    options.methodOptions = BaseCliMethodOptions.from(options.methodOptions);
    const healthCheckRequestTrys = options.healthCheckRequestTrys || 1;

    //#region timestamp checking
    let i = 0; // 15 seconds to start worker
    while (true) {
      i++;
      Helpers.logInfo(
        `[${this.serviceID}][timestamp-checking][${options.methodOptions.calledFrom}]
         Checking if service "${this.serviceID}" is starting...`,
      );

      if (!this.workerIsStarting) {
        // initialized worker does not have startTimestamp
        break;
      }
      if (i > WORKER_INIT_START_TIME_LIMIT) {
        Helpers.logInfo(
          `[${this.serviceID}][timestamp-checking] Worker "${this.serviceID}" did not start in time...`,
        );
        return false;
      }
      const compareTimestamp =
        Date.now() - this.processLocalInfoObj.startTimestamp;
      if (compareTimestamp > 60000) {
        Helpers.logInfo(
          `[${this.serviceID}][timestamp-checking] Worker "${this.serviceID}" exceeds start time...`,
        );
        return false;
      }
      Helpers.log(
        '[timestamp-checking] Waiting 500 miliseonds for service to start...',
      );
      await UtilsTerminal.wait(1);
    }
    //#endregion

    i = 0;

    const isWaitingNotCheckingWhen = 10;

    while (true) {
      i++;
      try {
        //#region initial message
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
        //#endregion

        //#region request check
        const ctrl = await this.getRemoteControllerFor({
          methodOptions: options.methodOptions.clone(opt => {
            opt.calledFrom = `${opt.calledFrom}.isServiceHealthy`;
            return opt;
          }),
        });
        Helpers.log(`Sending is healthy request...`);
        // console.log('this.processLocalInfoObj', this.processLocalInfoObj);
        const req = await ctrl
          .baseCLiWorkerCommand_isHealthy(this.processLocalInfoObj)
          .request({
            // timeout: 1000,
          });
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
        //#endregion

        if (isHealthy || i === healthCheckRequestTrys) {
          return isHealthy;
        }
      } catch (error) {
        //#region error handling
        if (i >= isWaitingNotCheckingWhen && error?.message) {
          console.error(error.message);
        }

        Helpers.log(
          `Service "${this.serviceID}" is not healthy (can't check health)...`,
        );

        if (i === healthCheckRequestTrys) {
          return false;
        }
        //#endregion
      }
      Helpers.log('Trying again...');
      await UtilsTerminal.wait(1);
    }
    //#endregion
  }
  //#endregion

  //#region protected methods / start detached
  /**
   * start if not started detached process
   */
  protected async startDetached(options?: {
    methodOptions?: Partial<BaseCliMethodOptions>;
  }): Promise<void> {
    //#region @backendFunc
    options = options || ({} as any);

    options.methodOptions = BaseCliMethodOptions.from(options.methodOptions);

    if (
      options.methodOptions.cliParams.mode ===
      BaseCLiWorkerStartMode.CHILD_PROCESS
    ) {
      Helpers.logInfo(
        `[${this.serviceID}][startDetached] ` +
          ` Starting in current terminal
          "${chalk.bold(this.startCommand)}"...`,
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
        `[${this.serviceID}][startDetached] ` +
          `Starting in new terminal
          "${chalk.bold(this.startCommand)}"...`,
      );
      await UtilsProcess.startInNewTerminalWindow(this.startCommand);
    }

    Helpers.logInfo(
      `"${chalk.bold(this.serviceID)}" - waiting until healthy (Infinite health check trys )...`,
    );
    const isServiceHealthy = await this.isServiceHealthy({
      methodOptions: options.methodOptions,
      healthCheckRequestTrys: Infinity, // wait infinity until started
    });
    if (!isServiceHealthy) {
      throw `Not able to start service "${this.serviceID}"...`;
    }
    Helpers.logInfo(`Healthy service "${chalk.bold(this.serviceID)}" started.`);
    //#endregion
  }
  //#endregion

  //#region protected methods / save process info
  private saveProcessInfo(processConfig: Partial<BaseCliWorkerConfig>): void {
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
  protected async initializeWorkerMetadata(options?: {
    methodOptions?: Partial<BaseCliMethodOptions>;
  }): Promise<void> {
    //#region @backendFunc
    options = options || ({} as any);
    options.methodOptions = BaseCliMethodOptions.from(options.methodOptions);
    while (true) {
      try {
        const portControllerInstance = await this.getRemoteControllerFor({
          methodOptions: options.methodOptions.clone(opt => {
            opt.calledFrom = `${opt.calledFrom}.initializeWorkerMetadata`;
            return opt;
          }),
        });

        await portControllerInstance
          .baseCLiWorkerCommand_initializeMetadata(
            this.serviceID,
            this.serviceVersion,
          )
          .request();
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

  //#region protected methods / wait for process port saved to disk
  protected async waitForProcessPortSavedToDisk(options: {
    methodOptions: BaseCliMethodOptions;
  }): Promise<void> {
    //#region @backendFunc
    options = options || ({} as any);
    options.methodOptions = BaseCliMethodOptions.from(options.methodOptions);
    Helpers.logInfo(
      `[${this.serviceID}][${[options.methodOptions.calledFrom]}]` +
        ` Waiting for process port saved to disk...`,
    );
    Helpers.log(`in ${this.pathToProcessLocalInfoJson}`);

    const MAX_TRYS = 30;
    let i = 0;
    if (this.processLocalInfoPortNotInited) {
      while (this.processLocalInfoPortNotInited) {
        i++;
        if (this.processLocalInfoPortNotInited) {
          Helpers.logInfo(
            `[${this.serviceID}][${this.serviceVersion}][${options.methodOptions.calledFrom}]
             waiting/checking again for port...`,
          );
          if (i > MAX_TRYS) {
            throw `[${this.serviceID}][${this.serviceVersion}][${options.methodOptions.calledFrom}]
              Can't get port for remote connection..
              worker process did not start correctly`;
          }
          await UtilsTerminal.wait(1);
        } else {
          Helpers.taskDone(
            `[${this.serviceID}][${this.serviceVersion}][${options.methodOptions.calledFrom}]
             port assigned: ${this.processLocalInfoObj.port}`,
          );
          break;
        }
      }
    }
    //#endregion
  }
  //#endregion

  //#region protected methods / get free port
  protected async getServicePort(): Promise<number> {
    //#region @backendFunc
    Helpers.logInfo(`Getting free port for service...`);
    const port = await Utils.getFreePort({
      startFrom: START_PORT_FOR_SERVICES,
    });

    Helpers.logInfo(`Done getting free port for service...`);
    return port;
    //#endregion
  }
  //#endregion

  //#endregion
}
