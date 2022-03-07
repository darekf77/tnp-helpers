import {
  _,
  //#region @backend
  path,
  //#endregion
} from 'tnp-core';

export class HelpersEnvironment {

  environmentName(filename, local_env_name) {
    //#region @backend
    let name = path.basename(filename)
    name = name.replace(/\.js$/, '')
    name = name.replace('environment', '')
    name = name.replace(/\./g, '');
    return name === '' ? local_env_name : name
    //#endregion
  }

  isValidGitRepuUrl(url: string) {
    const regex = /^([A-Za-z0-9]+@|http(|s)\:\/\/)([A-Za-z0-9.]+(:\d+)?)(?::|\/)([\d\/\w.-]+?)(\.git)?$/;
    const res = regex.test(url);
    return res;
  }

  isValidIp(ip: string) {
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
