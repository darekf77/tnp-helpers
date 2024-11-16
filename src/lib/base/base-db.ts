//#region imports
import { Helpers, crossPlatformPath } from "tnp-core/src";

import type { BaseProjectResolver } from "./base-project-resolver";

//#region @backend
import { Low } from "../lowdb";
import { os } from "tnp-core/src";
import { JSONFilePreset } from "../lowdb/node";
//#endregion
//#endregion

export class BaseDb<DB extends object> {

  constructor(
    private ins: BaseProjectResolver,
    private dbName: string,
    private defaultDb: DB,
  ) {

  }
  //#region @backend
  private lowDB: Low<DB>;
  //#endregion

  public get isUsingDB(): boolean {
    //#region @backendFunc
    return !!this.lowDB;
    //#endregion
  }

  get projectsDbLocation() {
    //#region @backendFunc
    const userFolder = crossPlatformPath([os.homedir(), `.taon/apps/${this.dbName}-db/${this.ins.orgName}`]);
    try {
      Helpers.mkdirp(userFolder);
    } catch (error) { }
    return crossPlatformPath([userFolder, 'db.json']);
    //#endregion
  }

  //#region @backend
  async useDB(): Promise<Low<DB>> {
    //#region @backendFunc
    const dbLocation = this.projectsDbLocation;
    // console.log({ dbLocation })

    try {
      this.lowDB = await JSONFilePreset(dbLocation, this.defaultDb);
    } catch (error) {
      Helpers.error(`[taon-helpers] Cannot use db.json file for projects in location, restoring default db.`, true, true)
      Helpers.writeJson(dbLocation, this.defaultDb);
      this.lowDB = await JSONFilePreset(dbLocation, this.defaultDb);
    }

    return this.lowDB;
    //#endregion
    // @ts-ignore
    return void 0;
  }
  //#endregion

}
