//#region imports
import { Helpers, crossPlatformPath } from "tnp-core/src";
import { Low } from "../lowdb";
import type { BaseProjectResolver } from "./base-project-resolver";
import { BaseDb } from "./base-db";
//#endregion

const defaultDb = {
  projects: [] as {
    location: string;
  }[],
}

export class ProjectDatabase extends BaseDb<typeof defaultDb>{
  constructor(
    ins: BaseProjectResolver,
  ) {
    super(ins, 'projects', defaultDb);
  }

  async getAllProjectsFromDB() {
    //#region @backendFunc
    const db = await this.useDB();
    return db.data.projects;
    //#endregion
  }
}
