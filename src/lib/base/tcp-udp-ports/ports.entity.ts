import { Taon } from 'taon/src';
import { _ } from 'tnp-core/src';
import { NotAssignablePort } from './not-assignable-port.entity';

export type PortStatus =
  | 'unassigned'
  | 'assigned'
  | 'assigned-not-registered'
  | 'assigned-taken-by-os';

export const PortStatusArr: PortStatus[] = [
  'unassigned',
  'assigned',
  'assigned-not-registered',
  'assigned-taken-by-os',
];

@Taon.Entity({
  className: 'Port',
  uniqueKeyProp: 'port',
})
export class Port extends NotAssignablePort {
  static from(opt: Omit<Port, 'version' | '_' | 'clone'>) {
    return _.merge(new Port(), opt);
  }

  //#region port entity / columns / status
  /**
   * Port status
   */
  //#region @websql
  @Taon.Orm.Column.String500<PortStatus>('unassigned')
  //#endregion
  status?: PortStatus;
  //#endregion

  //#region port entity / columns / when assigned timestamp
  /**
   * When port was assigned as registered service
   */
  //#region @websql
  @Taon.Orm.Column.Number()
  //#endregion
  whenAssignedTimestamp?: Number;
  //#endregion
}
