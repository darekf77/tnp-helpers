//#region @backend
import { fse, path } from "tnp-core/src";
//#endregion
import { Helpers } from "../..";
import { config } from "tnp-config/src";


export namespace ValidatorsTaon {
  //#region @backend
  export function isDockerProject(location: string) {
    if (fse.existsSync(path.join(location, 'Dockerfile'))) {
      const packageJson = path.join(location, 'package.json');
      if (!Helpers.exists(packageJson)) {
        Helpers.writeFile(packageJson, {
          "name": path.basename(location),
          "version": "0.0.0"
        })
      }
      const pj = Helpers.readJson(packageJson);
      pj[config.frameworkName] = {
        "type": "docker",
        "version": "v2"
      }
      Helpers.writeFile(packageJson, pj)
      return true;
    }
    return false;
  }
  //#endregion

}
