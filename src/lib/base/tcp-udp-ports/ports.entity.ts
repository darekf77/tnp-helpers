import { Taon } from 'taon/src';
import { _, chalk } from 'tnp-core/src';

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
export class Port extends Taon.Base.Entity {
  static from(opt: Omit<Port, 'version' | '_' | 'clone' | 'titleOnList'>) {
    return _.merge(new Port(), opt);
  }

  static getTitleForFreePort(port: Number) {
    return `free port ${port}`
  }

  get titleOnList(): string {
    //#region @backendFunc
    return `- ${this.port} <${chalk.gray(this.serviceId)}>`;
    //#endregion
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
    unique: true,
  })
  //#endregion
  serviceId: string;
  //#endregion

  //#region port entity / columns / status
  /**
   * Port status
   */
  //#region @websql
  @Taon.Orm.Column.String500<PortStatus>('unassigned')
  //#endregion
  status: PortStatus;
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
