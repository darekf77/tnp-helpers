//#region @backend
import { fse, path, crossPlatformPath } from 'tnp-core';
export { ChildProcess } from 'child_process';
import { ProjectGit } from './git-project';
import { CLI } from 'tnp-cli';
//#endregion
declare const global: any;
import { config, LibTypeArr, ConfigModels } from 'tnp-config';
import { _, CoreConfig } from 'tnp-core';
import { CLASS } from 'typescript-class-helpers';
import { Models } from 'tnp-models';
import { Morphi } from 'morphi';
import { HelpersTnp } from './helpers';
const Helpers = HelpersTnp.Instance;

export type EmptyProjectStructure = {
  includeContent?: boolean;
  relativePath: string;
  relativeLinkFrom?: string;
};

export class Project<T extends Project<any> = any>
  //#region @backend
  extends ProjectGit
//#endregion
{
  //#region @backend
  @Morphi.Orm.Column.Primary({ type: 'varchar', length: 400 })
  //#endregion

  protected cache = {};

  /**
   * Do use this variable for comparatios
   * ONLY FOR VIEWING
   */
  public readonly _type: ConfigModels.LibType;
  public browser: Pick<Project<any>, 'location' | 'name'> = {} as any;
  public location: string;
  public name: string;
  public genericName: string;
  public isWorkspace: boolean;
  public isVscodeExtension: boolean;
  public isDocker: boolean;
  public isSite: boolean;
  public isSiteInStrictMode?: boolean;
  public isSiteInDependencyMode?: boolean;
  public isCoreProject: boolean;
  public isCommandLineToolOnly: boolean;
  public isGenerated: boolean;
  public isGeneratedForRelease: boolean;
  public isWorkspaceChildProject: boolean;
  public isBasedOnOtherProject: boolean;
  public isForRecreation: boolean;
  public isContainer: boolean;
  public isContainerWithLinkedProjects: boolean;
  public isContainerChild: boolean;
  public isContainerCoreProject: boolean;
  public isStandaloneProject: boolean;
  public isUnknowNpmProject: boolean;
  public isNaviCli: boolean;
  public useFramework: boolean;
  public defaultPort?: number;
  public version: string;
  public lastNpmVersion?: string;
  public _routerTargetHttp?: string;
  public customizableFilesAndFolders: string[];
  public type: ConfigModels.LibType;
  public backupName: string;
  public resources: string[];
  public env: Models.env.EnvConfig;
  public allowedEnvironments: ConfigModels.EnvironmentName[];

  public children: T[];
  public grandpa: T;

  public distribution: T;

  public childrenThatAreLibs?: T[];

  public childrenThatAreClients?: T[];

  public childrenThatAreThirdPartyInNodeModules?: T[];

  public parent: T;

  public preview: T;

  public baseline: T;

  public static projects: Project<any>[] = [];
  /**
   * To speed up checking folder I am keeping pathes for alterdy checked folder
   * This may break things that are creating new projects
   */
  public static emptyLocations: string[] = [];

  static typeFrom(location: string): ConfigModels.LibType {
    //#region @backendFunc
    const PackageJSON = CLASS.getBy('PackageJSON') as any;
    location = crossPlatformPath(location);
    if (!fse.existsSync(location)) {
      return void 0;
    }
    const packageJson = PackageJSON && PackageJSON.fromLocation(location);
    if (!_.isObject(packageJson)) {
      return void 0;
    }
    const type = packageJson.type;
    return type;
    //#endregion
  }

  public static unload(project: Project) {
    Project.projects = Project.projects.filter(f => f !== project);
  }

  public static From<T = Project<any>>(location: string): T {
    //#region @backendFunc
    const PackageJSON = CLASS.getBy('PackageJSON') as any;

    if (!_.isString(location)) {
      Helpers.warn(`[project.from] location is not a string`)
      return;
    }
    if (path.basename(location) === 'dist') {
      location = path.dirname(location);
    }
    location = crossPlatformPath(path.resolve(location));
    if (Project.emptyLocations.includes(location)) {
      if (location.search(`/${config.folder.bundle}`) === -1) {
        Helpers.log(`[project.from] empty location ${location}`, 2)
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
    if (PackageJSON && !PackageJSON.fromLocation(location)) {
      if (!isDockerProject(location)) {
        Helpers.log(`[tnp-helpers][project.from] Cannot find package.json in location: ${location}`, 1);
        Project.emptyLocations.push(location);
        return;
      }
    };
    let type = this.typeFrom(location);
    PackageJSON && checkIfTypeIsNotCorrect(type, location);

    // Helpers.log(`[tnp-helpers] Type "${type}" for ${location} `)
    let resultProject: Project<any>;
    if (type === 'isomorphic-lib') {
      resultProject = new (getClassFunction('ProjectIsomorphicLib'))(location);
    }
    if (type === 'angular-lib') {
      resultProject = new (getClassFunction('ProjectAngularLib'))(location);
    }
    if (type === 'electron-client') {
      resultProject = new (getClassFunction('ProjectElectronClient'))(location);
    }
    if (type === 'vscode-ext') {
      resultProject = new (getClassFunction('ProjectVscodeExt'))(location);
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
    if (type === 'navi') {
      resultProject = new (getClassFunction('ProjectNavi'))(location);
    }
    if (type === 'unknow-npm-project') {
      resultProject = new (getClassFunction('ProjectUnknowNpm'))(location);
    }
    if (type === 'scenario') {
      resultProject = new (getClassFunction('ProjectScenarioReqRes'))(location);
    }

    // log(resultProject ? (`PROJECT ${resultProject.type} in ${location}`)
    //     : ('NO PROJECT FROM LOCATION ' + location))

    if (resultProject) {
      Helpers.log(`[tnp-helpers][project.from] ${CLI.chalk.bold(resultProject.name)} from ...${location.substr(location.length - 100)}`, 1);
    } else {
      if (PackageJSON) {
        Helpers.log(`[tnp-helpers][project.from] project not found in ${location}`, 1);
      } else {
        const packagejsonpath = path.join(location, 'package.json');
        if (fse.existsSync(packagejsonpath)) {
          const name = Helpers.getValueFromJSON(packagejsonpath, 'name');
          // if (name && name === path.basename(location)) { TODO think about it
          if (name) {
            resultProject = new Project();
            resultProject.location = crossPlatformPath(location);
            resultProject.name = name;
            resultProject.type = Helpers.getValueFromJSON(path.join(location, 'package.json'), 'tnp.type');
          }
        }
      }
    }

    return resultProject as any;
    //#endregion
  }

  public static nearestTo<T = Project>(
    absoluteLocation: string,
    options?: { type?: ConfigModels.LibType; findGitRoot?: boolean; onlyOutSideNodeModules?: boolean }): T {
    //#region @backendFunc

    options = options || {};
    const { type, findGitRoot, onlyOutSideNodeModules } = options;

    if (_.isString(type) && !LibTypeArr.includes(type)) {
      Helpers.error(`[tnp-helpers][project.nearestTo] wrong type: ${type}`, false, true)
    }
    if (fse.existsSync(absoluteLocation)) {
      absoluteLocation = fse.realpathSync(absoluteLocation);
    }
    if (fse.existsSync(absoluteLocation) && !fse.lstatSync(absoluteLocation).isDirectory()) {
      absoluteLocation = path.dirname(absoluteLocation);
    }

    let project: Project;
    let previousLocation: string;
    while (true) {
      if (onlyOutSideNodeModules && (path.basename(path.dirname(absoluteLocation)) === 'node_modules')) {
        absoluteLocation = path.dirname(path.dirname(absoluteLocation));
      }
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
      absoluteLocation = crossPlatformPath(path.resolve(newAbsLocation));
      if (!fse.existsSync(absoluteLocation) && absoluteLocation.split('/').length < 2) {
        return;
      }
      if (previousLocation === absoluteLocation) {
        return;
      }
    }
    return project as any;
    //#endregion
  }

  public static allProjectFrom<T = Project>(absoluteLocation: string, stopOnCwd: string = '/') {
    //#region @backendFunc
    const projects = {};
    const projectsList = [];
    let previousAbsLocation: string;
    while (absoluteLocation.startsWith(stopOnCwd)) {
      if (previousAbsLocation === absoluteLocation) {
        break;
      }
      const proj = Project.nearestTo(absoluteLocation);
      if (proj) {
        if (projects[proj.location]) {
          break;
        }
        projects[proj.location] = proj;
        projectsList.push(proj);
        previousAbsLocation = absoluteLocation;
        absoluteLocation = path.dirname(proj.location);
        continue;
      }
      break;
    }
    return projectsList as T[];
    //#endregion
  }

  public static DefaultPortByType(type: ConfigModels.LibType): number {
    if (type === 'workspace') { return 5000; }
    if (type === 'angular-client') { return 4300; }
    if (type === 'angular-lib') { return 4250; }
    if (type === 'electron-client') { return 4350; }
    if (type === 'ionic-client') { return 8080; }
    if (type === 'docker') { return 5000; }
    if (type === 'isomorphic-lib') { return 4000; }
    if (type === 'container' || type === 'unknow-npm-project') {
      return;
    }
  }

  public static get isBundleMode() {
    if (Helpers.isBrowser) {
      return true;
    }
    //#region @backend
    return !(!!global[CoreConfig.message.globalSystemToolMode])
    //#endregion
  }

  static get Current(): Project<any> {
    //#region @backendFunc
    const current = Project.From(process.cwd())
    if (!current) {
      Helpers.warn(`[tnp-helpers] Current location is not a ${CLI.chalk.bold(config.frameworkName)} type project.

      location: "${process.cwd()}"

      }`);
      return void 0;
    }
    return current;
    //#endregion
  }

  //#region @backend
  static get NaviCliLocation() {
    return path.resolve(path.join(Project.Tnp.location, '../navi-cli'));
  }
  //#endregion

  static get Tnp(): Project<any> {
    //#region @backendFunc
    let tnpPorject = Project.From(config.pathes.tnp_folder_location);
    Helpers.log(`USING TNP PATH: ${config.pathes.tnp_folder_location}`)
    if (!tnpPorject && !global.globalSystemToolMode) {
      Helpers.error(`Not able to find tnp project in "${config.pathes.tnp_folder_location}".`)
    }
    return tnpPorject;
    //#endregion
  }

  public static by<T = Project>(
    libraryType: ConfigModels.NewFactoryType,
    version: ConfigModels.FrameworkVersion
      //#region @backend
      = config.defaultFrameworkVersion
    //#endregion
  ): T {
    //#region @backendFunc

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

    const projectPath = config.pathes.projectsExamples(version).projectByType(libraryType);
    if (!fse.existsSync(projectPath)) {
      Helpers.error(`
      ${projectPath}
      ${projectPath.replace(/\//g, '\\\\')}
      ${crossPlatformPath(projectPath)}
      [tnp-helpers] Bad library type "${libraryType}" for this framework version "${version}"

      `, false, true);
    }
    return Project.From<T>(projectPath);
    //#endregion
  }

  defineProperty<T>(variableName: keyof T, classFn: Function) {
    //#region @backendFunc
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
    //#endregion
  }

  public setType(this: Project, type: ConfigModels.LibType) {
    // @ts-ignore
    this._type = type;
  }
  public typeIs(this: Project, ...types: ConfigModels.LibType[]) {
    return this._type && types.includes(this._type);
  }

  public typeIsNot(this: Project, ...types: ConfigModels.LibType[]) {
    return !this.typeIs(...types);
  }

  forEmptyStructure(): EmptyProjectStructure[] {
    return [
      { relativePath: config.file.package_json, includeContent: true },
      { relativePath: config.folder.src },
    ];
  }

}


export type ProjectBuild = { project: Project; appBuild: boolean; };


//#region @backend
function isDockerProject(location: string) {
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

function getClassFunction(className) {
  const classFN = CLASS.getBy(className) as any;
  if (!classFN) {
    Helpers.error(`[tnp-helpers][Project.From] cannot find class function by name ${className}`)
  }
  return classFN;
}


function checkIfTypeIsNotCorrect(type, location) {
  if (_.isString(type) && !LibTypeArr.includes(type as any)) {
    Helpers.error(`Incorrect type: "${type}"

    Please use one of this: ${LibTypeArr.join(',')}

    in
    package.json > ${config.frameworkName}.type

    location: ${location}

    `, false, true);
  }
}
//#endregion
