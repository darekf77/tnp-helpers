import { _, path, crossPlatformPath, Helpers } from 'tnp-core/src';
//#region @backend
import { os } from 'tnp-core/src';
// import { JSONFilePreset } from "lowdb/node";
//#endregion
import { Low } from "lowdb"

export type CoreProjectEnvironment = {
  [envName: string]: {
    name: string;
    description?: string;
    onlineLink?: string;
    actionOrNpmTaskName?: string | (() => void),
  };
};

const defaultDb = {
  projects: [],
}


export class CoreProject {
  private static db: Low<typeof defaultDb>;
  public static get isUnsingDB(): boolean {
    return !!this.db;
  }
  static async useDB(appName: string): Promise<Low<typeof defaultDb>> {
    //#region @backendFunc
    // const userFolder = crossPlatformPath([os.homedir(), `./firedev/apps/${appName}`]);
    // try {
    //   Helpers.mkdirp(userFolder);
    // } catch (error) { }
    // const dbLocation = crossPlatformPath([userFolder, 'db.json']);
    // if (!Helpers.exists(dbLocation)) {
    //   this.db = await JSONFilePreset(dbLocation, defaultDb);
    // }
    // // @LAST this for base-project
    // return this.db;
    //#endregion
  }

  db() {
    return CoreProject.useDB(_.kebabCase(this.url));
  }

  static from(options: Omit<CoreProject, 'name' | 'url' | 'branch'>) {
    return _.merge(new (CoreProject as any)(), _.cloneDeep(options));
  }

  provider: string = 'firedev';
  color?: string;
  description?: string;
  /**
   * ssh url for git repo
   */
  urlSSH?: string;
  /**
   * https url for git repo
   */
  urlHttp?: string;
  /**
   * main branches - first is default
   */
  branches: string[];
  /**
   * project environments
   */
  environments: CoreProjectEnvironment;

  /**
   * core porject name
   */
  get name() {
    return path.basename(this.url).replace(/\.git$/, '');
  }

  /**
   * main (default for reset) branch
   */
  get branch() {
    return _.first(this.branches);
  }

  /**
   * url for git repo
   */
  get url(): string {
    return (this.urlHttp ? this.urlHttp : this.urlSSH) || '';
  }
}
