import { Taon } from 'taon/src';
import { _ } from 'tnp-core/src';

@Taon.Entity({
  className: 'NotAssignablePort',
  uniqueKeyProp: 'port',
})
export class NotAssignablePort extends Taon.Base.Entity {
  static from(opt: Omit<NotAssignablePort, 'version' | '_' | 'clone'>) {
    return _.merge(new NotAssignablePort(), opt);
  }

  //#region port entity / columns / port
  //#region @websql
  @Taon.Orm.Column.Primary({
    type: 'int',
    unique: true,
  })
  //#endregion
  port: number;
  //#endregion

  //#region port entity / columns /  serviceId
  //#region @websql
  @Taon.Orm.Column.Custom({
    type: 'varchar',
    length: 1000,
  })
  //#endregion
  serviceId: string;
  //#endregion
}
