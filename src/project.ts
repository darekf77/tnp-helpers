//#region @backend
import chalk from 'chalk';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as _ from 'lodash';
import * as json5 from 'json5';
export { ChildProcess } from 'child_process';
import { ChildProcess } from 'child_process';
import { ProjectGit } from './git-project';
//#endregion

declare const global: any;
if (!global['ENV']) {
  global['ENV'] = {};
}
const config = global['ENV'].config as any;
import { CLASS } from 'typescript-class-helpers';
import { Models } from 'tnp-models';
import { Morphi } from 'morphi';
import { HelpersTnp } from './helpers';
const Helpers = HelpersTnp.Instance;


function getClassFunction(className) {
  const classFN = CLASS.getBy(className) as any;
  if (!classFN) {
    Helpers.error(`[tnp-helpers][Project.From] cannot find class function by name ${className}`)
  }
  return classFN;
}

export class Project<T extends Models.other.IProject = any>
  //#region @backend
  extends ProjectGit
  implements Models.other.IProject
  //#endregion
   {
  //#region @backend
  @Morphi.Orm.Column.Primary({ type: 'varchar', length: 400 })
  //#endregion
  public location: string;
  public name: string;
  public genericName: string;
  public isWorkspace: boolean;
  public isSite: boolean;
  public isSiteInStrictMode?: boolean;
  public isSiteInDependencyMode?: boolean;
  public isCoreProject: boolean;
  public isCommandLineToolOnly: boolean;
  public isGenerated: boolean;
  public isWorkspaceChildProject: boolean;
  public isBasedOnOtherProject: boolean;
  public isForRecreation: boolean;
  public isContainer: boolean;
  public isContainerWithLinkedProjects: boolean;
  public isContainerChild: boolean;
  public isStandaloneProject: boolean;
  public isUnknowNpmProject: boolean;
  public isTnp: boolean;
  public useFramework: boolean;
  public defaultPort?: number;
  public version: string;
  public _routerTargetHttp?: string;
  public customizableFilesAndFolders: string[];
  public type: Models.libs.LibType;
  public backupName: string;
  public resources: string[];
  public env: Models.env.EnvConfig;
  public allowedEnvironments: Models.env.EnvironmentName[];
  //#region @backend
  public children: T[];
  public grandpa: T;

  public distribution: T;

  public childrenThatAreLibs?: T[];

  public childrenThatAreClients?: T[];

  public childrenThatAreThirdPartyInNodeModules?: T[];

  public parent: T;

  public preview: T;

  public baseline: T;
  //#endregion

  public static projects: Project[] = [];
  /**
   * To speed up checking folder I am keeping pathes for alterdy checked folder
   * This may break things that are creating new projects
   */
  public static emptyLocations: string[] = [];

  //#region @backend
  static typeFrom(location: string): Models.libs.LibType {
    const PackageJSON = CLASS.getBy('PackageJSON') as any;

    if (!fse.existsSync(location)) {
      return void 0;
    }
    const packageJson = PackageJSON.fromLocation(location);
    const type = packageJson.type;
    return type;
  }
  //#endregion

  //#region @backend
  public static From<T = Project>(location: string): T {
    const PackageJSON = CLASS.getBy('PackageJSON') as any;

    if (!_.isString(location)) {
      Helpers.warn(`[project.from] location is not a string`)
      return;
    }
    location = path.resolve(location);
    if (Project.emptyLocations.includes(location)) {
      if (location.search(`/${config.folder.bundle}`) === -1) {
        Helpers.log(`[project.from] empty location ${location}`, 1)
        return;
      }
    }

    const alreadyExist = Project.projects.find(l => l.location.trim() === location.trim());
    if (alreadyExist) {
      return alreadyExist as any;
    }
    if (!fse.existsSync(location)) {
      Helpers.log(`[tnp-helpers][project.from] Cannot find project in location: ${location}`, 1);
      Project.emptyLocations.push(location);
      return;
    }
    if (!PackageJSON.fromLocation(location)) {
      Helpers.log(`[tnp-helpers][project.from] Cannot find package.json in location: ${location}`, 1);
      Project.emptyLocations.push(location);
      return;
    };
    const type = this.typeFrom(location);

    // console.log(`TYpe "${type}" for ${location} `)
    let resultProject: Project;
    if (type === 'isomorphic-lib') {
      resultProject = new (getClassFunction('ProjectIsomorphicLib'))(location);
    }
    if (type === 'angular-lib') {
      resultProject = new (getClassFunction('ProjectAngularLib'))(location);
    }
    if (type === 'angular-client') {
      resultProject = new (getClassFunction('ProjectAngularClient'))(location);
    }
    if (type === 'workspace') {
      resultProject = new (getClassFunction('ProjectWorkspace'))(location);
    }
    if (type === 'docker') {
      resultProject = new (getClassFunction('ProjectDocker'))(location);
    }
    if (type === 'ionic-client') {
      resultProject = new (getClassFunction('ProjectIonicClient'))(location);
    }
    if (type === 'container') {
      resultProject = new (getClassFunction('ProjectContainer'))(location);
    }
    if (type === 'unknow-npm-project') {
      resultProject = new (getClassFunction('ProjectUnknowNpm'))(location);
    }

    // log(resultProject ? (`PROJECT ${resultProject.type} in ${location}`)
    //     : ('NO PROJECT FROM LOCATION ' + location))

    Helpers.log(`[tnp-helpers][project.from] ${chalk.bold(resultProject.name)} from ...${location.substr(location.length - 100)}`, 1)
    return resultProject as any;
  }
  //#endregion

  //#region @backend
  public static nearestTo<T = Project>(
    absoluteLocation: string,
    options?: { type?: Models.libs.LibType; findGitRoot?: boolean; }): T {

    options = options || {};
    const { type, findGitRoot } = options;

    if (_.isString(type) && !Models.libs.LibTypeArr.includes(type)) {
      Helpers.error(`[tnp-helpers][project.nearestTo] wrong type: ${type}`, false, true)
    }
    if (fse.existsSync(absoluteLocation)) {
      absoluteLocation = fse.realpathSync(absoluteLocation)
    }
    if (fse.existsSync(absoluteLocation) && !fse.lstatSync(absoluteLocation).isDirectory()) {
      absoluteLocation = path.dirname(absoluteLocation)
    }
    let project: Project;
    let previousLocation: string;
    while (true) {
      project = Project.From(absoluteLocation);
      if (_.isString(type)) {
        if (project?.typeIs(type)) {
          if (findGitRoot) {
            if (project.git.isGitRoot) {
              break;
            }
          } else {
            break;
          }
        }
      } else {
        if (project) {
          if (findGitRoot) {
            if (project.git.isGitRoot) {
              break;
            }
          } else {
            break;
          }
        }
      }

      previousLocation = absoluteLocation;
      const newAbsLocation = path.join(absoluteLocation, '..');
      if (!path.isAbsolute(newAbsLocation)) {
        return;
      }
      absoluteLocation = path.resolve(newAbsLocation);
      if (!fse.existsSync(absoluteLocation)) {
        return;
      }
      if (previousLocation === absoluteLocation) {
        return;
      }
    }
    return project as any;
  }
  //#endregion


  public static DefaultPortByType(type: Models.libs.LibType): number {
    if (type === 'workspace') { return 5000; }
    if (type === 'angular-client') { return 4300; }
    if (type === 'angular-lib') { return 4250; }
    if (type === 'ionic-client') { return 8080; }
    if (type === 'docker') { return 5000; }
    if (type === 'isomorphic-lib') { return 4000; }
    if (type === 'container' || type === 'unknow-npm-project') {
      return;
    }
    // error(`[project] Cannot resove type for: ${type}`);
  }

  public static get isBundleMode() {
    if (Helpers.isBrowser) {
      return true;
    }
    //#region @backend
    return !(!!global[config.message.tnp_normal_mode])
    //#endregion
  }

  //#region @backend
  static get Current() {

    const current = Project.From(process.cwd())
    if (!current) {
      Helpers.error(`[tnp-helpers] Current location is not a ${chalk.bold(config.frameworkName)} type project.

      location: "${process.cwd()}"

      }`, false, false);
    }
    // log('CURRENT', current.location)
    return current;
  }
  //#endregion

  //#region @backend
  static get Tnp() {

    let frameworkLocation = Project.From(config.pathes.tnp_folder_location);
    if (frameworkLocation) {
      const currentPathInSystem = path.join(frameworkLocation.location, config.file.tnp_system_path_txt);
      if (!fse.existsSync(currentPathInSystem)) {
        Helpers.writeFile(currentPathInSystem, frameworkLocation.location)
      }
    } else {
      let tnpBundleTnpPath;
      if (global.tnp_normal_mode) {
        tnpBundleTnpPath = Helpers.readFile(config.pathes.tnp_system_path_txt).toString().trim()
      } else {
        tnpBundleTnpPath = Helpers.readFile(config.pathes.tnp_system_path_txt_tnp_bundle).toString().trim()
      }
      if (!fse.existsSync(tnpBundleTnpPath)) {
        Helpers.error(`[tnp-helpers] Please build you ${chalk.bold('tnp-npm-project')} first... `)
      }
      frameworkLocation = Project.From(tnpBundleTnpPath)
    }
    return frameworkLocation;
  }
  //#endregion

  //#region @backend
  public static by<T = Project>(
    libraryType: Models.libs.NewFactoryType,
    version: Models.libs.FrameworkVersion = config.defaultFrameworkVersion): T {

    if (libraryType === 'workspace') {
      const workspaceProject = Project.From(config.pathes.projectsExamples(version).workspace);
      return workspaceProject as any;
    }
    if (libraryType === 'container') {
      const containerProject = Project.From(config.pathes.projectsExamples(version).container);
      return containerProject as any;
    }

    if (libraryType === 'single-file-project') {
      const singleFileProject = Project.From(config.pathes.projectsExamples(version).singlefileproject);
      return singleFileProject as any;
    }

    const projectPath = path.join(config.pathes.projectsExamples(version).projectByType(libraryType));
    if (!fse.existsSync(projectPath)) {
      Helpers.error(`[tnp-helpers] Bad library type: ${libraryType} for this framework version: ${version}`, false, true);
    }
    return Project.From<T>(projectPath);
  }
  //#endregion

  //#region @backend

  defineProperty(variableName: string, classFn: Function) {
    const that = this;
    const prefixedName = `__${variableName}`
    Object.defineProperty(this, variableName, {
      get: function () {
        if (!that[prefixedName]) {
          that[prefixedName] = new (classFn as any)(that);
        }
        return that[prefixedName];
      },
      set: function (v) {
        that[prefixedName] = v;
      },
    })
  }

  //#endregion

  browser: Models.other.IProject = {} as any;
  cache = {};

  /**
     * Do use this variable for comparatios
     * ONLY FOR VIEWING
     */
  public readonly _type: Models.libs.LibType;

  public setType(this: Project, type: Models.libs.LibType) {
    // @ts-ignore
    this._type = type;
  }
  public typeIs(this: Project, ...types: Models.libs.LibType[]) {
    return this._type && types.includes(this._type);
  }

  public typeIsNot(this: Project, ...types: Models.libs.LibType[]) {
    return !this.typeIs(...types);
  }

}
