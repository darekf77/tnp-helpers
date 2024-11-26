//#region imports
import {
  chalk,
  crossPlatformPath,
  _,
  //#region @backend
  os,
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
  ) {}
  //#endregion

  //#region abstract
  protected abstract startNormallyInCurrentProcess();
  protected abstract getControllerForRemoteConnection(): Promise<
    BaseCliWorkerController<any>
  >;
  //#endregion

  //#region fields & getters

  //#region fields & getters / path to process local info
  private get pathToProcessLocalInfoJson(): string {
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
  async kill() {
    Helpers.log(`Killing service "${this.serviceID}"...`);
    if (this.processLocalInfoObj.isEmpty) {
      Helpers.log(
        `Service "${this.serviceID}" not started - nothing to kill...`,
      );
      return;
    }
    const ctrl = await this.getControllerForRemoteConnection();
    try {
      Helpers.removeFileIfExists(this.pathToProcessLocalInfoJson);
      await ctrl.baseCLiWorkerCommand_kill().received;
      Helpers.log(`Service "${this.serviceID}" killed...`);
    } catch (error) {
      Helpers.log(error);
      Helpers.log(`Service "${this.serviceID}" not killed...   `);
    }
  }
  //#endregion

  //#region public methods / restart
  /**
   * kill detached process and start again
   */
  async restart() {
    await this.kill();
    await this.startDetached();
  }
  //#endregion

  //#endregion

  //#region protected methods

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
  protected async startDetached() {
    //#region @backendFunc
    Helpers.log(
      `Starting detached command in new terminal "${chalk.bold(this.startCommand)}"...`,
    );
    await UtilsProcess.startInNewTerminalWindow(this.startCommand);
    Helpers.log(
      `Starting detached service "${chalk.bold(this.serviceID)}" - waiting until healthy...`,
    );
    const isServiceHealthy = await this.isServiceHealthy({
      healthCheckRequestTrys: 5,
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

  protected async headerText(): Promise<string> {
    return _.startCase(this.serviceID);
  }

  protected headerStyle(): CfontStyle {
    return 'block';
  }

  protected headerAlign(): CfontAlign {
    return 'left';
  }

  protected async header(): Promise<void> {
    const cfonts = require('cfonts');
    const output = cfonts.render(await this.headerText(), {
      font: this.headerStyle(),
      align: this.headerAlign(),
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
  }

  //#region protected methods / info screen
  protected async _infoScreen() {
    while (true) {
      Helpers.clearConsole();

      await this.header();

      Helpers.info(`

        Service ${chalk.bold.red(this.serviceID)} started..
        Check info here http://localhost:${chalk.bold(
          this.processLocalInfoObj?.port?.toString(),
        )}/${'info' as keyof BaseCliWorkerController<any>}

          `);
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
      `Saving process info to "${this.pathToProcessLocalInfoJson}"...
      ${processConfig?.toString()}
      `,
    );

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
    });
    return port;
    //#endregion
  }
  //#endregion

  //#endregion
}
