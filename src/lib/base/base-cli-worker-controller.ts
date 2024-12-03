import { Taon } from 'taon/src';
import { BaseCliWorkerConfig } from './base-cli-worker-config';

@Taon.Controller({
  className: 'BaseCliWorkerController',
})
export abstract class BaseCliWorkerController<ENTITY> extends Taon.Base
  .CrudController<ENTITY> {
  /**
   * service id
   */
  private cliWorkerServiceId: string = null;

  //#region api methods / kill
  @Taon.Http.PUT()
  baseCLiWorkerCommand_initializeMetadata(
    @Taon.Http.Param.Body('serviceId') serviceId: string,
  ): Taon.Response<void> {
    //#region @backendFunc
    return async () => {
      this.cliWorkerServiceId = serviceId;
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
        process.exit(0);
      }, 1000); // TODO may be change to 0
    };
    //#endregion
  }
  //#endregion

  //#region api methods / kill
  @Taon.Http.GET({
    pathIsGlobal: true,
  })
  info(): Taon.Response<string> {
    //#region @backendFunc
    return async () => {
      return `Service ${this.cliWorkerServiceId} is running healthy on port ${this.ctx.uri.port}`;
    };
    //#endregion
  }
  //#endregion

  //#region api methods / info
  @Taon.Http.POST()
  baseCLiWorkerCommand_isHealthy(
    @Taon.Http.Param.Body() configWorker: BaseCliWorkerConfig,
  ): Taon.Response<boolean> {
    //#region @backendFunc
    return async (req, res) => {
      configWorker = BaseCliWorkerConfig.from(configWorker);
      const currentConfig = BaseCliWorkerConfig.from({
        pid: process.pid,
        serviceID: this.cliWorkerServiceId,
        port: Number(this.ctx.uri.port),
      });
      // console.log('configWorker', configWorker);
      // console.log('currentConfig', currentConfig);
      return configWorker.isEquals(currentConfig);
    };
    //#endregion
  }
  //#endregion
}
