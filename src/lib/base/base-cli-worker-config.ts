import { _ } from 'tnp-core/src';
//#region @backend
import * as columnify from 'columnify';
//#endregion

//#region base worker config
export class BaseCliWorkerConfig {
  static from(opt: Partial<BaseCliWorkerConfig>) {
    return _.merge(new BaseCliWorkerConfig(), opt);
  }

  /**
   * port taken by service
   */
  port: number;
  /**
   * unique in whole system id of service
   */
  serviceID: string;
  /**
   * pid of service process
   */
  pid: number;
  /**
   * timestamp when service was started
   * (in other cases = null)
   */
  startTimestamp: number;
  isEquals(other: BaseCliWorkerConfig) {
    other = BaseCliWorkerConfig.from(other);
    return (
      !!this.serviceID &&
      !!this.port &&
      !!this.pid &&
      this.serviceID === other.serviceID &&
      this.port === other.port &&
      this.pid === other.pid
    );
  }

  get isEmpty() {
    return !this.serviceID && !this.port && !this.pid;
  }

  toString() {
    //#region @backendFunc
    return columnify({
      // status: this.status,
      serviceID: this.serviceID,
      port: this.port,
      pid: this.pid,
    });
    //#endregion
  }
}
//#endregion
