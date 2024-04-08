//#region import
import { CoreModels } from 'tnp-core/src';
//#region @backend
import { fse, portfinder, chalk } from 'tnp-core';
export { ChildProcess } from 'child_process';
import { CommandOutputOptions } from 'tnp-core';
//#endregion

import { CLI } from 'tnp-cli';
import { path, crossPlatformPath } from 'tnp-core/src';
import { config } from 'tnp-config';
import { _ } from 'tnp-core/src';
import { CommitData, Helpers, TypeOfCommit } from '../index';
import { BaseProjectResolver } from './base-project-resolver';
import { translate } from './translate';

//#endregion

const takenPorts = [];

export type BaseProjectType = 'unknow' | 'unknow-npm-project';

export abstract class BaseProject<T extends BaseProject = any, TYPE = BaseProjectType> {
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
  readonly type: TYPE | string = 'unknow';
  protected readonly packageJSON: any;
  /**
   * resolve instance
   */
  abstract readonly ins: BaseProjectResolver<T>;
  /**
   * Unique free port for project instance
   * only available after executing *this.assignFreePort()*
   */
  readonly port: string;
  //#endregion

  //#region constructor
  // @ts-ignore
  constructor(
    /**
     * doesn't need to be real path -> can be link
     */
    public readonly location: string,
  ) { }
  //#endregion

  //#region  methods & getters

  //#region  methods & getters / set type
  public setType(type: TYPE) {
    // @ts-ignore
    this.type = type;
  }
  //#endregion

  //#region  methods & getters / type is
  public typeIs(...types: TYPE[]) {
    return this.type && types.includes(this.type as any);
  }
  //#endregion

  //#region  methods & getters / type is not
  public typeIsNot(...types: TYPE[]) {
    return !this.typeIs(...types);
  }
  //#endregion

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
   * version from package.json -> property version
   */
  get version() {
    return this.packageJSON?.version;
  }
  //#endregion

  //#region  methods & getters / major version
  /**
  * Major Version from package.json
  */
  // @ts-ignore
  get majorVersion(): number {
    //#region @backendFunc
    return Number(_.first((this.version || '').split('.')));
    //#endregion
  }
  //#endregion

  //#region  methods & getters / minor version
  /**
   * Minor Version from package.json
   */
  // @ts-ignore
  get minorVersion(): number {
    //#region @backendFunc
    const [__, minor] = ((this.version || '').split('.') || [void 0, void 0])
    return Number(minor);
    //#endregion
  }
  //#endregion

