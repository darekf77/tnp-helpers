import {
  TaonBaseEntity,
  CustomColumn,
  NumberColumn,
  String500Column,
  TaonEntity,
} from 'taon/src';
import { PrimaryColumn } from 'taon-typeorm/src';
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

@TaonEntity({
  className: 'Port',
  uniqueKeyProp: 'port',
})
export class Port extends TaonBaseEntity {
  static from(
    opt: Omit<
      Port,
      'version' | '_' | 'clone' | 'titleOnList' | 'relation' | 'relations'
    >,
  ) {
    return _.merge(new Port(), opt);
  }

  static getTitleForFreePort(port: Number) {
    return `free port ${port}`;
  }

  get titleOnList(): string {

    //#region @backendFunc
    return `- ${this.port} <${chalk.gray(this.serviceId)}>`;
    //#endregion

  }

  //#region port entity / columns / port

  //#region @websql
  @PrimaryColumn({
    type: 'int',
    unique: true,
  })
  //#endregion

  port: number;
  //#endregion

  //#region port entity / columns /  serviceId

  //#region @websql
  @CustomColumn({
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
  @String500Column<PortStatus>('unassigned')
  //#endregion

  status: PortStatus;
  //#endregion

  //#region port entity / columns / when assigned timestamp
  /**
   * When port was assigned as registered service
   */

  //#region @websql
  @NumberColumn()
  //#endregion

  whenAssignedTimestamp?: Number;
  //#endregion

}
