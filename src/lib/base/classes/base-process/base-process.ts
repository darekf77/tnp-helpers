//#region imports
import { Taon } from 'taon/src';
import { _ } from 'tnp-core/src';

import { BaseProcessDefaultsValues } from './base-process.defaults-values';
import { BaseProcessState } from './base-process.models';
//#endregion

@Taon.Entity({
  className: 'BaseProcess',
  createTable: true,
})
export class BaseProcess extends Taon.Base.AbstractEntity<BaseProcess> {
  //#region @websql
  // @ts-ignore
  @Taon.Orm.Column.String(BaseProcessDefaultsValues.description)
  //#endregion
  description?: string;

  //#region @websql
  @Taon.Orm.Column.Custom({
    type: 'varchar',
    length: 500,
  })
  //#endregion
  command: string;

  //#region @websql
  @Taon.Orm.Column.Custom({
    type: 'varchar',
    length: 1000,
  })
  //#endregion
  cwd: string;

  //#region @websql
  @Taon.Orm.Column.Custom({
    type: 'varchar',
    length: 10,
    default: 'created',
  })
  //#endregion
  state: BaseProcessState;
}