  //#region  methods & getters / get version path as number
  get versionPathAsNumber() {
    //#region @backendFunc
    const ver = this.version.split('.');
    const res = Number(_.last(ver));
    return isNaN(res) ? 0 : res;
    //#endregion
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
   * @deprecated us execute instead
   * use output from or more preciese crafted api
   */
  run(command: string, options?: Omit<CoreModels.RunOptions, 'cwd'>) {
    //#region @backendFunc
    options = _.cloneDeep(options) as CoreModels.RunOptions || {};
    Helpers.log(`command: ${command}`)

    if (_.isUndefined(options.showCommand)) {
      options.showCommand = false;
    }
    let opt = options as CoreModels.RunOptions;
    if (!opt.cwd) { opt.cwd = this.location; }
    if (opt.showCommand) {
      Helpers.info(`[${CLI.chalk.underline('Executing shell command')}]  "${command}" in [${opt.cwd}]`);
    } else {
      Helpers.log(`[${CLI.chalk.underline('Executing shell command')}]  "${command}" in [${opt.cwd}]`);
    }
    return Helpers.run(command, opt);
    //#endregion
  }
  //#endregion

  //#region  methods & getters / execute
  /**
   * same as run but async
   */
  public async execute(command: string, options?: CoreModels.ExecuteOptions & { showCommand?: boolean }): Promise<any> {
    //#region @backendFunc
    if (_.isUndefined(options.showCommand)) {
      options.showCommand = false;
    }
    if (!options) { options = {}; }
    const cwd = this.location;
    if (options.showCommand) {
      Helpers.logInfo(`[${CLI.chalk.underline('Executing shell command')}]  "${command}" in [${cwd}]`);
    } else {
      Helpers.log(`[${CLI.chalk.underline('Executing shell command')}]  "${command}" in [${cwd}]`);
    }
    return await Helpers.execute(command, cwd, options as any);
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
    , options?: Omit<CoreModels.RunOptions, 'cwd'>
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
    //#region @backend
    relativePath = relativePath.replace(/^\//, '')
    Helpers.remove([this.location, relativePath], exactPath);
    //#endregion
  }
  //#endregion

  //#region  methods & getters / remove folder by relative path
  removeFolderByRelativePath(relativePathToFolder: string) {
    //#region @backend
    relativePathToFolder = relativePathToFolder.replace(/^\//, '')
    const location = this.location;
    const p = path.join(location, relativePathToFolder);
    Helpers.remove(p, true);
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
   * Only for BaseFeatureForProject class
   */
  defineProperty<PROJECT>(variableName: keyof PROJECT, classFn: Function, options?: {
    customInstanceReturn?: () => object
  }) {
    //#region @backendFunc
    const { customInstanceReturn } = options || {};
    const that = this;

    // @ts-ignore
    const prefixedName = `__${variableName}`
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
            Helpers.warn(`[firedev-helpers] Cannot create dynamic instance of class "${_.kebabCase(prefixedName.replace('__', ''))}".`)
          }
          // }

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
    return Helpers.filterOnlyCopy(basePathFoldersOnlyToInclude, this.location);
    //#endregion
  }
  //#endregion

  //#region  methods & getters / filter don't copy
  /**
   * fs.copy option filter function for copying only not selected folders from project
   */
  filterDontCopy(basePathFoldersTosSkip: string[]) {
    //#region @backendFunc
    return Helpers.filterDontCopy(basePathFoldersTosSkip, this.location);
    //#endregion
  }
  //#endregion

  //#region  methods & getters / get default develop Branch
  getDefaultDevelopmentBranch() {
    return 'develop';
  }
  //#endregion

  //#region  methods & getters / get main branches
  /**
   * main/default hardcoded branches
   */
  getMainBranches(): string[] {
    return ['master', 'develop', 'stage', 'prod', 'test']
  }
  //#endregion

  //#region  methods & getters / is using aciton commit
  isUnsingActionCommit(): boolean {
    return false;
  }
  //#endregion

  //#region  methods & getters / reset process
  async resetProcess(overrideBranch?: string) {
    //#region @backend
    this._beforeAnyActionOnGitRoot();
    const defaultBranch = overrideBranch
      ? overrideBranch : this.getDefaultDevelopmentBranch();

    this.git.fetch()

    this.git.stageAllFiles();
    this.git.stash();
    this.git.resetHard();
    this.git.checkout(defaultBranch);

    if (this.isUnsingActionCommit()) {
      await this.git.pullCurrentBranch({ askToRetry: true });
    } else {
      await this.git.pullCurrentBranch({ askToRetry: true, defaultHardResetCommits: 5 });
    }
    this.git.stashApply();
    await this.struct();
    Helpers.info(`RESET DONE for branch: ${chalk.bold(defaultBranch)}`);

    const childrenRepos = this.children.filter(f => f.git.isGitRepo && f.git.isGitRoot);
    for (const child of childrenRepos) {
      await child.resetProcess(overrideBranch);
    }
    //#endregion
  }
  //#endregion

  //#region  methods & getters / push process
  async pullProcess() {
    //#region @backendFunc
    await this._beforePullProcessAction();
    let uncommitedChanges = this.git.thereAreSomeUncommitedChange;
    if (uncommitedChanges) {
      Helpers.warn(`Stashing uncommit changes... in ${this.genericName}`);
      try {
        this.git.stageAllFiles();
      } catch (error) { }
      try {
        this.git.stash()
      } catch (error) { };
    }

    await this.git.pullCurrentBranch({ askToRetry: true });
    const location = this.location;
    this.ins.unload(this as any);
    this.ins.add(this.ins.From(location) as any);

    if (this.automaticallyAddAllChnagesWhenPushingToGit()) {
      const childrenRepos = this.children.filter(f => f.git.isGitRepo && f.git.isGitRoot);
      for (const child of childrenRepos) {
        await child.pullProcess();
      }
    }
    //#endregion
  }
  //#endregion

  //#region  methods & getters / push process
  async pushProcess(options: {
    force?: boolean;
    typeofCommit?: TypeOfCommit;
    origin?: string;
    args?: string[];
    exitCallBack?: () => void;
    forcePushNoQuestion?: boolean;
    commitMessageRequired?: boolean;
  } = {}) {
    //#region @backendFunc
    const {
      force = false,
      typeofCommit,
      forcePushNoQuestion,
      origin = 'origin',
      exitCallBack,
      args = [],
      commitMessageRequired
    } = options;

    this._beforePushProcessAction();
    const commitData = await this._getCommitMessage(typeofCommit, args, commitMessageRequired);

    while (true) {
      try {
        await this.lint();
        break;
      } catch (error) {
        Helpers.warn('Fix your code...');
        if (!(await Helpers.consoleGui.question.yesNo('Try again lint ? .. (or just skip it)'))) {
          break;
        }
      }
    }

    if (!commitData.isActionCommit) {
      Helpers.info(`Current commit:
      - message to include {${commitData.commitMessage}}
      - branch to checkout {${commitData.branchName}}
      `)

      if (!(await Helpers.questionYesNo('Commit and push this ?'))) {
        exitCallBack()
      }
    }

    if (this.automaticallyAddAllChnagesWhenPushingToGit()) { // my project
      this.git.stageAllFiles();
    }

    if (this.useGitBranchesAsMetadataForCommits()) {
      Helpers.info('Checkingout branches (if needed)...')
      if (this.git.currentBranchName?.trim() !== commitData.branchName) {
        try {
          this.git.checkout(commitData.branchName, { createBranchIfNotExists: true });
        } catch (error) {
          Helpers.error('Please modyfiy you commit message or delete branch,')
        }
      }
    }

    try {
      this.git.commit(commitData.commitMessage);
    } catch (error) {
      Helpers.warn(`Not commiting anything... `)
    }

    await this.git.pushCurrentBranch({ force, origin, forcePushNoQuestion, askToRetry: true });

    if (this.automaticallyAddAllChnagesWhenPushingToGit()) {
      const childrenRepos = this.children.filter(f => f.git.isGitRepo && f.git.isGitRoot);
      for (const child of childrenRepos) {
        await child.pushProcess(options);
      }
    }
    //#endregion
  }
  //#endregion

  //#region  methods & getters / before any action on git root
  private _beforeAnyActionOnGitRoot() {
    //#region @backendFunc
    if (!this.git.isGitRepo) {
      Helpers.error(`Project ${chalk.bold(this.name)} is not a git repository
      locaiton: ${this.location}`, false, true);
    }
    if (!this.git.isGitRoot) {
      Helpers.error(`Project ${chalk.bold(this.name)} is not a git root
      locaiton: ${this.location}`, false, true);
    }
    //#endregion
  }
  //#endregion

  //#region before push action
  protected async _beforePushProcessAction() {
    //#region @backendFunc
    this._beforeAnyActionOnGitRoot();

    // for first projects
    if (this.git.isGitRepo && this.git.isGitRoot && !this.git.currentBranchName?.trim()) {
      if (await Helpers.consoleGui.question.yesNo('Repository is empty...Commit "master" branch and commit all as "first commit" ?')) {
        this.git.checkout('master');
        this.git.stageAllFiles();
        this.git.commit('first commit ');
      }
    }
    //#endregion
  }
  //#endregion

  //#region before push action
  protected async _beforePullProcessAction() {
    //#region @backendFunc
    this._beforeAnyActionOnGitRoot();
    //#endregion
  }
  //#endregion

  //#region resovle commit message
  protected async _getCommitMessage(typeofCommit: TypeOfCommit, args: string[], commitMessageRequired?: boolean): Promise<CommitData> {
    //#region @backendFunc
    let commitData: CommitData;
    if (this.useGitBranchesWhenCommitingAndPushing()) {
      let argsCommitData = await CommitData.getFromArgs(args, typeofCommit);
      // console.log({ argsCommitData })
      if (argsCommitData.message) {
        commitData = argsCommitData;
      } else {
        const commitDataBranch = await CommitData.getFromBranch(this.git.currentBranchName);
        commitData = commitDataBranch;
        // console.log({ commitDataBranch })
      }
    } else {
      let argsCommitData = await CommitData.getFromArgs(args, typeofCommit);
      // console.log({ argsCommitData })
      // console.log(argsCommitData)
      if (!argsCommitData.message && commitMessageRequired) {
        Helpers.error('Please provide message in argument', false, true);
      }

      if (!argsCommitData.message) {
        argsCommitData.message = Helpers.git.ACTION_MSG_RESET_GIT_HARD_COMMIT;
      }
      commitData = argsCommitData;
    }

    if (commitData.message !== Helpers.git.ACTION_MSG_RESET_GIT_HARD_COMMIT) {
      const { from, to } = this.transalteGitCommitFromArgs();
      if (from && to) {
        commitData.message = _.kebabCase(await translate(commitData.message, { from, to }));
      }
    }

    return commitData;
    //#endregion
  }
  //#endregion

  //#region  methods & getters / link project to
  linkTo(destPackageLocation: string) {
    //#region @backend
    Helpers.createSymLink(this.location, destPackageLocation);
    //#endregion
  }
  //#endregion

  //#region  methods & getters / write file

  writeFile(relativePath: string, content: string) {
    //#region @backend
    Helpers.writeFile([this.location, relativePath], content);
    //#endregion
  }
  //#endregion

  //#region getters & methods / ru command and get string
  public runCommandGetString(this: BaseProject, command: string) {
    //#region @backendFunc
    return Helpers.commnadOutputAsString(command, this.location, { biggerBuffer: false });
    //#endregion
  }
  //#endregion

  //#region getters & methods / git
  public get git() {
    const self = this;
    return {
      revertFileChanges(fileReletivePath: string) {
        //#region @backendFunc
        Helpers.git.revertFileChanges(self.location, fileReletivePath);
        //#endregion
      },
      clone(url: string, destinationFolderName = '') {
        //#region @backendFunc
        return Helpers.git.clone({ cwd: self.location, url, destinationFolderName });
        //#endregion
      },
      restoreLastVersion(localFilePath: string) {
        //#region @backendFunc
        return Helpers.git.restoreLastVersion(self.location, localFilePath);
        //#endregion
      },
      stageAllFiles() {
        //#region @backendFunc
        Helpers.git.stageAllFiles(self.location);
        //#endregion
      },
      stash(optinos?: {
        onlyStaged?: boolean;
      }) {
        //#region @backendFunc
        Helpers.git.stash(self.location, optinos);
        //#endregion
      },
      stashApply() {
        //#region @backendFunc
        Helpers.git.stashApply(self.location);
        //#endregion
      },
      fetch() {
        //#region @backendFunc
        Helpers.git.fetch(self.location);
        //#endregion
      },
      resetFiles(...relativePathes: string[]) {
        //#region @backendFunc
        return Helpers.git.resetFiles(self.location, ...relativePathes);
        //#endregion
      },
      get isGitRepo() {
        //#region @backendFunc
        return Helpers.git.isGitRepo(self.location);
        //#endregion
      },
      get isGitRoot() {
        //#region @backendFunc
        return Helpers.git.isGitRoot(self.location);
        //#endregion
      },
      get originURL() {
        //#region @backendFunc
        return Helpers.git.getOriginURL(self.location);
        //#endregion
      },
      commit(commitMessage?: string) {
        //#region @backendFunc
        return Helpers.git.commit(self.location, commitMessage);
        //#endregion
      },
      /**
       * alias to stage all and commit
       */
      addAndCommit(commitMessage: string) {
        //#region @backendFunc
        return Helpers.git.stageAllAndCommit(self.location, commitMessage);
        //#endregion
      },
      stageAllAndCommit(commitMessage: string) {
        //#region @backendFunc
        return Helpers.git.stageAllAndCommit(self.location, commitMessage);
        //#endregion
      },
      async pushCurrentBranch(options?: { force?: boolean; origin?: string, askToRetry?: boolean; forcePushNoQuestion?: boolean; }) {
        //#region @backendFunc
        return await Helpers.git.pushCurrentBranch(self.location, options);
        //#endregion
      },
      get allOrigins() {
        //#region @backendFunc
        return Helpers.git.allOrigins(self.location);
        //#endregion
      },
      get thereAreSomeUncommitedChange() {
        //#region @backendFunc
        return Helpers.git.checkIfthereAreSomeUncommitedChange(self.location);
        //#endregion
      },
      thereAreSomeUncommitedChangeExcept(filesList: string[] = []) {
        //#region @backendFunc
        return Helpers.git.thereAreSomeUncommitedChangeExcept(filesList, self.location);
        //#endregion
      },
      meltActionCommits(soft = false) {
        //#region @backend
        return Helpers.git.meltActionCommits(self.location, soft);
        //#endregion
      },
      async pullCurrentBranch(options?: {
        askToRetry?: boolean,
        defaultHardResetCommits?: number
      }) {
        //#region @backendFunc
        await Helpers.git.pullCurrentBranch(self.location, { ...options });
        //#endregion
      },
      get currentBranchName() {
        //#region @backendFunc
        return Helpers.git.currentBranchName(self.location);
        //#endregion
      },
      getBranchesNamesBy(pattern: string | RegExp) {
        //#region @backendFunc
        return Helpers.git.getBranchesNames(self.location, pattern);
        //#endregion
      },
      resetSoftHEAD(HEAD = 1) {
        //#region @backendFunc
        Helpers.git.resetSoftHEAD(self.location, HEAD);
        //#endregion
      },
      resetHard(options?: {
        HEAD?: number
      }) {
        //#region @backendFunc
        Helpers.git.resetHard(self.location, options);
        //#endregion
      },
      countComits() {
        //#region @backendFunc
        return Helpers.git.countCommits(self.location);
        //#endregion
      },
      hasAnyCommits() {
        //#region @backendFunc
        return Helpers.git.hasAnyCommits(self.location);
        //#endregion
      },
      get isInMergeProcess() {
        //#region @backendFunc
        return Helpers.git.isInMergeProcess(self.location);
        //#endregion
      },
      lastCommitDate() {
        //#region @backendFunc
        return Helpers.git.lastCommitDate(self.location);
        //#endregion
      },
      lastCommitHash() {
        //#region @backendFunc
        return Helpers.git.lastCommitHash(self.location);
        //#endregion
      },
      lastCommitMessage() {
        //#region @backendFunc
        return Helpers.git.lastCommitMessage(self.location);
        //#endregion
      },
      penultimageCommitHash() {
        //#region @backendFunc
        return Helpers.git.penultimageCommitHash(self.location);
        //#endregion
      },
      checkTagExists(tag: string) {
        //#region @backendFunc
        return Helpers.git.checkTagExists(tag, self.location);
        //#endregion
      },
      checkout(branchName: string, options?: { createBranchIfNotExists?: boolean; fetchBeforeCheckout?: boolean; switchBranchWhenExists?: boolean; }) {
        //#region @backendFunc
        return Helpers.git.checkout(self.location, branchName, options);
        //#endregion
      },
      checkoutFromTo(checkoutFromBranch: string, branch: string, origin = 'origin') {
        //#region @backendFunc
        return Helpers.git.checkoutFromTo(checkoutFromBranch, branch, origin, self.location);
        //#endregion
      },
      /**
       *
       * @param majorVersion example: v1, v2 etc.
       * @returns tag name
       */
      lastTagNameForMajorVersion(majorVersion) {
        //#region @backendFunc
        return Helpers.git.lastTagNameForMajorVersion(self.location, majorVersion);
        //#endregion
      },
      lastTagHash() {
        //#region @backendFunc
        return Helpers.git.lastTagHash(self.location);
        //#endregion
      },
      get remoteOriginUrl() {
        //#region @backendFunc
        return Helpers.git.getOriginURL(self.location);
        //#endregion
      },
      get lastTagVersionName() {
        //#region @backendFunc
        return (Helpers.git.lastTagVersionName(self.location) || '');
        //#endregion
      },
      get stagedFiles(): string[] {
        //#region @backendFunc
        return Helpers.git.stagedFiles(self.location);
        //#endregion
      },
      /**
       * TODO does this make any sense
       */
      renameOrigin(newNameOrUlr: string) {
        //#region @backendFunc
        if (!newNameOrUlr.endsWith('.git')) {
          newNameOrUlr = (newNameOrUlr + '.git')
        }
        const oldOrigin = self.git.originURL;
        if (!newNameOrUlr.startsWith('git@') && !newNameOrUlr.startsWith('https://')) {
          newNameOrUlr = oldOrigin.replace(path.basename(oldOrigin), newNameOrUlr);
        }

        try {
          self.run(`git remote rm origin`).sync();
        } catch (error) { }

        try {
          self.run(`git remote add origin ${newNameOrUlr}`).sync();
          Helpers.info(`Origin changed:
        from: ${oldOrigin}
          to: ${newNameOrUlr}\n`);
        } catch (e) {
          Helpers.error(`Not able to change origin.. reverting to old`, true, true);
          self.run(`git remote add origin ${oldOrigin}`).sync();
        }
        //#endregion
      },
    }
  }
  //#endregion

  //#region getters & methods / to string
  toString = () => {
    return `${this.name}=>${this.location}`;
  };
  //#endregion

  //#region getters & methods / check if loggin in to npm
  protected checkIfLogginInToNpm() {
    //#region @backendFunc
    // if (!this.canBePublishToNpmRegistry) {
    //   return;
    // }
    try {
      this.run('npm whoami').sync();
    } catch (e) {
      Helpers.error(`Please login in to npm.`, false, true)
    }
    //#endregion
  }
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

  private findParentsNames(project?: T, parent?: T, result = []): string[] {
    //#region @backendFunc
    if (!project && !parent) {
      project = this as any;
    }
    if (!project && parent) {
      return result.reverse();
    }
    if (project && project.parent) {
      result.push(project.parent.name)
    }
    return this.findParentsNames(project.parent, project, result);
    //#endregion
  }
  //#endregion



  //#region getters & methods / init
  /**
   * init project files structure and depedencies
   */
  async init(initOptions?: any) {
    throw (new Error('TODO IMPLEMENT'))
  }
  //#endregion

  //#region getters & methods / link
  /**
   * globally link npm as package
   */
  async link() {
    throw (new Error('TODO IMPLEMENT'))
  }
  //#endregion

  //#region getters & methods / struct
  /**
   * init project files structure without depedencies
   */
  async struct(initOptions?: any) {
    throw (new Error('TODO IMPLEMENT'))
  }
  //#endregion

  //#region getters & methods / build
  /**
  * init and build() project
  */
  async build(buildOptions?: any) {
    throw (new Error('TODO IMPLEMENT'))
  }
  //#endregion

  //#region getters & methods / lint
  /**
   * lint porject
   */
  async lint(lintOptions?: any) {
    Helpers.info(`


    COMMIT LINT NOT IMPLEMENTED


    `)
  }
  //#endregion

  //#region getters & methods / lint
  /**
   * get info about porject
   */
  async info() {
    const proj = this;
    Helpers.info(`

  name: ${proj?.name}
  type: ${proj?.type}
  children (${proj?.children.length}): ${(!proj || !proj.children.length) ? '< none >' : ''}
${proj?.children.map(c => '+' + c.genericName).join('\n')}


  `);
  }
  //#endregion

  //#region getters & methods / translate git commit from args
  /**
   * By default no translation of commit
   */
  transalteGitCommitFromArgs() {
    return { from: void 0 as string, to: void 0 as string }
  }
  //#endregion

  //#region getters & methods / us git branches when commiting and pushing
  /**
   * By defult true.. when commit branches will not function.
   * (false is better for simple projects)
   */
  useGitBranchesWhenCommitingAndPushing() {
    return true;
  }
  //#endregion

  //#region getters & methods / automatically add all changes when pushing to git
  /**
   * usefull when pushing in project with childrens as git repos
   */
  automaticallyAddAllChnagesWhenPushingToGit() {
    return false;
  }
  //#endregion

  //#region getters & methods / use git branches as metadata for commits
  /**
   * usefull when pushing in project with childrens as git repos
   */
  useGitBranchesAsMetadataForCommits() {
    return true;
  }
  //#endregion

}

