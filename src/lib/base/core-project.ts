import { _, path, crossPlatformPath } from 'tnp-core/src';
import type { BaseProject } from './base-project';
import { CLASS } from 'typescript-class-helpers';
import { Helpers } from '../index';

export type CoreProjectEnvironment = {
  shortName?: string;
  name?: string;
  description?: string;
  onlineLink?: string;
};
const defaultDb = {
  projects: [],
}

export type CoreCommandArgOptions<PROJECT extends BaseProject> = {
  project?: PROJECT,
  /**
   * watch mode
   */
  watch?: boolean,
  prod?: boolean,
  argumentString?: string,
};

export class CoreProject<PROJECT extends BaseProject = BaseProject> {
  public static coreProjects: CoreProject<any>[] = [];
  static from<Proj extends BaseProject = BaseProject>(options: Omit<CoreProject<Proj>, 'name' | 'url' | 'branch'>): CoreProject<Proj> {
    const proj: CoreProject<Proj> = _.merge(new (CoreProject as any)(), _.cloneDeep(options));

    const methodsToCheck = [
      ...CLASS.getMethodsNames(CoreProject),
      ...CLASS.getMethodsNames(proj.extends || {}),
      // .filter(f => f.endsWith('Command')),
    ];
    // console.log('methodsToCheck '+ proj.name, methodsToCheck)
    for (const commandName of methodsToCheck) {
      // console.log('initing commandName', commandName)
      proj[commandName as string] = proj[commandName] || proj?.extends[commandName] || (() => {
        Helpers.error(`${_.upperFirst(_.startCase(commandName))} not defined for ${proj.name}`)
      }) as any;
    }
    this.coreProjects.push(proj);
    return proj as CoreProject<Proj>;
  }

  private constructor() { }

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

  startCommand?: (options: CoreCommandArgOptions<PROJECT>) => Promise<void>;
  buildCommand?: (options: CoreCommandArgOptions<PROJECT>) => Promise<void>;

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
}




export const CoreTypescriptProject = CoreProject.from<BaseProject>({
  branches: ['master', 'develop'],
  urlHttp: 'https://github.com/microsoft/TypeScript',
  environments: [],
  recognizedFn: (project) => {
    //#region @backendFunc
    return !project.hasFile('angular.json') && !_.isUndefined(Helpers.filesFrom(project.location, false)
      .find(f => path.basename(f).startsWith('tsconfig')));
    //#endregion
  },
  async startCommand({ project }) {
    //#region @backendFunc
    project.makeSureNodeModulesInstalled();
    const mainFilePath = Helpers.getValueFromJSON(project.pathFor('package.json'), 'main');
    project.run(`node ${mainFilePath}`).sync();
    //#endregion
  },
  async buildCommand({ project, watch }) {
    //#region @backendFunc
    project.makeSureNodeModulesInstalled();
    project.run(`npm-run tsc ${watch ? '--watch' : ''}`).sync();
    //#endregion
  }
});


export const CoreAngularProject = CoreProject.from<BaseProject>({
  extends: CoreTypescriptProject,
  branches: ['master', 'develop'],
  urlHttp: 'https://github.com/angular/angular-cli',
  environments: [],
  recognizedFn: (project) => {
    return project.hasFile('angular.json');
  },
  async startCommand({ project }) {
    project.makeSureNodeModulesInstalled();
    const port = await project.assignFreePort(4200);
    project.run(`npm-run ng serve --port ${port}`).sync();
  },
  async buildCommand({ project }) {
    project.makeSureNodeModulesInstalled();
    project.run(`npm-run ng build`).sync();
  }
});
