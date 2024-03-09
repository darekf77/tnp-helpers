//#region import
//#region @backend
import { fse, path, crossPlatformPath, portfinder } from 'tnp-core';
export { ChildProcess } from 'child_process';
import { ProjectGit } from './git-project';
import { CLI } from 'tnp-cli';
import { ValidatorsFiredev } from './validators/validators-firedev';
//#endregion
declare const global: any;
import { config, LibTypeArr, ConfigModels } from 'tnp-config';
import { _, CoreConfig } from 'tnp-core';
import { CLASS } from 'typescript-class-helpers';
import { HelpersFiredev } from './helpers';
import { EmptyProjectStructure } from './models';
const Helpers = HelpersFiredev.Instance;
//#endregion

const takenPorts = [];

/**
 * @deprecated
 *
 * use BaseProject instead
 */
export class Project<T extends Project<any> = any>
  //#region @backend
  extends ProjectGit
//#endregion
{
  //#region static
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

  public static From<T = Project<any>>(locationOfProj: string | string[]): T {
    //#region @backendFunc
    if (Array.isArray(locationOfProj)) {
      locationOfProj = locationOfProj.join('/');
    }
    let location = locationOfProj.replace(/\/\//g, '/');

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
      if (location.search(`/${config.folder.dist}`) === -1) {
        Helpers.log(`[project.from] empty location ${location}`, 2)
        return;
      }
    }

    const alreadyExist = Project.projects.find(l => l.location.trim() === location.trim());
    if (alreadyExist) {
      return alreadyExist as any;
    }
    if (!fse.existsSync(location)) {
      Helpers.log(`[firedev-helpers][project.from] Cannot find project in location: ${location}`, 1);
      Project.emptyLocations.push(location);
      return;
    }
    if (PackageJSON && !PackageJSON.fromLocation(location)) {
      if (!ValidatorsFiredev.isDockerProject(location)) {
        Helpers.log(`[firedev-helpers][project.from] Cannot find package.json in location: ${location}`, 1);
        Project.emptyLocations.push(location);
        return;
      }
    };
    let type = this.typeFrom(location);
    PackageJSON && checkIfTypeIsNotCorrect(type, location);

    // Helpers.log(`[firedev-helpers] Type "${type}" for ${location} `)
    let resultProject: Project<any>;
    if (type === 'isomorphic-lib') {
      resultProject = new (getClassFunction('ProjectIsomorphicLib'))(location);
    }
    if (type === 'vscode-ext') {
      resultProject = new (getClassFunction('ProjectVscodeExt'))(location);
    }
    if (type === 'docker') {
      resultProject = new (getClassFunction('ProjectDocker'))(location);
    }
    if (type === 'container') {
      resultProject = new (getClassFunction('ProjectContainer'))(location);
    }
    if (type === 'navi') {
      if (['tnp', 'firedev'].includes(config.frameworkName)) {
        Helpers.error(`
!!!
!!!
       THIS SHOULD NOT BE NAVI PROJECT: ${location}
!!!
!!!
       `, true, true);
      }
      resultProject = new (getClassFunction('ProjectNavi'))(location);
    }
    if (type === 'leaf') {
      resultProject = new (getClassFunction('ProjectLeaf'))(location);
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
      Helpers.log(`[firedev-helpers][project.from] ${CLI.chalk.bold(resultProject.name)} from ...${location.substr(location.length - 100)}`, 1);
    } else {
      if (PackageJSON) {
        Helpers.log(`[firedev-helpers][project.from] project not found in ${location}`, 1);
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
      Helpers.error(`[firedev-helpers][project.nearestTo] wrong type: ${type}`, false, true)
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
    if (type === 'docker') { return 5000; }
    if (type === 'isomorphic-lib') { return 4000; }
    if (type === 'container' || type === 'unknow-npm-project') {
      return;
    }
  }

  public static get isReleaseDistMode() {
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
      Helpers.warn(`[firedev-helpers] Current location is not a ${CLI.chalk.bold(config.frameworkName)} type project.

     location: "${process.cwd()}"

     }`);
      return void 0;
    }
    return current;
    //#endregion
  }


  /**
   * @deprecated
   */
  static get Tnp(): Project<any> {
    //#region @backendFunc
    let tnpPorject = Project.From(config.pathes.tnp_folder_location);
    Helpers.log(`Using ${config.frameworkName} path: ${config.pathes.tnp_folder_location}`, 1)
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

    if (libraryType === 'container') {
      const pathToContainer = config.pathes.projectsExamples(version).container;
      const containerProject = Project.From(pathToContainer);
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
     [firedev-helpers] Bad library type "${libraryType}" for this framework version "${version}"

     `, false, false);
    }
    return Project.From<T>(projectPath);
    //#endregion
  }
  //#endregion

  //#region fields & gettters
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
  public isVscodeExtension: boolean;
  public isDocker: boolean;
  public isCoreProject: boolean;
  public isCommandLineToolOnly: boolean;
  public isGeneratedForRelease: boolean;
  public isForRecreation: boolean;
  public isContainer: boolean;
  public isSmartContainer: boolean;
  public isSmartContainerChild: boolean;
  public isContainerWithLinkedProjects: boolean;
  public isContainerChild: boolean;
  public isContainerCoreProject: boolean;
  public isStandaloneProject: boolean;
  public isMonorepo: boolean;
  public isUnknowNpmProject: boolean;
  public isNaviCli: boolean;
  public useFramework: boolean;
  public defaultPort?: number;
  public version: string;
  public lastNpmVersion?: string;
  public type: ConfigModels.LibType;
  public backupName: string;
  public resources: string[];
  public env?: any;
  public allowedEnvironments: ConfigModels.EnvironmentName[];

  public children: T[];
  public smartContainerBuildTarget: T;
  public grandpa: T;

  public distribution: T;

  public childrenThatAreLibs?: T[];

  public childrenThatAreThirdPartyInNodeModules?: T[];

  public parent: T;

  //#endregion

  //#region methods
  defineProperty<T>(variableName: keyof T, classFn: Function) {
    //#region @backendFunc
    const that = this;

    const className = CLASS.getName(classFn);

    // @ts-ignore
    const prefixedName = `__${variableName}`
    Object.defineProperty(this, variableName, {
      get: function () {
        if (!that[prefixedName]) {
          if (className === 'CopyManager') {
            const CopyMangerClass = CLASS.getBy('CopyManager') as any; // TODO @LAST
            that[prefixedName] = CopyMangerClass.for(this);
          } else {
            if (typeof classFn === 'function') {
              that[prefixedName] = new (classFn as any)(that);
            } else {
              Helpers.warn(`[firedev-helpers] Cannot create dynamic instance of class "${_.kebabCase(prefixedName.replace('__', ''))}".`)
            }
          }

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

  async assignFreePort(startFrom: number, howManyFreePortsAfterThatPort: number = 0): Promise<number> {
    //#region @backendFunc
    const max = 2000;
    let i = 0;
    while (takenPorts.includes(startFrom)) {
      startFrom += (1 + howManyFreePortsAfterThatPort);
    }
    while (true) {
      try {
        const port = await portfinder.getPortPromise({ port: startFrom });
        takenPorts.push(port);
        return port;
      } catch (err) {
        console.log(err)
        Helpers.warn(`Trying to assign port  :${startFrom} but already in use.`, false);
      }
      startFrom += 1;
      if (i++ === max) {
        Helpers.error(`[firedev-helpers]] failed to assign free port after ${max} trys...`);
      }
    }
    //#endregion
  }

  forEmptyStructure(): EmptyProjectStructure[] {
    //#region @backendFunc
    return [
      { relativePath: config.file.package_json, includeContent: true },
      { relativePath: config.folder.src },
    ];
    //#endregion
  }
  //#endregion

}



//#region @backend
function getClassFunction(className) {
  const classFN = CLASS.getBy(className) as any;
  if (!classFN) {
    Helpers.error(`[firedev-helpers][Project.From] cannot find class function by name ${className}`)
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
