//#region imports
import {
  Helpers,
  UtilsOs,
  crossPlatformPath,
  dotTaonFolder,
} from 'tnp-core/src';
import { os } from 'tnp-core/src';
import { config } from 'tnp-core/src';

import { Low } from '../../lowdb'; // @backend
import { JSONFilePreset } from '../../lowdb/node'; // @backend

import type { BaseProjectResolver } from './base-project-resolver';
//#endregion

export class BaseDb<DB extends object> {
  constructor(
    private ins: BaseProjectResolver,
    private dbName: string,
    private defaultDb: DB,
  ) {}

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
    const userFolder = crossPlatformPath([
      UtilsOs.getRealHomeDir(),
      `${dotTaonFolder}/apps/${this.dbName}-db/${this.ins.cliToolNameFn()}`,
    ]);
    try {
      Helpers.mkdirp(userFolder);
    } catch (error) {}
    return crossPlatformPath([userFolder, 'db.json']);
    //#endregion
  }

  //#region @backend
  async getConnection(): Promise<Low<DB>> {
    //#region @backendFunc
    const dbLocation = this.projectsDbLocation;
    // console.log({ dbLocation })

    try {
      this.lowDB = await JSONFilePreset(dbLocation, this.defaultDb);
    } catch (error) {
      Helpers.error(
        `[taon-helpers] Cannot use db.json file for projects in location, restoring default db.`,
        true,
        true,
      );
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
