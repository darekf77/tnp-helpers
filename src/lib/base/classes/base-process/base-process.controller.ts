//#region imports
import { Taon, ClassHelpers } from 'taon/src';
import { _ } from 'tnp-core/src';
import { BaseCliWorkerController } from 'tnp-helpers/src';

import { BaseProcess } from './base-process';
import { BaseProcessRepository } from './base-process.repository';
import { BaseProcessStartOptions } from './base-process.models';
//#endregion

@Taon.Controller({
  className: 'BaseProcessController',
})
export class BaseProcessController extends BaseCliWorkerController {
  baseProcessRepository = this.injectCustomRepo(BaseProcessRepository);

  /**
   * TODO should be started after
   * worker initialization
   */
  @Taon.Http.POST()
  startCommand(
    @Taon.Http.Param.Body() options: BaseProcessStartOptions,
  ): Taon.Response<BaseProcess[]> {
    //#region @backendFunc
    return async (req, res) => {
      // TODO
      return [];
    };
    //#endregion
  }

  info(): Taon.Response<string> {
    //#region @backendFunc
    return async () => {
      return `BaseProcessController info method called`;
    };
    //#endregion
    // TODO to identify process
  }

  /**
   * STOP also kills worker ???
   */
  @Taon.Http.GET()
  stopCommand(): Taon.Response<BaseProcess[]> {
    //#region @backendFunc
    return async (req, res) => {
      // TODO
      return [];
    };
    //#endregion
  }
}
