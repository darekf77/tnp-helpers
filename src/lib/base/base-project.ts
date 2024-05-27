//#region import
import { CoreModels } from 'tnp-core/src';
import { CLI } from 'tnp-cli';
import { path, crossPlatformPath } from 'tnp-core/src';
import { config } from 'tnp-config/src';
import { _ } from 'tnp-core/src';
import { CommitData, CoreProject, Helpers, LinkedPorjectsConfig, LinkedProject, TypeOfCommit } from '../index';
import { BaseProjectResolver } from './base-project-resolver';
import { translate } from './translate';
import { BaseProjectType, NgProject } from '../models';
//#region @backend
import * as json5Write from 'json10-writer/src';
import { fse, portfinder, chalk } from 'tnp-core/src';
export { ChildProcess } from 'child_process';
import { CommandOutputOptions } from 'tnp-core/src';
//#endregion
//#endregion

const takenPorts = [];


export abstract class BaseProject<PROJCET extends BaseProject = any, TYPE = BaseProjectType> {
  //#region static

  //#region static / instance of resovle
  static ins = new BaseProjectResolver<BaseProject>(BaseProject);
  //#endregion

  //#region static / sort group of projects
  public static sortGroupOfProject<T extends BaseProject = BaseProject>(projects: T[], resoveDepsArray: (proj: T) => string[], projNameToCompare: (proj: T) => string): T[] {

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

  get embeddedProject(): PROJCET {
    const cacheKey = 'embeddedProject' + _.kebabCase(this.location);
    if (!_.isUndefined(this.globalCache[cacheKey])) {
      return this.globalCache[cacheKey];
    }
    // Helpers.taskStarted(`Detecting embedded project for ${this.location}`); // TODO it is slow
    const nearsetProj = this.ins.nearestTo(crossPlatformPath([this.location, '..']));
    const linkedPorj = nearsetProj.linkedProjects.find(l => {
      return this.location === crossPlatformPath([nearsetProj.location, l.relativeClonePath]);
    });
    if (!linkedPorj || !linkedPorj.internalRealtiveProjectPath) {
      return;
    }
    const pathToEmbededProj = crossPlatformPath([nearsetProj.location, linkedPorj.relativeClonePath, linkedPorj.internalRealtiveProjectPath || '']);
    const embdedresult = this.ins.From(pathToEmbededProj);
    // Helpers.taskDone(`Embedded project detected for ${this.location}`);
    this.globalCache[cacheKey] = embdedresult;
    return this.globalCache[cacheKey];
  }

  get projectsDbLocation() {
    //#region @backendFunc
    return this.ins.projectsDb.projectsDbLocation;
    //#endregion
  }

  //#region static / save location to db
  async saveLocationToDB() {
    //#region @backendFunc
    const db = await this.ins.projectsDb.useDB();

    const existed = db.data.projects.find(f => f.location === this.location);
    // Helpers.info(`Saving location to db for ${this.genericName}, exised: ${!!existed}`);
    if (!existed) {
      try {
        await db.update((data) => {
          if (data.projects.length > 50) {
            data.projects.shift();
          }
          data.projects.push({
            location: this.location,
          });
        });
        // Helpers.info(`Location saved to db for ${this.genericName}, db: ${this.ins.projectsDbLocation(_.kebabCase(this.orgName))}`);
      } catch (error) {
        Helpers.warn(`Cannot save location to db`);
      }
    }
    //#endregion
  }
  //#endregion

  //#endregion

  //#region fields
  public cache: any = {};
  public static cache: any = {};
  public get globalCache() {
    return BaseProject.cache;
  }
  readonly type: TYPE | string = 'unknow';
  protected readonly packageJSON: any;

  /**
   * resolve instance
   */
  abstract readonly ins: BaseProjectResolver<PROJCET>;
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
  ) {

  }
  //#endregion

  //#region methods & getters / save all linked projects to db
  async saveAllLinkedProjectsToDB() {
    const proj = this;
    await proj.saveLocationToDB();
    for (const link of proj.linkedProjects) {
      const linkedPorj = this.ins.From([proj.location, link.relativeClonePath, link.internalRealtiveProjectPath || '']);
      // console.log({ linkedPorj })
      if (linkedPorj) {
        await linkedPorj.saveLocationToDB();
      } else {
        Helpers.warn(`Folder ${link.relativeClonePath} is missing projects...`);
      }
    }
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
    let coreProjects = CoreProject.coreProjects.filter(p => p.recognizedFn(this as any));
    coreProjects = this.orderCoreProjects(coreProjects);
    // Helpers.taskDone(`Core project detected for ${this.genericName}`);
    // console.log('CoreProject.coreProjects', CoreProject.coreProjects.map(c => c.name));
    this.cache['core'] = _.first(coreProjects);
    return this.cache['core'];
  }
  //#endregion

  //#region methods & getters  / add linked project
  addLinkedProject(linkedProj: LinkedProject | string) {
    const linkedProject: LinkedProject = _.isString(linkedProj) ? LinkedProject.fromName(linkedProj) : linkedProj;
    //#region @backendFunc
    const linkedProjectsConfig = this.getLinkedProjectsConfig();
    linkedProjectsConfig.projects.push(LinkedProject.from(linkedProject));
    this.setLinkedProjectsConfig(linkedProjectsConfig);
    //#endregion
  }
  //#endregion

