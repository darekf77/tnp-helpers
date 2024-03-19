//#region import
//#region @backend
import { fse, RunOptions, portfinder, chalk } from 'tnp-core';
export { ChildProcess } from 'child_process';
import { ProjectGit } from './git-project';
import { CommandOutputOptions } from 'tnp-core';
//#endregion
import { CLI } from 'tnp-cli';
import { path, crossPlatformPath } from 'tnp-core';
import { config } from 'tnp-config';
import { _ } from 'tnp-core';
import { HelpersFiredev } from './helpers';
import { Models } from 'tnp-models';
import { BaseProjectResolver } from './base-project-resolver';
import { CLASS } from 'typescript-class-helpers';


const Helpers = HelpersFiredev.Instance;
//#endregion

const takenPorts = [];


export abstract class BaseProject<T extends BaseProject = any>
  //#region @backend
  extends ProjectGit
//#endregion
{
  //#region static

  //#region static / instance of resovle
  static ins = new BaseProjectResolver<BaseProject>(BaseProject);
  //#endregion

  //#region static / sort group of projects
  public static sortGroupOfProject<T extends BaseProject<any> = BaseProject<any>>(projects: T[], resoveDepsArray: (proj: T) => string[], projNameToCompare: (proj: T) => string): T[] {

    const visited: { [key: string]: boolean } = {};
    const stack: { [key: string]: boolean } = {};
    const result: T[] = [];

    const visit = (project: T) => {
      if (stack[projNameToCompare(project)]) {
        // Circular dependency detected
        Helpers.error(`Circular dependency detected involving project: ${projNameToCompare(project)}`);
      }

      if (!visited[projNameToCompare(project)]) {
        visited[projNameToCompare(project)] = true;
        stack[projNameToCompare(project)] = true;

        const depsResolved = resoveDepsArray(project);
        depsResolved.forEach(dependency => {
          const dependentProject = projects.find(p => {
            // console.log(`comparing :"${projNameToCompare(p)}" and "${dependency}"`)
            return projNameToCompare(p) === dependency;
          });
          if (dependentProject) {
            visit(dependentProject);
          }
        });

        stack[projNameToCompare(project)] = false;
        result.push(project);
      }
    };

    projects.forEach(project => visit(project));
    return result;
    // return result.reverse(); // Reverse the result to get the correct order
  }
  //#endregion

  //#endregion

  //#region fields
  public cache: any = {};
  readonly type: string;
  protected readonly packageJSON: Models.npm.IPackageJSON;
  /**
   * resolve instance
   */
  abstract readonly ins: BaseProjectResolver<T>;
  /**
   * Unique free port for project instance
   * only available after executing *this.assignFreePort()*
   */
  readonly port: string;
  private isUnsingActionsCommit = false;
  private ACTION_MSG_RESET_GIT_HARD_COMMIT = '$$$ update $$$'
  //#endregion

  //#region constructor
  // @ts-ignore
  constructor(
    /**
     * doesn't need to be real path -> can be link
     */
    readonly location: string,
  ) { }
  //#endregion

  //#region  methods & getters

  //#region  methods & getters / basename
  /**
   * project folder basename
   */
  get basename(): string {
    //#region @websqlFunc
    return path.basename(this.location);
    //#endregion
  }
  //#endregion

  //#region  methods & getters / name
  /**
   * name from package.json
   */
  get name() {
    return this.packageJSON?.name;
  }
  //#endregion

  //#region  methods & getters / version
  /**
   * version from package.json
   */
  get version() {
    return this.packageJSON?.version;
  }
  //#endregion

  //#region  methods & getters / dependencies
  /**
   * npm dependencies from package.json
   */
  get dependencies() {
    return (this.packageJSON ? this.packageJSON.dependencies : {}) || {};
  }
  //#endregion

  //#region  methods & getters / peer dependencies
  /**
   * peerDependencies dependencies
   */
  get peerDependencies() {
    return (this.packageJSON ? this.packageJSON.peerDependencies : {}) || {};
  }
  //#endregion

  //#region  methods & getters / dev dependencies
  /**
   * devDependencies dependencies
   */
  get devDependencies() {
    return (this.packageJSON ? this.packageJSON.devDependencies : {}) || {};
  }
  //#endregion

  //#region  methods & getters / resolutions dependencies
  /**
   * resolutions dependencies
   */
  get resolutions() {
    return (this.packageJSON ? this.packageJSON['resolutions'] : {}) || {};
  }
  //#endregion

  //#region  methods & getters / all dependencies
  /**
   *  object with all deps from package json
   */
  get allDependencies(): { [packageName: string]: string } {
    return _.merge({
      ...this.devDependencies,
      ...this.peerDependencies,
      ...this.dependencies,
      ...this.resolutions
    }) as any;
  }
  //#endregion

  //#region  methods & getters / get folder for possible project chhildrens
  protected getFoldersForPossibleProjectChildren(): string[] {
    //#region @backendFunc
    const isDirectory = source => fse.lstatSync(source).isDirectory()
    const getDirectories = source =>
      fse.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory)

    let subdirectories = getDirectories(this.location)
      .filter(f => {
        const folderName = path.basename(f);
        return Helpers.checkIfNameAllowedForFiredevProj(folderName);
      })

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

  //#region  methods * getters / get all childrens
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

  //#region  methods & getters / children
  /**
   * alias to getAllChildren
   */
  get children(): T[] {
    //#region @websqlFunc
    return this.getAllChildren();
    //#endregion
  }
  //#endregion

  //#region  methods & getters / get child
  getChildBy(nameOrBasename: string, errors = true): T {
    //#region @websqlFunc
    const c = this.children.find(c => c.name === nameOrBasename || c.basename === nameOrBasename);
    if (errors && !c) {
      Helpers.warn(`Project doesnt contain child with name or basename: ${nameOrBasename}`)
    }
    return c;
    //#endregion
  }
  //#endregion

  //#region  methods & getters / parent
  get parent(): T {
    //#region @websqlFunc
    if (!_.isString(this.location) || this.location.trim() === '') {
      return void 0;
    }
    return this.ins.From(path.join(this.location, '..'));
    //#endregion
  }
  //#endregion

  //#region  methods & getters / grandpa
  get grandpa(): T {
    //#region @websqlFunc
    if (!_.isString(this.location) || this.location.trim() === '') {
      return void 0;
    }
    const grandpa = this.ins.From(path.join(this.location, '..', '..'));
    return grandpa;
    //#endregion
  }
  //#endregion

  //#region  methods & getters / generic name
  get genericName() {
    //#region @websqlFunc
    let parent = this.parent as any as BaseProject;
    return [
      parent ? path.basename(path.dirname(parent.location)) : void 0,
      parent ? parent.basename : path.basename(this.location),
      this.basename,
      //#region @backend
      `(${CLI.chalk.bold(this.name)})`,
      //#endregion
    ]
      .filter(f => !!f)
      .join('/')
    //#endregion
  }
  //#endregion

  //#region  methods & getters / path exits
  /**
  * same has project.hasFile();
  */
  pathExists(relativePath: string | string[]): boolean {
    return this.hasFile(relativePath);
  }
  //#endregion

  //#region  methods & getters / has file
  /**
   * same as project.pathExists();
   */
  hasFile(relativePath: string | string[]): boolean {
    return Helpers.exists(this.pathFor(relativePath));
  }
  //#endregion

  //#region  methods & getters / contains file
  /**
   * same as project.pathhasFileExists();
   * but with path.resolve
   */
  containsFile(fileRelativeToProjectPath: string) {
    const fullPath = path.resolve(path.join(this.location, fileRelativeToProjectPath));
    return Helpers.exists(fullPath);
  }
  //#endregion

  //#region  methods & getters / path for
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
    return crossPlatformPath(path.join(this.location, relativePath))
    //#endregion
  }
  //#endregion

  //#region  methods & getters / write json
  writeJson(relativePath: string, json: object) {
    //#region @backendFunc
    if (path.isAbsolute(relativePath)) {
      Helpers.error(`Cannot join relative path with absolute: ${relativePath}`);
    }
    Helpers.writeJson(crossPlatformPath([this.location, relativePath]), json);
    //#endregion
  }
  //#endregion

  //#region  methods & getters / run
  /**
   * @deprecated
   * use output from or more preciese crafted api
   */
  run(command: string
    //#region @backend
    , options?: Omit<RunOptions, 'cwd'>
    //#endregion
  ) {
    //#region @backendFunc
    let opt = options as RunOptions;
    if (!opt) { opt = {} as any; }
    if (!opt.cwd) { opt.cwd = this.location; }
    return Helpers.run(command, opt);
    //#endregion
  }
  //#endregion

  //#region  methods & getters / try run sync command
  /**
   * try run but continue when it fails
   * @param command
   * @param options
   * @returns
   */
  tryRunSync(command: string
    //#region @backend
    , options?: Omit<RunOptions, 'cwd'>
    //#endregion
  ): void {
    //#region @backendFunc
    try {
      this.run(command, options).sync();
    } catch (error) {
      Helpers.warn(`Not able to execute: ${command}`)
    }
    //#endregion
  }
  //#endregion

  //#region  methods & getters / output from command
  outputFrom(command: string
    //#region @backend
    , options?: CommandOutputOptions
    //#endregion
  ) {
    //#region @backendFunc
    return Helpers.commnadOutputAsString(command, this.location, options);
    //#endregion
  }
  //#endregion

  //#region  methods & getters / remove file
  removeFile(fileRelativeToProjectPath: string) {
    //#region @backendFunc
    const fullPath = path.resolve(path.join(this.location, fileRelativeToProjectPath));
    return Helpers.removeFileIfExists(fullPath);
    //#endregion
  }
  //#endregion

  //#region  methods & getters / remove (fiel or folder)
  remove(relativePath: string, exactPath = true) {
    //#region @backendFunc
    return Helpers.remove([this.location, relativePath], exactPath);
    //#endregion
  }
  //#endregion

  //#region  methods & getters / link node_modules to other project
  linkNodeModulesTo(proj: Partial<BaseProject>) {
    //#region @backendFunc
    const source = this.pathFor(config.folder.node_modules);
    const dest = proj.pathFor(config.folder.node_modules);
    Helpers.remove(dest, true);
    Helpers.createSymLink(source, dest);
    //#endregion
  }
  //#endregion

  //#region  methods & getters / reinstall node_modules
  reinstallNodeModules(forcerRemoveNodeModules = false) {
    //#region @backendFunc
    Helpers.taskStarted(`Reinstalling node_modules in ${this.genericName}`);
    const source = this.pathFor(config.folder.node_modules);
    if (forcerRemoveNodeModules) {
      Helpers.remove(source, true);
    }
    this.run('yarn install').sync();
    Helpers.taskDone(`Reinstalling done for ${this.genericName}`);
    //#endregion
  }
  //#endregion

  //#region  methods & getters / assign free port to project instance
  async assignFreePort(startFrom: number = 4200, howManyFreePortsAfterThatPort: number = 0): Promise<number> {
    //#region @backendFunc
    if (_.isNumber(this.port) && this.port >= startFrom) {
      return startFrom;
    }
    const max = 2000;
    let i = 0;
    while (takenPorts.includes(startFrom)) {
      startFrom += (1 + howManyFreePortsAfterThatPort);
    }
    while (true) {

      try {
        const port = await portfinder.getPortPromise({ port: startFrom });
        takenPorts.push(port);
        // @ts-ignore
        this.port = port;
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
  //#endregion

  //#region  methods & getters / remove project from disk/memory
  removeItself() {
    //#region @backend
    this.ins.remove(this as any);
    //#endregion
  }
  //#endregion

  //#region  methods & getters / define property
  /**
   * Purpose: not initializing all classes at the beginning
   */
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
  //#endregion

  //#region  methods & getters / filter only copy
  /**
   * fs.copy option filter function for copying only selected folders from project
   */
  filterOnlyCopy(basePathFoldersOnlyToInclude: string[]) {
    //#region @backendFunc
    const projectOrBasepath: BaseProject = this;
    return Helpers.filterOnlyCopy(basePathFoldersOnlyToInclude, projectOrBasepath.location);
    //#endregion
  }
  //#endregion

  //#region  methods & getters / filter don't copy
  /**
   * fs.copy option filter function for copying only not selected folders from project
   */
  filterDontCopy(basePathFoldersTosSkip: string[]) {
    //#region @backendFunc
    const projectOrBasepath: BaseProject = this;
    return Helpers.filterDontCopy(basePathFoldersTosSkip, projectOrBasepath.location);
    //#endregion
  }
  //#endregion

  //#region  methods & getters / get main branches
  getMainBranches(): string[] {
    return ['master', 'develop']
  }
  //#endregion

  //#region  methods & getters / main branch
  get mainBranch(): string {
    return _.first(this.getMainBranches())
  }
  //#endregion

  //#region  methods & getters / is using action commit
  /**
   * Default true
   */
  useActionCommit() {
    return this.isUnsingActionsCommit;
  }
  //#endregion

  //#region  methods & getters / reset process
  async resetProcess(overrideBranch?: string) {
    //#region @backend
    const defaultBranch = overrideBranch
      ? overrideBranch : this.mainBranch;

    this.run(`git fetch`).sync();

    try {
      this.run(`git add --all .`).sync();
    } catch (error) { }
    try {
      this.run(`git stash`).sync();
    } catch (error) { }

    this.run(`git reset --hard`).sync();

    this.run(`git checkout ${defaultBranch}`).sync();
    if (this.isUnsingActionsCommit) {
      let i = 1;
      while (true) {
        if (this.git.currentBranchName === this.ACTION_MSG_RESET_GIT_HARD_COMMIT) {
          Helpers.logInfo(`Reseting branch deeo ${i++}.. `)
          this.run(`git reset --hard HEAD~1`).sync();
        } else {
          break;
        }
      }
    } else {
      this.run(`git reset --hard HEAD~5`).sync();
    }
    try {
      this.run(`git pull origin ${defaultBranch}`).sync();
    } catch (error) { }
    try {
      this.run(`git stash apply`).sync();
    } catch (error) { }
    await this.init();
    Helpers.info(`RESET DONE for branch: ${chalk.bold(defaultBranch)}`)
    //#endregion
  }
  //#endregion

  /**
   * TODO
   * @deprecated
   */
  async init() {
    // TODO
  }

  //#endregion
}

