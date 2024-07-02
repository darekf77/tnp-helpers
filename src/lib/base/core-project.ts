//#region imports
import { _, path, crossPlatformPath } from 'tnp-core/src';
import type { BaseProject } from './base-project';
import { CLASS } from 'typescript-class-helpers/src';
import { Helpers } from '../index';
//#endregion

//#region core porject environment
export type CoreProjectEnvironment = {
  shortName?: string;
  name?: string;
  description?: string;
  onlineLink?: string;
};
//#endregion

//#region constants
//#region constants / defult db
const defaultDb = {
  projects: [],
};
//#endregion
//#endregion

//#region core project command args options
export type CoreCommandArgOptions<PROJECT extends BaseProject> = {
  project?: PROJECT;
  /**
   * watch mode
   */
  watch?: boolean;
  prod?: boolean;
  debug?: boolean;
  /**
   * first arg from command line
   */
  firstArg?: string;
};
//#endregion

export class CoreProject<PROJECT extends BaseProject = BaseProject> {
  //#region static

  //#region static / core projects
  public static coreProjects: CoreProject<any>[] = [];
  //#endregion

  //#region static / from
  static from<Proj extends BaseProject = BaseProject>(
    options: Omit<CoreProject<Proj>, 'name' | 'url' | 'branch'>,
  ): CoreProject<Proj> {
    //#region @backendFunc
    const proj: CoreProject<Proj> = _.merge(
      new (CoreProject as any)(),
      _.cloneDeep(options),
    );

    const methodsToCheck = [
      ...CLASS.getMethodsNames(CoreProject),
      ...CLASS.getMethodsNames(proj.extends || {}),
      // .filter(f => f.endsWith('Command')),
    ];
    // console.log('methodsToCheck '+ proj.name, methodsToCheck)
    for (const commandName of methodsToCheck) {
      // console.log('initing commandName', commandName)
      proj[commandName as string] =
        proj[commandName] ||
        proj?.extends[commandName] ||
        ((() => {
          Helpers.error(
            `${_.upperFirst(_.startCase(commandName))} not defined for ${proj.name}`,
          );
        }) as any);
    }
    this.coreProjects.push(proj);
    return proj as CoreProject<Proj>;
    //#endregion
  }
  //#endregion

  //#endregion

  //#region constructor
  private constructor() {}
  //#endregion

  //#region properties
  extends?: CoreProject<any>;
  color?: string;
  /**
   * second color for project (optional)
   */
  secondColor?: string;
  /**
   * second color for project (optional)
   */
  thirdColor?: string;
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
  environments?: CoreProjectEnvironment[] = [];
  //#endregion

  //#region methods & getters
  startCommand?: (options: CoreCommandArgOptions<PROJECT>) => Promise<void>;
  relaseCommand?: (options: CoreCommandArgOptions<PROJECT>) => Promise<void>;
  deployCommand?: (options: CoreCommandArgOptions<PROJECT>) => Promise<void>;
  testCommand?: (options: CoreCommandArgOptions<PROJECT>) => Promise<void>;
  buildCommand?: (options: CoreCommandArgOptions<PROJECT>) => Promise<void>;
  docsCommand?: (options: CoreCommandArgOptions<PROJECT>) => Promise<void>;

  /**
   * function to recognize project
   */
  recognizedFn: (project: PROJECT) => boolean;

  /**
   * core porject name from repo basename
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
  //#endregion
}

export const CoreTypescriptProject = CoreProject.from<BaseProject>({
  //#region configuration
  branches: ['master', 'develop'],
  urlHttp: 'https://github.com/microsoft/TypeScript',
  environments: [],
  recognizedFn: project => {
    //#region @backendFunc
    return (
      !project.hasFile('angular.json') &&
      !_.isUndefined(
        Helpers.filesFrom(project.location, false).find(f =>
          path.basename(f).startsWith('tsconfig'),
        ),
      )
    );
    //#endregion
  },
  async startCommand({ project }) {
    //#region @backendFunc
    await project.makeSureNodeModulesInstalled();
    const mainFilePath = Helpers.getValueFromJSON(
      project.pathFor('package.json'),
      'main',
    );
    project.run(`node ${mainFilePath}`).sync();
    //#endregion
  },
  async buildCommand({ project, watch }) {
    //#region @backendFunc
    await project.makeSureNodeModulesInstalled();
    project.run(`npm-run tsc ${watch ? '--watch' : ''}`).sync();
    //#endregion
  },
  //#endregion
});

export const CoreAngularProject = CoreProject.from<BaseProject>({
  //#region configuration
  extends: CoreTypescriptProject,
  branches: ['master', 'develop'],
  urlHttp: 'https://github.com/angular/angular-cli',
  environments: [],
  recognizedFn: project => {
    return project.hasFile('angular.json');
  },
  async startCommand({ project }) {
    await project.makeSureNodeModulesInstalled();
    const port = await project.assignFreePort(4200);
    project.run(`npm-run ng serve --port ${port}`).sync();
  },
  async buildCommand({ project }) {
    await project.makeSureNodeModulesInstalled();
    project.run(`npm-run ng build`).sync();
  },
  //#endregion
});
