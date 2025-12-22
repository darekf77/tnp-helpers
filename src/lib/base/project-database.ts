//#region imports
import { Helpers, crossPlatformPath } from "tnp-core/src";
import type { BaseProjectResolver } from "./classes/base-project-resolver";
import { BaseDb } from "./classes/base-db";
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
    const db = await this.getConnection();
    return db.data.projects;
    //#endregion

  }
}