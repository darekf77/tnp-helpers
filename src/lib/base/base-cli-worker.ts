//#region imports
import {
  chalk,
  crossPlatformPath,
  _,
  //#region @backend
  os,
  chokidar,
  UtilsProcess,
  Utils,
  //#endregion
} from 'tnp-core/src';
import { config } from 'tnp-config/src';
import { Helpers, UtilsTerminal } from '../index';
import type { BaseCliWorkerController } from './base-cli-worker-controller';
import { BaseCliWorkerConfig } from './base-cli-worker-config';
//#endregion

//#region constants
const WORKER_INIT_START_TIME_LIMIT = 15; // 15 seconds max to start worker
const START_PORT_FOR_SERVICES = 3600;
//#endregion

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

export abstract class BaseCliWorker {
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
  protected abstract startNormallyInCurrentProcess(options?: {
    healthCheckRequestTrys?: number;
  });
  protected abstract getControllerForRemoteConnection(): Promise<
    BaseCliWorkerController<any>
  >;
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
  public async startDetachedIfNeedsToBeStarted() {
    //#region @backendFunc

    if (this.processLocalInfoObj.isEmpty) {
      // not started ever yet
      await this.startDetached();
      return;
    }

    const serviceIsHealthy = await this.isServiceHealthy();
    if (!serviceIsHealthy) {
      await this.startDetached();
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
  async restart(options?: { detached?: boolean }) {
    options = options || {};
    options.detached = _.isUndefined(options.detached) ? true : false;
    await this.kill();
    //longer because os is disposing process previous process
    const healthCheckRequestTrys = 20;
    if (options.detached) {
      Helpers.info(
        `Restarting service "${this.serviceID}" in detached mode...`,
      );
      await this.startDetached({
        healthCheckRequestTrys,
      });
    } else {
      Helpers.info(
        `Restarting service "${this.serviceID}" in current process...`,
      );
      await this.startNormallyInCurrentProcess({
        healthCheckRequestTrys,
      });
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
    //#region @backendFunc
    if (cliParams['restart']) {
      await instance.restart({
        detached: !!cliParams['sync'],
      });
      process.exit(0);
    }

    if (cliParams['kill']) {
      await instance.kill();
      process.exit(0);
    }

    if (
      !cliParams['sync'] &&
      (!!cliParams['detached'] || !!cliParams['detach'])
    ) {
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
  protected async preventStartIfAlreadyStarted(options?: {
    healthCheckRequestTrys?: number;
  }) {
    //#region @backendFunc
    options = options || {};
    try {
      const isHealthy = await this.isServiceHealthy({
        healthCheckRequestTrys: options.healthCheckRequestTrys,
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
  protected async isServiceHealthy(options?: {
    healthCheckRequestTrys?: number;
  }): Promise<boolean> {
    //#region @backendFunc
    options = options || {};
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
    const healthCheckRequestTrys = options.healthCheckRequestTrys || 1;

    while (true) {
      i++;
      try {
        Helpers.log(`Checking if service "${this.serviceID}" is healthy...`);
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
        // Helpers.tryCatchError(error);
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

  //#region protected methods / start
  /**
   * start if not started detached process
   */
  protected async startDetached(options?: { healthCheckRequestTrys?: number }) {
    //#region @backendFunc
    options = options || {};
    Helpers.log(
      `Starting detached command in new terminal "${chalk.bold(this.startCommand)}"...`,
    );
    await UtilsProcess.startInNewTerminalWindow(this.startCommand);
    Helpers.log(
      `Starting detached service "${chalk.bold(this.serviceID)}" - waiting until healthy...`,
    );
    const isServiceHealthy = await this.isServiceHealthy({
      healthCheckRequestTrys: options.healthCheckRequestTrys || 15,
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
      )}/${'info' as keyof BaseCliWorkerController<any>}

        `,
    );
    //#endregion
  }
  //#endregion

  //#region protected methods / info screen
  protected async _infoScreen() {
    while (true) {
      Helpers.clearConsole();

      await this.header();

      await this.infoMessageBelowHeader();
      const choices = {
        openBrowser: {
          name: 'Open browser with service info',
        },
        // showAllProcesses: {
        //   name: 'Show all processes',
        // },
        // showLogo: {
        //   name: 'Show logo',
        // },
        exit: {
          name: `Shut down service`,
        },
      };
      const choice = await UtilsTerminal.select<keyof typeof choices>({
        choices,
        question: 'Choose action',
      });
      if (choice === 'openBrowser') {
        const openInBrowser = require('open');
        openInBrowser(`http://localhost:${this.processLocalInfoObj.port}/info`);
      }
      if (choice === 'exit') {
        process.exit(0);
      }
      switch (choice) {
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
