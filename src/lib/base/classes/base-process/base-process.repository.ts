//#region imports
import { Taon } from 'taon/src';
import { Raw } from 'taon-typeorm/src';
import { _ } from 'tnp-core/src';

import { BaseProcess } from './base-process';
//#endregion

@Taon.Repository({
  className: 'BaseProcessRepository',
})
export class BaseProcessRepository extends Taon.Base.Repository<BaseProcess> {
  entityClassResolveFn: () => typeof BaseProcess = () => BaseProcess;

  start() {
    // TODO
  }

  stop() {
    // TODO
  }

  output() {
    // TODO
  }
}
