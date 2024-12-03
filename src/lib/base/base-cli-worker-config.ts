import { _ } from 'tnp-core/src';
//#region @backend
import * as semver from 'semver';
// import * as columnify from 'columnify';
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
  /**
   * version
   */
  version: string;

  hasBiggerOrEqualWorkerVersionThan(other: BaseCliWorkerConfig) {
    //#region @backendFunc
    other = BaseCliWorkerConfig.from(other);
    if (this.serviceID !== other.serviceID) {
      return false;
    }
    if (!this.version || !other.version) {
      false;
    }
    try {
      return semver.gte(this.version, other.version);
    } catch (error) {
      return false;
    }
    //#endregion
  }

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
}
//#endregion
