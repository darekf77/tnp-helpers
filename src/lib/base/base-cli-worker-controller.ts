import { Taon } from 'taon/src';
import { BaseCliWorkerConfig } from './base-cli-worker-config';
import { Helpers } from 'tnp-core/src';

@Taon.Controller({
  className: 'BaseCliWorkerController',
})
export abstract class BaseCliWorkerController<ENTITY> extends Taon.Base
  .CrudController<ENTITY> {
  /**
   * service id
   */
  private cliWorkerServiceId: string = null;
  private cliWorkerServiceVersion: string = null;

  //#region api methods / kill
  @Taon.Http.PUT()
  baseCLiWorkerCommand_initializeMetadata(
    @Taon.Http.Param.Body('serviceId') serviceId: string,
    @Taon.Http.Param.Body('serviceVersion') serviceVersion: string,
  ): Taon.Response<void> {
    //#region @backendFunc
    return async () => {
      this.cliWorkerServiceId = serviceId;
      this.cliWorkerServiceVersion = serviceVersion;
    };
    //#endregion
  }
  //#endregion

  //#region api methods / kill
  @Taon.Http.GET()
  baseCLiWorkerCommand_kill(): Taon.Response<void> {
    //#region @backendFunc
    return async () => {
      console.log('Killing worker...');
      setTimeout(() => {
        Helpers.clearConsole();
        process.exit(0);
      }, 1000); // TODO may be change to 0
    };
    //#endregion
  }
  //#endregion

  //#region api methods / info
  @Taon.Http.GET({
    pathIsGlobal: true,
    // overrideContentType: 'text/html',
    // overridResponseType: 'text',
  })
  info(): Taon.Response<string> {
    //#region @backendFunc
    return async () => {
      return (
        `Service "${this.cliWorkerServiceId}" is ` +
        `running healthy on port ${this.ctx.uri.port},
      version: ${this.cliWorkerServiceVersion},
      pid: ${process.pid}
      `
      );
    };
    //#endregion
  }
  //#endregion

  //#region api methods / is healthy
  @Taon.Http.POST()
  baseCLiWorkerCommand_isHealthy(
    @Taon.Http.Param.Body() checkingProcessConfig: BaseCliWorkerConfig,
  ): Taon.Response<boolean> {
    //#region @backendFunc
    return async (req, res) => {
      checkingProcessConfig = BaseCliWorkerConfig.from(checkingProcessConfig);
      const currentConfig = BaseCliWorkerConfig.from({
        pid: process.pid,
        serviceID: this.cliWorkerServiceId,
        port: Number(this.ctx.uri.port),
        version: this.cliWorkerServiceVersion,
      });
      // console.log('configWorker', configWorker);
      // console.log('currentConfig', currentConfig);
      return checkingProcessConfig.isEquals(currentConfig);
    };
    //#endregion
  }
  //#endregion

  //#region api methods / is healthy
  @Taon.Http.POST()
  baseCLiWorkerCommand_hasUpToDateVersion(
    @Taon.Http.Param.Body() checkingProcessConfig: BaseCliWorkerConfig,
  ): Taon.Response<boolean> {
    //#region @backendFunc
    return async (req, res) => {
      checkingProcessConfig = BaseCliWorkerConfig.from(checkingProcessConfig);
      const currentWorkerConfig = BaseCliWorkerConfig.from({
        pid: process.pid,
        serviceID: this.cliWorkerServiceId,
        port: Number(this.ctx.uri.port),
        version: this.cliWorkerServiceVersion,
      });
      // console.log('checkingProcessConfig', checkingProcessConfig);
      // console.log('currentConfig', currentWorkerConfig);
      return currentWorkerConfig.hasBiggerOrEqualWorkerVersionThan(
        checkingProcessConfig,
      );
    };
    //#endregion
  }
  //#endregion
}