  //#region methods & getters  / add linked projects
  addLinkedProjects(linkedProjs: (LinkedProject)[]) {
    //#region @backendFunc
    for (const linkedProj of linkedProjs) {
      this.addLinkedProject(linkedProj);
    }
    //#endregion
  }
  //#endregion

  //#region methods & getters  / set linked projects config
  setLinkedProjectsConfig(linkedPorjectsConfig: Partial<LinkedPorjectsConfig>) {
    //#region @backendFunc
    if (!Helpers.exists(this.linkedProjectsConfigPath)) {
      return;
    }
    linkedPorjectsConfig = LinkedPorjectsConfig.from(linkedPorjectsConfig);
    const writer = json5Write.load(Helpers.readFile(this.linkedProjectsConfigPath));
    writer.write(linkedPorjectsConfig);
    const removeEmptyLineFromString = (str: string) => {
      return (str || '').split('\n').filter(f => !!f.trim()).join('\n');
    };
    Helpers.writeFile(this.linkedProjectsConfigPath, removeEmptyLineFromString(writer.toSource({ quote: 'double', trailingComma: false })));
    // Helpers.writeJson(this.pathFor(config.file.linked_projects_json), linkedPorjectsConfig);
    //#endregion
  }
  //#endregion

  //#region methods & getters  / get linked projects config path
  private get linkedProjectsConfigPath() {
    return this.pathFor(config.file.linked_projects_json);
  }
  //#endregion

  //#region methods & getters  / recreate linked projects config
  protected recreateLinkedProjectsConfig() {
    //#region @backendFunc
    if (!Helpers.exists(this.linkedProjectsConfigPath) && Helpers.exists(this.pathFor(config.file.firedev_jsonc))) {
      Helpers.writeJson(this.linkedProjectsConfigPath, LinkedPorjectsConfig.from({ projects: [] }));
    }
    //#endregion
  }
  //#endregion

  //#region methods & getters  / get linked projects config
  getLinkedProjectsConfig(): LinkedPorjectsConfig {
    //#region @backendFunc
    this.recreateLinkedProjectsConfig();
    const existedConfig = Helpers.readJson(this.pathFor(config.file.linked_projects_json), {}, true);
    const orgExistedConfig = _.cloneDeep(existedConfig);
    // console.log({ existedConfig });
    let linkedPorjectsConfig = LinkedPorjectsConfig.from(existedConfig);
    const currentRemoteUrl = this.git.originURL;
    const currentBranch = this.git.currentBranchName;

    linkedPorjectsConfig.projects = (linkedPorjectsConfig.projects || []).map((projOrProjName: LinkedProject) => {
      if (_.isString(projOrProjName)) {
        return LinkedProject.fromName(projOrProjName, currentRemoteUrl, currentBranch);
      }
      if (!projOrProjName.relativeClonePath) {
        projOrProjName.relativeClonePath = path.basename(projOrProjName.remoteUrl()).replace('.git', '');
      }
      projOrProjName = LinkedProject.from(projOrProjName);
      if (!projOrProjName.remoteUrl()) {
        projOrProjName.repoUrl = currentRemoteUrl.replace(path.basename(currentRemoteUrl), `${projOrProjName.relativeClonePath}.git`);
      }
      return projOrProjName;
    });
    // console.log({ linkedPorjectsConfig })
    linkedPorjectsConfig.projects = Helpers.uniqArray<LinkedProject>(linkedPorjectsConfig.projects, 'relativeClonePath');
    if (!_.isEqual(orgExistedConfig, linkedPorjectsConfig)) {
      this.setLinkedProjectsConfig(linkedPorjectsConfig);
    }
    return linkedPorjectsConfig;
    //#endregion
  }
  //#endregion

  //#region methods & getters  / linked projects
  get linkedProjects(): LinkedProject[] {
    return this.getLinkedProjectsConfig().projects || [];
  }
  //#endregion

  //#region methods & getters  / detected linked projects
  get detectedLinkedProjects(): LinkedProject[] {
    const detectedLinkedProjects = LinkedProject.detect(this.location,
      true // TOOD fix recrusive
    );
    return detectedLinkedProjects;
  }
  //#endregion

  //#region methods & getters  / linked projects prefix
  get linkedProjectsPrefix() {
    return this.getLinkedProjectsConfig().prefix;
  }
  //#endregion

  //#region getters & methods / link project exited
  get linkedProjectsExisted(): PROJCET[] {
    //#region @backendFunc
    return this.linkedProjects
      .map(f => {
        const proj = this.ins.From(this.pathFor(f.relativeClonePath));
        return proj;
      })
      .filter(f => !!f);
    //#endregion
  }
  //#endregion

  //#region getters & methods / reset linked projects only to core branches
  resetLinkedProjectsOnlyToCoreBranches() {
    return false;
  }
  //#endregion

