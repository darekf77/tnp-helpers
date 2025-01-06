import { Taon } from 'taon/src';
import { _ } from 'tnp-core/src';
import { NotAssignablePort } from './not-assignable-port.entity';

@Taon.Entity({
  className: 'Port',
  uniqueKeyProp: 'port',
})
export class Port extends NotAssignablePort {
  static from(opt: Omit<Port, 'version' | '_' | 'clone'>) {
    return _.merge(new Port(), opt);
  }

  //#region port entity / columns / assigned
  //#region @websql
  @Taon.Orm.Column.Boolean(false)
  //#endregion
  assigned: boolean;
  //#endregion
}
