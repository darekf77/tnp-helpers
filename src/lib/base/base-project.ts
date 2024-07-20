//#region import
//#region @backend
import { translate } from './translate';

import { fse, portfinder, chalk } from 'tnp-core/src';
export { ChildProcess } from 'child_process';
import { CommandOutputOptions } from 'tnp-core/src';

//#endregion
import { CoreModels } from 'tnp-core/src';
import { CLI } from 'tnp-cli/src';
import { path, crossPlatformPath } from 'tnp-core/src';
import { config } from 'tnp-config/src';
import { _ } from 'tnp-core/src';
import {
  CommitData,
  CoreProject,
  Helpers,
  LinkedPorjectsConfig,
  LinkedProject,
  TypeOfCommit,
} from '../index';
import { BaseProjectResolver } from './base-project-resolver';
import {
  BaseProjectType,
  LibrariesBuildOptions,
  LibraryBuildCommandOptions,
  NgProject,
} from '../models';
import type { BaseLibraryBuild } from './base-library-build';
import { BaseNpmHelpers } from './base-npm-helpers';
import { BaseLinkedProjects } from './base-linked-projects';
import { BaseGit } from './base-git';
//#endregion

const takenPorts = [];

export abstract class BaseProject<
  PROJCET extends BaseProject = any,
  TYPE = BaseProjectType,
