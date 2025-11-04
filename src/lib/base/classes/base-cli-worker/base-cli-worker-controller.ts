import { Taon } from 'taon/src';
import { Helpers } from 'tnp-core/src';

import { BaseCliWorkerConfig } from './base-cli-worker-config';
import { BaseCliWorkerUtils } from './base-cli-worker.utils';

@Taon.Controller({
  className: 'BaseCliWorkerController',
})
export abstract class BaseCliWorkerController<
  UPLOAD_FILE_QUERY_PARAMS = {},
> extends Taon.Base.Controller<UPLOAD_FILE_QUERY_PARAMS> {
  /**
   * service id
   */
  private cliWorkerServiceId: string = null;
  private cliWorkerServiceVersion: string = null;

  //#region api methods / initialize metadata
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
  baseCLiWorkerCommand_kill(
    @Taon.Http.Param.Query('dontRemoveConfigFile')
    dontRemoveConfigFile?: boolean,
  ): Taon.Response<void> {
    //#region @backendFunc
    return async () => {
      console.log(`Killing worker "${this.cliWorkerServiceId}"...`);
      setTimeout(async () => {
        console.log(
          `Destroying context worker "${this.cliWorkerServiceId}"...`,
        );
        await this.ctx.destroy();
        if (!dontRemoveConfigFile) {
          Helpers.removeFileIfExists(
            BaseCliWorkerUtils.getPathToProcessLocalInfoJson(
              this.cliWorkerServiceId,
            ),
          );
        }
        Helpers.clearConsole();
        process.exit(0);
      }, 1000); // TODO may be change to 0
    };
    //#endregion
  }
  //#endregion

  //#region api methods / info
  @Taon.Http.HTML({
    pathIsGlobal: true,
    path: '/info',
  })
  info(): Taon.ResponseHtml {
    //#region @backendFunc
    return async () => {
      return `
<html>
<head><title>Service Info</title></head>
<body>
    <h1>Service "${this.cliWorkerServiceId}" is</h1>
    <h1>running healthy on port ${this.ctx.uriPort} </h1>
    <h4>version: ${this.cliWorkerServiceVersion}</h4>
    <h4>pid: ${process.pid}</h4><br>
</body>
<html>
      `;
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
        port: Number(this.ctx.uriPort),
        version: this.cliWorkerServiceVersion,
      });
      // console.log('configWorker', configWorker);
      // console.log('currentConfig', currentConfig);
      return checkingProcessConfig.isEquals(currentConfig);
    };
    //#endregion
  }
  //#endregion

  //#region api methods / has up to date version
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
        port: Number(this.ctx.uriPort),
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
