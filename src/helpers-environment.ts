//#region @backend
import * as fse from 'fs-extra';
import * as path from 'path';
//#endregion

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


  isValidIp(ip: string) {
    if (ip === 'localhost') {
      return true;
    }
    return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)
  }

}