> {
  //#region static

  //#region static / instance of resovle
  static ins = new BaseProjectResolver<BaseProject>(BaseProject);
  //#endregion

  //#endregion

  //#region fields
  public cache: any = {};
  public static cache: any = {};
  public get globalCache() {
    return BaseProject.cache;
  }
  readonly type: TYPE | string = 'unknow';

  /**
   * resolve instance
   */
  abstract readonly ins: BaseProjectResolver<PROJCET>;
  /**
   * Unique free port for project instance
   * only available after executing *this.assignFreePort()*
   */
  readonly port: string;

  public libraryBuild: BaseLibraryBuild;
  public npmHelpers: BaseNpmHelpers;
  public linkedProjects: BaseLinkedProjects;
  public git: BaseGit;
  //#endregion

  private __location: string;
  get location(): string {
    return this.__location;
  }
  set location(v: string) {
    this.__location = crossPlatformPath(v);
  }

  //#region constructor
  // @ts-ignore
  constructor(
    /**
     * doesn't need to be real path -> can be link
     */
    location: string,
  ) {
    this.location = location;
    //#region @backend
    // @ts-ignore
    this.libraryBuild = new (require('./base-library-build')
      .BaseLibraryBuild as typeof BaseLibraryBuild)(this as any);

    this.npmHelpers = new (require('./base-npm-helpers')
      .BaseNpmHelpers as typeof BaseNpmHelpers)(this as any);

    this.linkedProjects = new (require('./base-linked-projects')
      .BaseLinkedProjects as typeof BaseLinkedProjects)(this as any);

    this.git = new (require('./base-git').BaseGit as typeof BaseGit)(
      this as any,
    );
    //#endregion
  }
  //#endregion

  //#region methods & getters / is monorepo
  get isMonorepo(): boolean {
    return false;
  }
  //#endregion

  //#region getters & methods / order core projects
  protected orderCoreProjects(coreProjects: CoreProject[]): CoreProject[] {
    const projectMap = new Map<CoreProject, CoreProject[]>();

    // Initialize the project map
    for (const project of coreProjects) {
      projectMap.set(project, []);
    }

    // Populate the project map with dependencies
    for (const project of coreProjects) {
      if (!projectMap.has(project.extends)) {
        projectMap.set(project.extends, []);
      }
      projectMap.get(project.extends)!.push(project);
    }

    const orderedProjects: CoreProject[] = [];
    const visited = new Set<CoreProject>();

    const visit = (project: CoreProject) => {
      if (!visited.has(project)) {
        visited.add(project);
        const dependencies = projectMap.get(project);
        if (dependencies) {
          for (const dep of dependencies) {
            visit(dep);
          }
        }
        orderedProjects.push(project);
      }
    };

    // Visit each project
    for (const project of coreProjects) {
      visit(project);
    }

    return orderedProjects.reverse();
  }
  //#endregion

  //#region methods & getters / core

  get core(): CoreProject {
    if (!_.isUndefined(this.cache['core'])) {
      return this.cache['core'];
    }
    // Helpers.taskStarted(`Detecting core project for ${this.genericName}`);
    let coreProjects = CoreProject.coreProjects.filter(p =>
      p.recognizedFn(this as any),
    );
    coreProjects = this.orderCoreProjects(coreProjects);
    // Helpers.taskDone(`Core project detected for ${this.genericName}`);
    // console.log('CoreProject.coreProjects', CoreProject.coreProjects.map(c => c.name));
    this.cache['core'] = _.first(coreProjects);
    return this.cache['core'];
  }
  //#endregion

  //#region getters & methods / link project exited
  get linkedProjectsExisted(): PROJCET[] {
    //#region @backendFunc
    return this.linkedProjects.linkedProjects
      .map(f => {
        const proj = this.ins.From(this.pathFor(f.relativeClonePath));
        return proj;
      })
      .filter(f => !!f);
    //#endregion
  }
  //#endregion

  //#region methods & getters / set type
  public setType(type: TYPE) {
    // @ts-ignore
    this.type = type;
  }
  //#endregion

  //#region methods & getters / type is
  public typeIs(...types: TYPE[]) {
    return this.type && types.includes(this.type as any);
  }
  //#endregion

  //#region methods & getters / type is not
  public typeIsNot(...types: TYPE[]) {
    return !this.typeIs(...types);
  }
  //#endregion

  //#region methods & getters / basename
  /**
   * project folder basename
   */
  get basename(): string {
    //#region @websqlFunc
    return path.basename(this.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / name
  /**
   * name from package.json
   */
  get name(): string {
    return this.npmHelpers?.name || this.nameFromPomXML;
  }

  get nameFromPomXML(): string {
    const artifactIdPattern = /<artifactId>([^<]+)<\/artifactId>/;
    const match = (this.readFile('pom.xml') || '').match(artifactIdPattern);
    if (match && match[1]) {
      return match[1];
    }
    return '';
  }
  //#endregion

  //#region methods & getters / get folder for possible project chhildrens
  protected getFoldersForPossibleProjectChildren(): string[] {
    //#region @backendFunc
    const isDirectory = source => fse.lstatSync(source).isDirectory();
    const getDirectories = source =>
      fse
        .readdirSync(source)
        .map(name => path.join(source, name))
        .filter(isDirectory);

    let subdirectories = getDirectories(this.location).filter(f => {
      const folderName = path.basename(f);
      return Helpers.checkIfNameAllowedForFiredevProj(folderName);
    });

    // if (this.isTnp' && fse.existsSync(path.join(this.location, '../firedev-projects'))) {
    //   subdirectories = subdirectories.concat(getDirectories(path.join(this.location, '../firedev-projects'))
    //     .filter(f => {
    //       const folderName = path.basename(f);
    //       return Helpers.checkIfNameAllowedForFiredevProj(folderName);
    //     }))
    // }'
    return subdirectories;
    //#endregion
  }
  //#endregion

  //#region methods & getters / get all childrens
  protected getAllChildren() {
    //#region @backendFunc
    const subdirectories = this.getFoldersForPossibleProjectChildren();
    let res = subdirectories
      .map(dir => {
        // console.log('child:', dir)
        return this.ins.From(dir);
      })
      .filter(c => !!c);
    return res;
    //#endregion
  }
  //#endregion

  //#region methods & getters / children
  /**
   * alias to getAllChildren
   */
  get children(): PROJCET[] {
    //#region @websqlFunc
    return this.getAllChildren();
    //#endregion
  }
  //#endregion

  //#region methods & getters / get child
  getChildBy(nameOrBasename: string, errors = true): PROJCET {
    //#region @websqlFunc
    const c = this.children.find(
      c => c.name === nameOrBasename || c.basename === nameOrBasename,
    );
    if (errors && !c) {
      Helpers.warn(
        `Project doesnt contain child with name or basename: ${nameOrBasename}`,
      );
    }
    return c;
    //#endregion
  }
  //#endregion

  //#region methods & getters / parent
  get parent(): PROJCET {
    //#region @websqlFunc
    if (!_.isString(this.location) || this.location.trim() === '') {
      return void 0;
    }
    return this.ins.From(path.join(this.location, '..'));
    //#endregion
  }
  //#endregion

  //#region methods & getters / grandpa
  get grandpa(): PROJCET {
    //#region @websqlFunc
    if (!_.isString(this.location) || this.location.trim() === '') {
      return void 0;
    }
    const grandpa = this.ins.From(path.join(this.location, '..', '..'));
    return grandpa;
    //#endregion
  }
  //#endregion

  //#region methods & getters / generic name
  get genericName() {
    //#region @websqlFunc
    if (!_.isUndefined(this.cache['genericName'])) {
      return this.cache['genericName'];
    }
    let nameFromPackageJson = this.name;
    //#region @backend
    nameFromPackageJson = `${chalk.bold.gray(this.name)}`;
    //#endregion

    const sliceMinus = 8;
    const shortPath =
      '/' +
      crossPlatformPath(this.location)
        .split('/')
        .slice(-1 * sliceMinus)
        .join('/');

    const result =
      (shortPath.includes(crossPlatformPath(this.location)) ? '' : '(..)') +
      this.checkAndBoldenPath(this.location)
        .split('/')
        .slice(-1 * sliceMinus)
        .join('/') +
      `(${nameFromPackageJson})`;

    this.cache['genericName'] = result;
    return this.cache['genericName'];
    //#endregion
  }
  //#endregion

  private checkAndBoldenPath(fullPath: string) {
    const parts = fullPath.split('/');

    const result = parts.map((part, index) => {
      const pathTocheck = parts.slice(0, index + 1).join('/');
      // console.log('pathTocheck', pathTocheck);
      //#region @backend
      if (this.ins.From(pathTocheck)) {
        return chalk.underline.italic.bold(part);
      }
      //#endregion
      return part;
    });

    return result.join('/');
  }

  //#region methods & getters / path exits
  /**
   * same has project.hasFile();
   */
  pathExists(relativePath: string | string[]): boolean {
    return this.hasFile(relativePath);
  }
  //#endregion

  //#region methods & getters / has file
  /**
   * same as project.pathExists();
   */
  hasFile(relativePath: string | string[]): boolean {
    //#region @backendFunc
    return Helpers.exists(this.pathFor(relativePath));
    //#endregion
  }
  hasFolder(relativePath: string | string[]): boolean {
    //#region @backendFunc
    return (
      Helpers.exists(this.pathFor(relativePath)) &&
      fse.lstatSync(this.pathFor(relativePath)).isDirectory()
    );
    //#endregion
  }
  //#endregion

  //#region methods & getters / contains file
  /**
   * same as project.pathhasFileExists();
   * but with path.resolve
   */
  containsFile(fileRelativeToProjectPath: string) {
    const fullPath = path.resolve(
      path.join(this.location, fileRelativeToProjectPath),
    );
    return Helpers.exists(fullPath);
  }
  //#endregion

  //#region methods & getters / path for
  /**
   * absolute path:
   * concated project location with relative path
   */
  pathFor(relativePath: string | string[]) {
    //#region @backendFunc
    if (Array.isArray(relativePath)) {
      relativePath = relativePath.join('/');
    }
    if (path.isAbsolute(relativePath)) {
      Helpers.error(`Cannot join relative path with absolute: ${relativePath}`);
    }
    return crossPlatformPath(path.join(this.location, relativePath));
    //#endregion
  }
  //#endregion

  //#region methods & getters / write json
  writeJson(relativePath: string, json: object) {
    //#region @backendFunc
    if (path.isAbsolute(relativePath)) {
      Helpers.error(`Cannot join relative path with absolute: ${relativePath}`);
    }
    Helpers.writeJson(crossPlatformPath([this.location, relativePath]), json);
    //#endregion
  }
  //#endregion

  //#region methods & getters / run
  /**
   * @deprecated us execute instead
   * use output from or more preciese crafted api
   */
  run(command: string, options?: Omit<CoreModels.RunOptions, 'cwd'>) {
    let opt: CoreModels.RunOptions;
    //#region @backend
    options = (_.cloneDeep(options) as CoreModels.RunOptions) || {};
    Helpers.log(`command: ${command}`);

    if (_.isUndefined(options.showCommand)) {
      options.showCommand = false;
    }
    opt = options as CoreModels.RunOptions;
    if (!opt.cwd) {
      opt.cwd = this.location;
    }
    if (opt.showCommand) {
      Helpers.info(
        `[${CLI.chalk.underline('Executing shell command')}]  "${command}" in [${opt.cwd}]`,
      );
    } else {
      Helpers.log(
        `[${CLI.chalk.underline('Executing shell command')}]  "${command}" in [${opt.cwd}]`,
      );
    }
    //#endregion
    return Helpers.run(command, opt);
  }
  //#endregion

  //#region methods & getters / execute
  /**
   * same as run but async
   */
  public async execute(
    command: string,
    options?: CoreModels.ExecuteOptions & { showCommand?: boolean },
  ): Promise<any> {
    //#region @backendFunc
    options = options || {};
    if (_.isUndefined(options.showCommand)) {
      options.showCommand = true;
    }
    if (!options) {
      options = {};
    }
    const cwd = this.location;
    if (options.showCommand) {
      Helpers.logInfo(
        `[${CLI.chalk.underline('Executing shell command')}]  "${command}" in [${cwd}]`,
      );
    } else {
      Helpers.log(
        `[${CLI.chalk.underline('Executing shell command')}]  "${command}" in [${cwd}]`,
      );
    }
    return await Helpers.execute(command, cwd, options as any);
    //#endregion
  }
  //#endregion

  //#region methods & getters / try run sync command
  /**
   * try run but continue when it fails
   * @param command
   * @param options
   * @returns
   */
  tryRunSync(
    command: string,
    //#region @backend
    options?: Omit<CoreModels.RunOptions, 'cwd'>,
    //#endregion
  ): void {
    //#region @backendFunc
    try {
      this.run(command, options).sync();
    } catch (error) {
      Helpers.warn(`Not able to execute: ${command}`);
    }
    //#endregion
  }
  //#endregion

  //#region methods & getters / output from command
  outputFrom(
    command: string,
    //#region @backend
    options?: CommandOutputOptions,
    //#endregion
  ) {
    //#region @backendFunc
    return Helpers.commnadOutputAsString(command, this.location, options);
    //#endregion
  }
  //#endregion

  //#region methods & getters / remove file
  removeFile(fileRelativeToProjectPath: string) {
    //#region @backendFunc
    const fullPath = path.resolve(
      path.join(this.location, fileRelativeToProjectPath),
    );
    return Helpers.removeFileIfExists(fullPath);
    //#endregion
  }
  //#endregion

  //#region methods & getters / read file
  readFile(fileRelativeToProjectPath: string) {
    //#region @backendFunc
    const fullPath = path.resolve(
      path.join(this.location, fileRelativeToProjectPath),
    );
    return Helpers.readFile(fullPath);
    //#endregion
  }
  //#endregion

  //#region methods & getters / read file
  readJson<T = {}>(fileRelativeToProjectPath: string): T {
    //#region @backendFunc
    const fullPath = path.resolve(
      path.join(this.location, fileRelativeToProjectPath),
    );
    return Helpers.readJson5(fullPath);
    //#endregion
  }
  //#endregion

  //#region methods & getters / remove (fiel or folder)
  remove(relativePath: string, exactPath = true) {
    //#region @backend
    relativePath = relativePath.replace(/^\//, '');
    Helpers.remove([this.location, relativePath], exactPath);
    //#endregion
  }
  //#endregion

  //#region methods & getters / remove folder by relative path
  removeFolderByRelativePath(relativePathToFolder: string) {
    //#region @backend
    relativePathToFolder = relativePathToFolder.replace(/^\//, '');
    const location = this.location;
    const p = path.join(location, relativePathToFolder);
    Helpers.remove(p, true);
    //#endregion
  }
  //#endregion

  //#region methods & getters / assign free port to project instance
  async assignFreePort(
    startFrom: number = 4200,
    howManyFreePortsAfterThatPort: number = 0,
  ): Promise<number> {
    //#region @backendFunc
    if (_.isNumber(this.port) && this.port >= startFrom) {
      return startFrom;
    }
    const max = 2000;
    let i = 0;
    while (takenPorts.includes(startFrom)) {
      startFrom += 1 + howManyFreePortsAfterThatPort;
    }
    while (true) {
      try {
        const port = await portfinder.getPortPromise({ port: startFrom });
        takenPorts.push(port);
        // @ts-ignore
        this.port = port;
        return port;
      } catch (err) {
        console.log(err);
        Helpers.warn(
          `Trying to assign port  :${startFrom} but already in use.`,
          false,
        );
      }
      startFrom += 1;
      if (i++ === max) {
        Helpers.error(
          `[firedev-helpers]] failed to assign free port after ${max} trys...`,
        );
      }
    }
    //#endregion
  }
  //#endregion

  //#region methods & getters / remove project from disk/memory
  removeItself() {
    //#region @backend
    this.ins.remove(this as any);
    //#endregion
  }
  //#endregion

  //#region methods & getters / define property
  /**
   * Purpose: not initializing all classes at the beginning
   * Only for BaseFeatureForProject class
   */
  defineProperty<PROJECT>(
    variableName: keyof PROJECT,
    classFn: Function,
    options?: {
      customInstanceReturn?: () => object;
    },
  ) {
    //#region @backendFunc
    const { customInstanceReturn } = options || {};
    const that = this;

    // @ts-ignore
    const prefixedName = `__${variableName}`;
    Object.defineProperty(this, variableName, {
      get: function () {
        if (!that[prefixedName]) {
          if (typeof classFn === 'function') {
            if (!!customInstanceReturn) {
              that[prefixedName] = customInstanceReturn();
            } else {
              that[prefixedName] = new (classFn as any)(that);
            }
          } else {
            Helpers.warn(
              `[firedev-helpers] Cannot create dynamic instance of class "${_.kebabCase(prefixedName.replace('__', ''))}".`,
            );
          }
          // }
        }
        return that[prefixedName];
      },
      set: function (v) {
        that[prefixedName] = v;
      },
    });
    //#endregion
  }
  //#endregion

  //#region methods & getters / filter only copy
  /**
   * fs.copy option filter function for copying only selected folders from project
   */
  filterOnlyCopy(basePathFoldersOnlyToInclude: string[]) {
    //#region @backendFunc
    return Helpers.filterOnlyCopy(basePathFoldersOnlyToInclude, this.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / filter don't copy
  /**
   * fs.copy option filter function for copying only not selected folders from project
   */
  filterDontCopy(basePathFoldersTosSkip: string[]) {
    //#region @backendFunc
    return Helpers.filterDontCopy(basePathFoldersTosSkip, this.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / get default develop Branch
  /**
   * general default development branch for all kinds of projects
   */
  getDefaultDevelopmentBranch() {
    return 'develop';
  }
  //#endregion

  //#region methods & getters / get main branches
  /**
   * main/default hardcoded branches
   */
  getMainBranches(): string[] {
    return ['master', 'develop', 'stage', 'prod', 'test'];
  }
  //#endregion

  //#region methods & getters / is using aciton commit
  isUnsingActionCommit(): boolean {
    return false;
  }
  //#endregion

  //#region methods & getters / reset process
  async resetProcess(overrideBranch?: string, recrusive = false) {
    //#region @backend
    // console.log(`CORE PROJECT BRANCH ${this.name}: ${this.core?.branch}, overrideBranch: ${overrideBranch}`)

    Helpers.taskStarted(`

    Starting reset process for ${this.name || this.basename}

    `);
    this.git._beforeAnyActionOnGitRoot();
    let branchToReset =
      overrideBranch || this.core?.branch || this.getDefaultDevelopmentBranch();

    Helpers.info(`fetch data in ${this.genericName}`);
    this.git.fetch();
    if (!this.linkedProjects.getLinkedProjectsConfig().resetOnlyChildren) {
      Helpers.logInfo(`reseting hard  in ${this.genericName}`);
      this.git.resetHard();
      Helpers.logInfo(
        `checking out branch "${branchToReset}" in ${this.genericName}`,
      );
      this.git.checkout(branchToReset);
      Helpers.logInfo(`pulling current branch in ${this.genericName}`);
      await this.git.pullCurrentBranch({ askToRetry: true });
      Helpers.logInfo(`initing (struct) in ${this.genericName}`);
      await this.struct();
      Helpers.taskDone(
        `RESET DONE BRANCH: ${chalk.bold(branchToReset)} in ${this.genericName}`,
      );
    }

    for (const linked of this.linkedProjects.linkedProjects) {
      const child = this.ins.From(this.pathFor([linked.relativeClonePath]));
      if (child) {
        await child.resetProcess(
          child.linkedProjects.resetLinkedProjectsOnlyToCoreBranches()
            ? void 0
            : branchToReset,
          true,
        );
      }
    }
    //#endregion
  }
  //#endregion

  //#region methods & getters / link project to
  linkTo(destPackageLocation: string) {
    //#region @backend
    Helpers.createSymLink(this.location, destPackageLocation);
    //#endregion
  }
  //#endregion

  //#region methods & getters / write file

  writeFile(relativePath: string, content: string) {
    //#region @backend
    Helpers.writeFile([this.location, relativePath], content);
    //#endregion
  }
  //#endregion

  //#region getters & methods / run command and get string
  public runCommandGetString(this: BaseProject, command: string) {
    //#region @backendFunc
    return Helpers.commnadOutputAsString(command, this.location, {
      biggerBuffer: false,
    });
    //#endregion
  }
  //#endregion

  //#region getters & methods / to string
  toString = () => {
    return `${this.name}=>${this.location}`;
  };
  //#endregion

  //#region getters & methods / find partners names
  get parentsNames() {
    //#region @backendFunc
    return this.findParentsNames();
    //#endregion
  }

  //#region getters & methods / open location
  openLocation(relativeFolderPath: string) {
    //#region @backendFunc
    Helpers.openFolderInFileExploer(this.pathFor(relativeFolderPath));
    //#endregion
  }
  //#endregion

  private findParentsNames(
    project?: PROJCET,
    parent?: PROJCET,
    result = [],
  ): string[] {
    //#region @backendFunc
    if (!project && !parent) {
      project = this as any;
    }
    if (!project && parent) {
      return result.reverse();
    }
    if (project && project.parent) {
      result.push(project.parent.name);
    }
    return this.findParentsNames(project.parent, project, result);
    //#endregion
  }
  //#endregion

  //#region getters & methods / kill all instance
  tryKillAllElectronInstances() {
    //#region @backendFunc
    Helpers.taskStarted('Killing all app instances');
    try {
      if (process.platform === 'win32') {
        Helpers.run(`taskkill /f /im ${this.name}.exe`).sync();
      } else {
        Helpers.run(`fkill -f ${this.name}`).sync();
      }
    } catch (error) {}
    Helpers.taskDone('Done kill all app instances');
    //#endregion
  }
  //#endregion

  //#region getters & methods / init
  /**
   * init project files structure and depedencies
   */
  async init(initOptions?: any) {
    throw new Error('TODO IMPLEMENT');
  }
  //#endregion

  //#region getters & methods / link
  /**
   * globally link npm as package
   */
  async link() {
    throw new Error('TODO IMPLEMENT');
  }
  //#endregion

  //#region getters & methods / struct
  /**
   * init project files structure without depedencies
   */
  async struct(initOptions?: any) {
    throw new Error('TODO IMPLEMENT');
  }
  //#endregion

  //#region getters & methods / build
  /**
   * init and build() project
   */
  async build(buildOptions?: any) {
    throw new Error('TODO IMPLEMENT');
  }
  //#endregion

  //#region getters & methods / lint
  /**
   * lint porject
   */
  async lint(lintOptions?: any) {
    Helpers.info(`


    COMMIT LINT NOT IMPLEMENTED


    `);
  }
  //#endregion

  //#region getters & methods / lint
  /**
   * get info about porject
   */
  async info() {
    const proj = this;
    Helpers.info(
      `

  name: ${proj?.name}
  type: ${proj?.type}
  core project name: '${proj?.core?.name}'
  embedded project: ${proj?.linkedProjects.embeddedProject?.genericName || '< none >'}
  children (${proj?.children.length}): ${!proj || !proj.children.length ? '< none >' : ''}
${proj?.children.map(c => '+' + c.genericName).join('\n')}
` +
        `
linked porject prefix: "${this.linkedProjects.linkedProjectsPrefix}"

linked projects from json (${this.linkedProjects.linkedProjects?.length || 0}):
${(this.linkedProjects.linkedProjects || [])
  .map(c => {
    const proj = this.ins.From(this.pathFor(c.relativeClonePath));
    return '- ' + proj ? proj.genericName : c.relativeClonePath;
  })
  .join('\n')}

  `,
    );

    // linked projects detected (${this.detectedLinkedProjects?.length || 0}):
    // ${(this.detectedLinkedProjects || []).map(c => '- ' + c.relativeClonePath).join('\n')}
  }
  //#endregion
}
