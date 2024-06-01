import { _ } from 'tnp-core/src';

export namespace ValidatorsNetwork {
  export function isValidIp(ip: string) {
    if (!_.isString(ip)) {
      return false;
    }
    ip = ip.trim();
    if (ip === 'localhost') {
      return true;
    }
    return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)
  }
}