  //#region getters & methods / get unexisted projects
  protected async cloneUnexistedLinkedProjects(actionType: 'pull' | 'push', cloneChildren = false) {
    //#region @backendFunc
    if (actionType === 'push' && this.automaticallyAddAllChnagesWhenPushingToGit()) {
      return
    }


    // Helpers.taskStarted(`Checking linked projects in ${this.genericName}`);
    const detectedLinkedProjects = this.detectedLinkedProjects;

    // console.log({ detectedLinkedProjects })
    // for (const detectedLinkedProject of detectedLinkedProjects) {
    //   if (this.linkedProjects.find(f => f.relativeClonePath === detectedLinkedProject.relativeClonePath)) {
    //     continue;
    //   }
    //   if (await Helpers.questionYesNo(`Do you want to remove unexisted linked project  ${detectedLinkedProject.relativeClonePath} ?`)) {
    //     Helpers.taskStarted(`Removing unexisted project ${detectedLinkedProject.relativeClonePath}`);
    //     Helpers.removeFolderIfExists(this.pathFor(detectedLinkedProject.relativeClonePath));
    //     Helpers.taskDone(`Removed unexisted project ${detectedLinkedProject.relativeClonePath}`);
    //   }
    // }
    // Helpers.taskDone(`Checking linked projects done in ${this.genericName}`);

    const projectsThatShouldBeLinked = this.linkedProjects
      .map(linkedProj => {
        return detectedLinkedProjects.find(f => f.relativeClonePath === linkedProj.relativeClonePath) ? void 0 : linkedProj;
      })
      .filter(f => !!f) as LinkedProject[];

    if (projectsThatShouldBeLinked.length > 0) {
      Helpers.info(`

${projectsThatShouldBeLinked.map((p, index) =>
        `- ${index + 1}. ${chalk.bold(p.relativeClonePath)} ${p.remoteUrl()} {${p.purpose ? ` purpose: ${p.purpose} }` : ''}`

      ).join('\n')}

      `);

      if (!this.isMonorepo) {
        if (cloneChildren || (await Helpers.questionYesNo(`Do you want to clone above (missing) linked projects ?`))) {
          for (const linkedProj of projectsThatShouldBeLinked) {
            // console.log({linkedProj})
            Helpers.info(`Cloning unexisted project from url ${chalk.bold(linkedProj.remoteUrl())} to ${linkedProj.relativeClonePath}`);
            await this.git.clone(linkedProj.remoteUrl(), linkedProj.relativeClonePath, linkedProj.deafultBranch);
            const childProjLocaiton = this.pathFor([linkedProj.relativeClonePath, linkedProj.internalRealtiveProjectPath]);
            const childProj = this.ins.From(childProjLocaiton);
            if (childProj) {
              await childProj.saveLocationToDB();
            }
          }
        }
      }


    }
    //#endregion
  }
  //#endregion

  //#region methods & getters  / set type
  public setType(type: TYPE) {
    // @ts-ignore
    this.type = type;
  }
  //#endregion

  //#region methods & getters  / type is
  public typeIs(...types: TYPE[]) {
    return this.type && types.includes(this.type as any);
  }
  //#endregion

  //#region methods & getters  / type is not
  public typeIsNot(...types: TYPE[]) {
    return !this.typeIs(...types);
  }
  //#endregion

  //#region methods & getters  / basename
  /**
   * project folder basename
   */
  get basename(): string {
    //#region @websqlFunc
    return path.basename(this.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters  / name
  /**
   * name from package.json
   */
  get name(): string {
    return this.packageJSON?.name || this.nameFromPomXML;
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

  //#region methods & getters  / version
  /**
   * version from package.json -> property version
   */
  get version(): string {
    return this.packageJSON?.version;
  }
  //#endregion

  //#region methods & getters  / major version
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

  //#region methods & getters  / minor version
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

  //#region methods & getters  / get version path as number
  get versionPathAsNumber(): number {
    //#region @backendFunc
    const ver = this.version.split('.');
    const res = Number(_.last(ver));
    return isNaN(res) ? 0 : res;
    //#endregion
  }
  //#endregion

  //#region methods & getters  / dependencies
  /**
   * npm dependencies from package.json
   */
  get dependencies() {
    return (this.packageJSON ? this.packageJSON.dependencies : {}) || {};
  }
  //#endregion

  //#region methods & getters  / peer dependencies
  /**
   * peerDependencies dependencies
   */
  get peerDependencies() {
    return (this.packageJSON ? this.packageJSON.peerDependencies : {}) || {};
  }
  //#endregion

  //#region methods & getters  / dev dependencies
  /**
   * devDependencies dependencies
   */
  get devDependencies() {
    return (this.packageJSON ? this.packageJSON.devDependencies : {}) || {};
  }
  //#endregion

  //#region methods & getters  / resolutions dependencies
  /**
   * resolutions dependencies
   */
  get resolutions() {
    return (this.packageJSON ? this.packageJSON['resolutions'] : {}) || {};
  }
  //#endregion

  //#region methods & getters  / all dependencies
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

  //#region methods & getters  / get folder for possible project chhildrens
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

  //#region methods & getters  / children
  /**
   * alias to getAllChildren
   */
  get children(): PROJCET[] {
    //#region @websqlFunc
    return this.getAllChildren();
    //#endregion
  }
  //#endregion

  //#region methods & getters  / get child
  getChildBy(nameOrBasename: string, errors = true): PROJCET {
    //#region @websqlFunc
    const c = this.children.find(c => c.name === nameOrBasename || c.basename === nameOrBasename);
    if (errors && !c) {
      Helpers.warn(`Project doesnt contain child with name or basename: ${nameOrBasename}`)
    }
    return c;
    //#endregion
  }
  //#endregion

  //#region methods & getters  / parent
  get parent(): PROJCET {
    //#region @websqlFunc
    if (!_.isString(this.location) || this.location.trim() === '') {
      return void 0;
    }
    return this.ins.From(path.join(this.location, '..'));
    //#endregion
  }
  //#endregion

  //#region methods & getters  / grandpa
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

  //#region methods & getters  / generic name
  get genericName() {
    //#region @websqlFunc
    let parent = this.parent as any as BaseProject;
    // const nearest = this.ins.nearestTo(crossPlatformPath([this.location, '..']));
    // const nerestProj = (nearest && nearest !== parent) ? (nearest.name || nearest.basename) : void 0;
    // let secondNearest = nearest && this.ins.nearestTo(crossPlatformPath([nearest.location, '..']));
    return [
      // (secondNearest && secondNearest !== nearest) ? (secondNearest.name || secondNearest.basename) : void 0,
      // nerestProj,
      parent ? path.basename(path.dirname(parent.location)) : void 0,
      parent ? parent.basename : path.basename(this.location),
      this.basename,
      //#region @backend
      `(${CLI.chalk.bold.underline(this.name)})`,
      ` (type=${CLI.chalk.italic.bold(this.type as string)})`,
      //#endregion
    ]
      .filter(f => !!f)
      .join('/').replace(/\(\)/, '')
    //#endregion
  }
  //#endregion

  deleteNodeModules() {
    this.remove(config.folder.node_modules);
  }

  reinstalNodeModules(options?: { useYarn?: boolean; force?: boolean; }) {
    //#region @backendFunc
    this.deleteNodeModules();
    Helpers.run(`${options?.useYarn ? 'yarn' : 'npm'}  install ${options?.force ? '--force' : ''}`, { cwd: this.location }).sync();
    //#endregion
  }

  makeSureNodeModulesInstalled(options?: { checkPackages?: boolean; useYarn?: boolean; force?: boolean; }) {
    if (this.nodeModulesEmpty()) {
      this.reinstalNodeModules(options);
    }
  }

  preferYarnOverNpm(): boolean {
    return false;
  }

  nodeModulesEmpty() {
    //#region @backendFunc
    return !this.hasFolder(config.folder.node_modules) || fse.readdirSync(this.pathFor(config.folder.node_modules)).length === 0;
    //#endregion
  }

  //#region methods & getters  / path exits
  /**
  * same has project.hasFile();
  */
  pathExists(relativePath: string | string[]): boolean {
    return this.hasFile(relativePath);
  }
  //#endregion

  //#region methods & getters  / has file
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
    return Helpers.exists(this.pathFor(relativePath)) && fse.lstatSync(this.pathFor(relativePath)).isDirectory();
    //#endregion
  }
  //#endregion

  //#region methods & getters  / contains file
  /**
   * same as project.pathhasFileExists();
   * but with path.resolve
   */
  containsFile(fileRelativeToProjectPath: string) {
    const fullPath = path.resolve(path.join(this.location, fileRelativeToProjectPath));
    return Helpers.exists(fullPath);
  }
  //#endregion

  //#region methods & getters  / path for
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

  //#region methods & getters  / write json
  writeJson(relativePath: string, json: object) {
    //#region @backendFunc
    if (path.isAbsolute(relativePath)) {
      Helpers.error(`Cannot join relative path with absolute: ${relativePath}`);
    }
    Helpers.writeJson(crossPlatformPath([this.location, relativePath]), json);
    //#endregion
  }
  //#endregion

  //#region methods & getters  / run
  /**
   * @deprecated us execute instead
   * use output from or more preciese crafted api
   */
  run(command: string, options?: Omit<CoreModels.RunOptions, 'cwd'>) {
    let opt: CoreModels.RunOptions;
    //#region @backend
    options = _.cloneDeep(options) as CoreModels.RunOptions || {};
    Helpers.log(`command: ${command}`)

    if (_.isUndefined(options.showCommand)) {
      options.showCommand = false;
    }
    opt = options as CoreModels.RunOptions;
    if (!opt.cwd) { opt.cwd = this.location; }
    if (opt.showCommand) {
      Helpers.info(`[${CLI.chalk.underline('Executing shell command')}]  "${command}" in [${opt.cwd}]`);
    } else {
      Helpers.log(`[${CLI.chalk.underline('Executing shell command')}]  "${command}" in [${opt.cwd}]`);
    }
    //#endregion
    return Helpers.run(command, opt);
  }
  //#endregion

  //#region methods & getters  / execute
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

  //#region methods & getters  / try run sync command
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

  //#region methods & getters  / output from command
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

  //#region methods & getters  / remove file
  removeFile(fileRelativeToProjectPath: string) {
    //#region @backendFunc
    const fullPath = path.resolve(path.join(this.location, fileRelativeToProjectPath));
    return Helpers.removeFileIfExists(fullPath);
    //#endregion
  }
  //#endregion

  //#region methods & getters  / read file
  readFile(fileRelativeToProjectPath: string) {
    //#region @backendFunc
    const fullPath = path.resolve(path.join(this.location, fileRelativeToProjectPath));
    return Helpers.readFile(fullPath);
    //#endregion
  }
  //#endregion

  //#region methods & getters  / remove (fiel or folder)
  remove(relativePath: string, exactPath = true) {
    //#region @backend
    relativePath = relativePath.replace(/^\//, '')
    Helpers.remove([this.location, relativePath], exactPath);
    //#endregion
  }
  //#endregion

  //#region methods & getters  / remove folder by relative path
  removeFolderByRelativePath(relativePathToFolder: string) {
    //#region @backend
    relativePathToFolder = relativePathToFolder.replace(/^\//, '')
    const location = this.location;
    const p = path.join(location, relativePathToFolder);
    Helpers.remove(p, true);
    //#endregion
  }
  //#endregion

  //#region methods & getters  / link node_modules to other project
  linkNodeModulesTo(proj: Partial<BaseProject>) {
    //#region @backendFunc
    const source = this.pathFor(config.folder.node_modules);
    const dest = proj.pathFor(config.folder.node_modules);
    Helpers.remove(dest, true);
    Helpers.createSymLink(source, dest);
    //#endregion
  }
  //#endregion

  //#region methods & getters  / reinstall node_modules
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

  //#region methods & getters  / assign free port to project instance
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

  //#region methods & getters  / remove project from disk/memory
  removeItself() {
    //#region @backend
    this.ins.remove(this as any);
    //#endregion
  }
  //#endregion

  //#region methods & getters  / define property
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

  //#region methods & getters  / filter only copy
  /**
   * fs.copy option filter function for copying only selected folders from project
   */
  filterOnlyCopy(basePathFoldersOnlyToInclude: string[]) {
    //#region @backendFunc
    return Helpers.filterOnlyCopy(basePathFoldersOnlyToInclude, this.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters  / filter don't copy
  /**
   * fs.copy option filter function for copying only not selected folders from project
   */
  filterDontCopy(basePathFoldersTosSkip: string[]) {
    //#region @backendFunc
    return Helpers.filterDontCopy(basePathFoldersTosSkip, this.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters  / get default develop Branch
  /**
   * general default development branch for all kinds of projects
   */
  getDefaultDevelopmentBranch() {
    return 'develop';
  }
  //#endregion

  //#region methods & getters  / get main branches
  /**
   * main/default hardcoded branches
   */
  getMainBranches(): string[] {
    return ['master', 'develop', 'stage', 'prod', 'test']
  }
  //#endregion

  //#region methods & getters  / is using aciton commit
  isUnsingActionCommit(): boolean {
    return false;
  }
  //#endregion

  //#region methods & getters  / reset process
  async resetProcess(overrideBranch?: string, recrusive = false) {
    //#region @backend
    // console.log(`CORE PROJECT BRANCH ${this.name}: ${this.core?.branch}, overrideBranch: ${overrideBranch}`)

    Helpers.taskStarted(`Starting reset process for ${this.genericName}`);
    this._beforeAnyActionOnGitRoot();
    let branchToReset = overrideBranch || this.core?.branch || this.getDefaultDevelopmentBranch();

    Helpers.info(`fetch data in ${this.genericName}`);
    this.git.fetch()
    Helpers.logInfo(`reseting hard  in ${this.genericName}`);
    this.git.resetHard();
    Helpers.logInfo(`checking out branch "${branchToReset}" in ${this.genericName}`);
    this.git.checkout(branchToReset);
    Helpers.logInfo(`pulling current branch in ${this.genericName}`);
    await this.git.pullCurrentBranch({ askToRetry: true })
    Helpers.logInfo(`initing (struct) in ${this.genericName}`);
    await this.struct();
    Helpers.taskDone(`RESET DONE BRANCH: ${chalk.bold(branchToReset)} in ${this.genericName}`);

    for (const linked of this.linkedProjects) {
      const child = this.ins.From(this.pathFor([linked.relativeClonePath]));
      if (child) {
        await child.resetProcess(child.resetLinkedProjectsOnlyToCoreBranches() ? void 0 : branchToReset, true);
      }
    }
    //#endregion
  }
  //#endregion

  //#region methods & getters  / push process
  async pullProcess(cloneChildren = false) {
    //#region @backendFunc
    await this._beforePullProcessAction(cloneChildren);
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
    await this.saveLocationToDB()

    if (this.automaticallyAddAllChnagesWhenPushingToGit() || cloneChildren) {
      const childrenRepos = this.children.filter(f => f.git.isInsideGitRepo && f.git.isGitRoot);
      for (const child of childrenRepos) {
        await child.pullProcess();
      }
    }
    await this.saveAllLinkedProjectsToDB();
    //#endregion
  }
  //#endregion

  //#region methods & getters  / push process
  async pushProcess(options: {
    force?: boolean;
    typeofCommit?: TypeOfCommit;
    origin?: string;
    args?: string[];
    exitCallBack?: () => void;
    forcePushNoQuestion?: boolean;
    commitMessageRequired?: boolean;
    skipChildren?: boolean;
  } = {}) {
    //#region @backendFunc
    const {
      force = false,
      typeofCommit,
      forcePushNoQuestion,
      origin = 'origin',
      exitCallBack,
      args = [],
      commitMessageRequired,
      skipChildren
    } = options;

    await this._beforePushProcessAction();
    await this.saveLocationToDB();
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

      if (this.git.lastCommitMessage() === commitData.commitMessage) {
        if (await Helpers.questionYesNo('Soft reset last commit with same message ?')) {
          this.git.resetSoftHEAD(1);
        }
      }

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

    if (this.automaticallyAddAllChnagesWhenPushingToGit() && !skipChildren) {
      if (this.getLinkedProjectsConfig().skipRecrusivePush) {
        Helpers.warn(`Skipping recrusive (children) push for ${this.genericName}`);
        return;
      }
      const childrenRepos = this.children.filter(f => f.git.isInsideGitRepo && f.git.isGitRoot);
      for (const child of childrenRepos) {
        await child.pushProcess(options);
      }
    }
    await this.saveAllLinkedProjectsToDB();
    //#endregion
  }
  //#endregion

  //#region methods & getters  / before any action on git root
  private _beforeAnyActionOnGitRoot() {
    //#region @backendFunc
    if (!this.git.isInsideGitRepo) {
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
    if (this.git.isInsideGitRepo && this.git.isGitRoot && !this.git.currentBranchName?.trim()) {
      if (await Helpers.consoleGui.question.yesNo('Repository is empty...Commit "master" branch and commit all as "first commit" ?')) {
        this.git.checkout('master');
        this.git.stageAllFiles();
        this.git.commit('first commit ');
      }
    }
    await this.cloneUnexistedLinkedProjects('push');
    //#endregion
  }
  //#endregion

  //#region before push action
  protected async _beforePullProcessAction(cloneChildren = false) {
    //#region @backendFunc
    this._beforeAnyActionOnGitRoot();
    await this.cloneUnexistedLinkedProjects('pull', cloneChildren);
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

  //#region methods & getters  / link project to
  linkTo(destPackageLocation: string) {
    //#region @backend
    Helpers.createSymLink(this.location, destPackageLocation);
    //#endregion
  }
  //#endregion

  //#region methods & getters  / write file

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
      unstageAllFiles() {
        //#region @backendFunc
        Helpers.git.unstageAllFiles(self.location);
        //#endregion
      },
      revertFileChanges(fileReletivePath: string) {
        //#region @backendFunc
        Helpers.git.revertFileChanges(self.location, fileReletivePath);
        //#endregion
      },
      async clone(url: string, destinationFolderName = '', branchName?: string) {
        //#region @backendFunc
        const clondeFolderpath = Helpers.git.clone({ cwd: self.location, url, destinationFolderName, });
        if (branchName) {
          try {
            Helpers.git.checkout(clondeFolderpath, branchName);
            await Helpers.git.pullCurrentBranch(clondeFolderpath, { askToRetry: true });
          } catch (error) { }
        }
        return crossPlatformPath([clondeFolderpath, destinationFolderName || '']).replace(/\/$/g, '');
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
      get isInsideGitRepo() {
        //#region @backendFunc
        return Helpers.git.isInsideGitRepo(self.location);
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
      get uncommitedFiles() {
        //#region @backendFunc
        return Helpers.git.uncommitedFiles(self.location);
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
      get listOfCurrentGitChanges() {
        //#region @backendFunc
        return Helpers.git.getListOfCurrentGitChanges(self.location);
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

  private findParentsNames(project?: PROJCET, parent?: PROJCET, result = []): string[] {
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

  //#region getters & methods / kill all instance
  tryKillAllElectronInstances() {
    //#region @backendFunc
    Helpers.taskStarted('Killing all app instances')
    try {
      if (process.platform === 'win32') {
        Helpers.run(`taskkill /f /im ${this.name}.exe`).sync();
      } else {
        Helpers.run(`fkill -f ${this.name}`).sync();
      }
    } catch (error) {
    }
    Helpers.taskDone('Done kill all app instances')
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
  core project name: '${proj?.core?.name}'
  embedded project: ${proj?.embeddedProject?.genericName || '< none >'}
  children (${proj?.children.length}): ${(!proj || !proj.children.length) ? '< none >' : ''}
${proj?.children.map(c => '+' + c.genericName).join('\n')}
`+
      `
linked porject prefix: "${this.linkedProjectsPrefix}"

linked projects from json (${this.linkedProjects?.length || 0}):
${(this.linkedProjects || []).map(c => '- ' + c.relativeClonePath).join('\n')}

  `);

    // linked projects detected (${this.detectedLinkedProjects?.length || 0}):
    // ${(this.detectedLinkedProjects || []).map(c => '- ' + c.relativeClonePath).join('\n')}
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

  //#region getters & methods / angular libraries
  /**
   * angular libraries from angular.json
   */
  get libraries(): PROJCET[] {
    //#region @backendFunc
    if (!this.pathExists(config.file.angular_json)) {
      return [];
    }
    const projects = (Object.values(Helpers.readJson(this.pathFor(config.file.angular_json))?.projects) as NgProject[])
      .filter(f => f.projectType === 'library');

    const libraries = projects.map(c => this.ins.From(path.join(this.location, c.root)));
    return libraries;
    //#endregion
  }
  //#endregion

  //#region getters & methods / sorted libraries by deps
  get sortedLibrariesByDeps(): PROJCET[] {
    //#region @backendFunc
    const libs = this.libraries;
    const sorted = BaseProject.sortGroupOfProject<PROJCET>(libs, proj => {
      if (!_.isUndefined(proj.cache['deps'])) {

        return proj.cache['deps'];
      }

      const uiJsonPath = proj.pathFor('ui-module.json');
      if (Helpers.exists(uiJsonPath)) {
        const uiModuleJson = Helpers.readJson(uiJsonPath);
        const allLibs = ((uiModuleJson.dependencies || []) as string[]);
        proj.cache['deps'] = allLibs.filter(f => !_.isUndefined(libs.find(c => c.basename === f)));
      } else {
        const allLibs = Object.keys(proj.allDependencies);
        proj.cache['deps'] = allLibs.filter(f => !_.isUndefined(libs.find(c => c.name === f)));
      }

      // console.log(`${proj.name} => all libs`, proj.cache['deps'])
      return proj.cache['deps'];
    }, proj => {
      if (!_.isUndefined(proj.cache['nameToCompare'])) {
        // console.log(`CACHE ${proj.basename} => name: ` + proj.cache['nameToCompare'])
        return proj.cache['nameToCompare'];
      }
      proj.cache['nameToCompare'] = Helpers.exists(proj.pathFor('ui-module.json')) ? proj.basename : proj.name;
      return proj.cache['nameToCompare'];
    });

    return sorted;
    //#endregion
  }
  //#endregion

  //#region getters & methods / get sorted libraries by deps for build
  async getSortedLibrariesByDepsForBuild(libs: PROJCET[], dontSugestBuildAll = false): Promise<PROJCET[]> {
    //#region @backendFunc

    let buildAll = false;
    const lastSelectedJsonFile = 'tmp-last-selected.json';
    const lastSelected = Helpers.readJson(this.pathFor(lastSelectedJsonFile))?.lastSelected || [];

    if (_.isArray(lastSelected) && lastSelected.length > 0) {
      const selected = lastSelected.map(c => libs.find(l => l.basename == c));

      Helpers.info(`
Last selected libs

${selected.map((c, i) => `${i + 1}. ${c.basename} ${chalk.bold(c.name)}`).join('\n')}

            `)
      if (await Helpers.consoleGui.question.yesNo(`Continue build with last selected ?`)) {
        libs = selected;
        return libs;
      }
    }

    if (libs.length < 6 && !dontSugestBuildAll) {
      buildAll = await Helpers.consoleGui.question.yesNo('Should all libraries be included in build ?')
    }
    if (buildAll) {
      return libs;
    }
    while (true) {
      const selectedLibs = await Helpers.consoleGui.multiselect(`Select libraries to build `, libs.map(c => {
        return { name: c.name, value: c.name, selected: true };
      }), true);
      const selected = selectedLibs.map(c => libs.find(l => l.name == c));
      Helpers.info(`

${selected.map((c, i) => `${i + 1}. ${c.basename} ${chalk.bold(c.name)}`).join('\n')}

      `)
      if (await Helpers.consoleGui.question.yesNo(`Continue build with ${selected.length} selected ?`)) {
        libs = selected;
        break;
      }
    }

    Helpers.writeJson(this.pathFor(lastSelectedJsonFile), { lastSelected: libs.map(c => c.basename) })
    return libs;
    //#endregion
  }
  //#endregion

  //#region getters & methods / get library build success command
  get getLibraryBuildSuccessComamnd(): string {
    //#region @backendFunc
    const isAngularLib = Helpers.exists(this.pathFor('ng-package.json'));
    if (isAngularLib) {
      return `Trace: Build complete`
    } else {
      return `Found 0 errors. Watching for file change`
    }
    //#endregion
  }
  //#endregion

  //#region getters & methods / build libraries
  public async buildLibraries({
    rebuild = false,
    watch = false,
    strategy,
    onlySelectedLibs
  }: {
    rebuild?: boolean; watch?: boolean;
    strategy?: 'link' | 'copy',
    onlySelectedLibs?: string[]
  } = {}
  ) {
    //#region @backend
    await this.saveAllLinkedProjectsToDB();
    if (!strategy) {
      strategy = 'link';
    }
    const allLibs = this.libraries;
    const allLibsToBuild = this.sortedLibrariesByDeps.filter(f => {
      if (!onlySelectedLibs) {
        return true;
      }
      const nameMatchesPattern = onlySelectedLibs.find(c => f.name.includes(c));
      const basenameMatchesPattern = onlySelectedLibs.find(c => f.basename.includes(c));
      return nameMatchesPattern || basenameMatchesPattern;
    })

    let libsToWatch: PROJCET[] = allLibsToBuild.length == 1
      ? [_.first(allLibsToBuild)]
      : (await this.getSortedLibrariesByDepsForBuild(allLibsToBuild, allLibs.length != allLibsToBuild.length));


    // await this.init();
    const locationsForNodeModules = [
      this.location,
      // this.parent.location,
      // ...this.parent.children.map(c => c.location),
    ].map(l => crossPlatformPath([l, config.folder.node_modules]));

    this.makeSureNodeModulesInstalled();


    for (const [index, lib] of this.sortedLibrariesByDeps.entries()) {
      Helpers.info(`Building (${index + 1}/${allLibs.length}) ${lib.basename} (${chalk.bold(lib.name)})`);

      if (strategy === 'link') {
        (() => {
          const sourceDist = this.pathFor([config.folder.dist, lib.basename]);
          for (const node_modules of locationsForNodeModules) {
            const dest = crossPlatformPath([node_modules, lib.name]);
            if (!Helpers.isSymlinkFileExitedOrUnexisted(dest)) {
              Helpers.remove(dest);
            }
            console.log('linking from ', sourceDist);
            console.log('linking to ', dest);
            // Helpers.remove(dest);
            Helpers.createSymLink(sourceDist, dest, { continueWhenExistedFolderDoesntExists: true });
          }

          if (rebuild || !Helpers.exists(sourceDist)) {
            Helpers.info(`Compiling ${lib.name} ...`)
            this.run(lib.getLibraryBuildComamnd({ watch: false }), { output: true }).sync();
          }

        })();

        (() => {
          const sourceDist = this.pathFor([config.folder.dist, lib.basename]);
          const dest = this.pathFor([config.folder.node_modules, lib.name]);
          if (!Helpers.isSymlinkFileExitedOrUnexisted(dest)) {
            Helpers.remove(dest);
          }
          Helpers.createSymLink(sourceDist, dest, { continueWhenExistedFolderDoesntExists: true });
        })();

      } else if (strategy === 'copy') {
        const sourceDist = this.pathFor([config.folder.dist, lib.basename]);
        const dest = this.pathFor([config.folder.node_modules, lib.name]);

        if (rebuild || !Helpers.exists(sourceDist)) {
          Helpers.info(`Compiling ${lib.name} ...`)
          this.run(lib.getLibraryBuildComamnd({ watch: false }), { output: true }).sync();
        }

        if (Helpers.isSymlinkFileExitedOrUnexisted(dest)) {
          Helpers.remove(dest);
        }

        Helpers.copy(sourceDist, dest);
      }
    }

    if (watch) {
      for (const [index, lib] of libsToWatch.entries()) {
        Helpers.info(`Building for watch (${index + 1}/${libsToWatch.length}) ${lib.basename} (${chalk.bold(lib.name)})`);
        await (async () => {
          await this.run(lib.getLibraryBuildComamnd({ watch: true }), { output: true })
            .unitlOutputContains(lib.getLibraryBuildSuccessComamnd, [], 0, () => {
              const sourceDist = this.pathFor([config.folder.dist, lib.basename]);
              const dest = this.pathFor([config.folder.node_modules, lib.name]);
              Helpers.copy(sourceDist, dest);
              console.log(`Sync done for ${lib.basename} to ${lib.name}`);
            });
        })();

      }
      // await this.__indexRebuilder.startAndWatch({ taskName: 'index rebuild watch' });
      Helpers.success('BUILD DONE.. watching..')
    } else {
      // await this.__indexRebuilder.start({ taskName: 'index rebuild watch' });
      Helpers.success('BUILD DONE');
    }
    //#endregion
  }
  //#endregion

  //#region getters & methods / get library build success command
  getLibraryBuildComamnd(options?: { watch: boolean }): string | undefined {
    //#region @backendFunc
    const { watch } = options;

    const isAngularLib = Helpers.exists(this.pathFor('ng-package.json')) || Helpers.exists(this.pathFor('tsconfig.app.json'));
    if (isAngularLib) {
      return `npm-run ng build ${this.basename} ${watch ? '--watch' : ''}`
    } else {
      return `npm-run tsc -p libraries/${this.basename}/tsconfig.lib.json  ${watch ? '--watch' : ''} --preserveWatchOutput`
    }
    //#endregion
  }
  //#endregion

  //#region getters & methods / start npm task
  startNpmTask(taskName: string, additionalArguments?: string | object) {
    if (_.isObject(additionalArguments)) {
      additionalArguments = Object.keys(additionalArguments).map(k => `--${k} ${additionalArguments[k]}`).join(' ');
    }
    return this.run(`npm run ${taskName} ${additionalArguments ? (' -- ' + additionalArguments) : ''}`, { output: true });
  }
  //#endregion


}

