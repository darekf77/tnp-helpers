//#region imports
//#region @backend
import {
  chalk,
  child_process,
  crossPlatformPath,
  fse,
  path,
} from 'tnp-core/src';
//#endregion
import { _ } from 'tnp-core/src';
import { Helpers } from '../index';
import { BaseFeatureForProject } from './base-feature-for-project';
import type { BaseProject } from './base-project';
import { config } from 'tnp-config/src';
import { PackageJson } from 'type-fest';
import { CoreModels } from 'tnp-core/src';
//#endregion

export class BaseNpmHelpers<
  PROJCET extends BaseProject = any,
> extends BaseFeatureForProject {
  private packageJSON: PackageJson;
  constructor(project: PROJCET) {
    super(project);
    this.project = project;
    this.reloadPackageJsonInMemory();
  }

  updateDepsFrom(locations: string[]) {
    //#region @backendFunc
    locations.forEach(location => {
      const project = this.project.ins.From(location);
      if (project) {
        const packageJson = project.readJson(config.file.package_json);
        const deps = this.allDepsFromPackageJson(packageJson);
        Object.keys(deps).forEach(dep => {
          if (this.dependencies[dep]) {
            this.dependencies[dep] = deps[dep];
          }
        });
      }
    });
    this.project.writeJson(config.file.package_json, this.packageJSON);
    //#endregion
  }

  //#region methods & getters / reload package json in memory
  /**
   * if something else change package.json in this project
   * and you know that you need to reload it..
   */
  reloadPackageJsonInMemory(): void {
    this.packageJSON = this.project.readJson(config.file.package_json);
  }
  //#endregion

  //#region methods & getters / name
  get name(): string {
    return this.packageJSON?.name || '';
  }
  //#endregion

  //#region methods & getters / version
  /**
   * version from package.json -> property version
   */
  get version(): string {
    return this.packageJSON?.version;
  }

  //#region methods & getters / bin
  /**
   * bin with cli config from package.json
   */
  get bin(): { [cliName: string]: string } {
    return (this.packageJSON?.bin || {}) as any;
  }
  //#endregion

  set version(newVersion: string) {
    this.packageJSON.version = newVersion;
    this.project.writeJson(config.file.package_json, this.packageJSON);
  }
  //#endregion

  //#region methods & getters / update dependency
  /**
   * @deprecated use updateDep
   */
  updateDependency({
    packageName,
    version,
    updateFiredevJsonFirst,
  }: {
    packageName: string;
    version: string | null;
    updateFiredevJsonFirst?: boolean;
  }): void {
    //#region @backendFunc
    if (updateFiredevJsonFirst) {
      const firedevJson =
        this.project.readJson<any>(config.file.firedev_jsonc) || {};

      if (!firedevJson) {
        Helpers.error(`Firedev json is not valid in ${this.project.location}`);
      }

      const firedevJsonDeps = firedevJson.overrided?.dependencies || {};

      if (version === null) {
        // console.log('version change to ', 'null');
        firedevJsonDeps[packageName] = version;
      } else {
        // console.log('version change to ', version);
        firedevJsonDeps[packageName] = version;
      }

      // console.log('firedevJson', firedevJson);
      this.project.writeJsonC(config.file.firedev_jsonc, firedevJson);
    }
    for (const depsName of CoreModels.PackageJsonDependencyObjArr) {
      if (
        this.packageJSON[depsName] &&
        this.packageJSON[depsName][packageName]
      ) {
        if (version === null) {
          delete this.packageJSON[depsName][packageName];
        } else {
          this.packageJSON[depsName][packageName] = version;
        }
      }
    }
    this.project.writeJson(config.file.package_json, this.packageJSON);
    // Helpers.pressKeyAndContinue();
    //#endregion
  }
  //#endregion

  //#region methods & getters / update dependency
  /**
   * Update dependency in package.json
   */
  async updateDep({
    packageName,
    version,
    updateFiredevJsonFirst,
    addIfNotExists,
  }: {
    packageName: string;
    version: string | null;
    updateFiredevJsonFirst?: boolean;
    addIfNotExists?: boolean;
  }): Promise<void> {
    //#region @backendFunc
    // const contirmUpdateArr= [
    //   'chai',
    //   'bootstrap',
    //   '@types/mocha',
    //   '@types/node-notifier'
    // ];
    // if(contirmUpdateArr.includes(packageName)) {
    //   await Helpers.questionYesNo(`Do you want to update ${packageName} to ${version} ?`);
    // }
    if (
      updateFiredevJsonFirst &&
      this.project.hasFile(config.file.firedev_jsonc)
    ) {
      const firedevJson = (this.project.readJson<any>(
        config.file.firedev_jsonc,
      ) || {}) as CoreModels.FiredevJson;

      if (!firedevJson) {
        Helpers.error(`Firedev json is not valid in ${this.project.location}`);
      }

      const firedevJsonDeps = firedevJson?.overrided?.dependencies || {};

      if (addIfNotExists && !_.isUndefined(firedevJsonDeps[packageName])) {
        if (_.isUndefined(version)) {
          delete firedevJsonDeps[packageName];
        } else {
          firedevJsonDeps[packageName] = version;
        }
      }

      // console.log('firedevJson', firedevJson);
      this.project.writeJsonC(config.file.firedev_jsonc, firedevJson);
    }
    for (const depsName of CoreModels.PackageJsonDependencyObjArr) {
      if (
        this.packageJSON[depsName] &&
        (addIfNotExists ||
          !_.isUndefined(this.packageJSON[depsName][packageName]))
      ) {
        if (_.isUndefined(version)) {
          delete this.packageJSON[depsName][packageName];
        } else {
          this.packageJSON[depsName][packageName] = version;
        }
      }
    }
    if (
      updateFiredevJsonFirst &&
      this.packageJSON[config.packageJsonFrameworkKey]
    ) {
      // QUICK_FIX
      this.packageJSON[config.packageJsonFrameworkKey] = this.project.readJson(
        // QUICK_FIX
        config.file.firedev_jsonc,
      );
    }
    this.project.writeJson(config.file.package_json, this.packageJSON);
    // Helpers.pressKeyAndContinue();
    //#endregion
  }
  //#endregion

  //#region methods & getters / version with patch plus one
  get versionWithPatchPlusOne(): string {
    const ver = this.version.split('.');
    if (ver.length > 0) {
      ver[ver.length - 1] = (parseInt(_.last(ver)) + 1).toString();
    }
    return ver.join('.');
  }
  //#endregion

  //#region methods & getters / version with minor plus one and path zero
  get versionWithMinorPlusOneAndPatchZero(): string {
    const ver = this.version.split('.');
    if (ver.length > 1) {
      ver[1] = (parseInt(ver[1]) + 1).toString();
      for (let index = 2; index < ver.length; index++) {
        ver[index] = '0';
      }
    } else {
      Helpers.warn(
        `[npm-project] something went wrong with bumping minor version`,
      );
    }
    return ver.join('.');
  }
  //#endregion

  //#region methods & getters / version with major plus one and minor zero and patch zero
  get versionWithMajorPlusOneAndMinorZeroAndPatchZero(): string {
    const ver = this.version.split('.');
    if (ver.length > 0) {
      ver[0] = (parseInt(_.first(ver)) + 1).toString();
      for (let index = 1; index < ver.length; index++) {
        ver[index] = '0';
      }
    } else {
      Helpers.warn(
        `[npm-project] something went wrong with bumping major version`,
      );
    }
    return ver.join('.');
  }
  //#endregion

  //#region methods & getters / major version
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

  //#region methods & getters / minor version
  /**
   * Minor Version from package.json
   */
  // @ts-ignore
  get minorVersion(): number {
    //#region @backendFunc
    const [__, minor] = (this.version || '').split('.') || [void 0, void 0];
    return Number(minor);
    //#endregion
  }
  //#endregion

  //#region methods & getters / bump path version
  /**
   * @deprecated
   */
  async bumpPatchVersion() {
    //#region @backendFunc

    // Read package.json
    const packageJson = this.project.readJson(config.file.package_json) as any;
    const version = packageJson?.version;
    if (!version) {
      return;
    }

    const versionComponents = version.match(/^(\d+)\.(\d+)\.(\d+)(-.+)?$/);
    const major = versionComponents[1];
    const minor = versionComponents[2];
    const patch = versionComponents[3];
    const preRelease = versionComponents[4] || '';

    // Increment the patch version
    const newPatch = parseInt(patch, 10) + 1;

    // Construct the new version
    const newVersion = `${major}.${minor}.${newPatch}${preRelease}`;

    // Update the version in the package.json object
    packageJson.version = newVersion;

    // Write the updated package.json back to disk
    this.project.writeJson(config.file.package_json, packageJson);
    //#endregion
  }
  //#endregion

  //#region methods & getters / get version path as number
  get versionPathAsNumber(): number {
    //#region @backendFunc
    const ver = this.version.split('.');
    const res = Number(_.last(ver));
    return isNaN(res) ? 0 : res;
    //#endregion
  }
  //#endregion

  //#region methods & getters / dependencies
  /**
   * npm dependencies from package.json
   */
  get dependencies() {
    return (this.packageJSON ? this.packageJSON.dependencies : {}) || {};
  }
  //#endregion

  //#region methods & getters / peer dependencies
  /**
   * peerDependencies dependencies
   */
  get peerDependencies() {
    return (this.packageJSON ? this.packageJSON.peerDependencies : {}) || {};
  }
  //#endregion

  //#region methods & getters / dev dependencies
  /**
   * devDependencies dependencies
   */
  get devDependencies() {
    return (this.packageJSON ? this.packageJSON.devDependencies : {}) || {};
  }
  //#endregion

  //#region methods & getters / resolutions dependencies
  /**
   * resolutions dependencies
   */
  get resolutions() {
    return (this.packageJSON ? this.packageJSON['resolutions'] : {}) || {};
  }
  //#endregion

  //#region methods & getters / all dependencies
  /**
   * @returns object witl all deps from current project package json
   */
  get allDependencies(): { [packageName: string]: string } {
    return this.allDepsFromPackageJson(this.packageJSON);
  }

  /**
   * @returns object witl all deps from package json
   */
  allDepsFromPackageJson(packageJson: PackageJson) {
    return _.merge({
      ...(packageJson.devDependencies || {}),
      ...(packageJson.peerDependencies || {}),
      ...(packageJson.dependencies || {}),
      ...(packageJson.resolutions || {}),
    }) as any;
  }
  //#endregion

  //#region methods & getters / link node_modules to other project
  linkNodeModulesTo(proj: Partial<BaseProject>) {
    //#region @backendFunc
    const source = this.project.pathFor(config.folder.node_modules);
    const dest = proj.pathFor(config.folder.node_modules);
    Helpers.remove(dest, true);
    Helpers.createSymLink(source, dest);
    //#endregion
  }
  //#endregion

  //#region methods & getters / prefer yarn over npm
  preferYarnOverNpm(): boolean {
    return false;
  }
  //#endregion

  //#region methods & getters / make sure node modules installed
  async makeSureNodeModulesInstalled(
    options?: Omit<CoreModels.NpmInstallOptions, 'pkg'>,
  ) {
    if (this.emptyNodeModules) {
     await this.reinstallNodeModules(options);
    }
  }
  //#endregion

  //#region methods & getters / delete node_modules
  deleteNodeModules() {
    this.project.remove(config.folder.node_modules);
  }
  //#endregion

  //#region methods & getters / reinstall node modules
  async reinstallNodeModules(
    options?: Omit<CoreModels.NpmInstallOptions, 'pkg'>,
  ) {
    //#region @backendFunc
    options = _.cloneDeep(options || {});
    if (_.isUndefined(options.useYarn)) {
      options.useYarn = this.preferYarnOverNpm();
    }
    if (_.isUndefined(options.removeYarnOrPackageJsonLock)) {
      options.removeYarnOrPackageJsonLock = true;
    }
    Helpers.taskStarted(
      `Reinstalling node modules for ${this.project.genericName} with ${options.useYarn ? 'yarn' : 'npm'}`,
    );
    while(true) {
      this.deleteNodeModules();

      try {
        this.project
        .run(await this.prepareCommand(options), {
          output: true,
          silence: false,
        })
        .sync();
        break;
      } catch (error) {
        console.log(error);
        const nodeModulesInstallFailOptions = {
          again: {
            name: 'Try again normal installation',
          },
          againForce: {
            name: 'Try again force installation',
          },
          skip: {
            name: 'Skip this error and continue',
          },
          exit: {
            name: 'Exit process',
          },
        };
        const res = await Helpers.consoleGui.select<
          keyof typeof nodeModulesInstallFailOptions
        >('What to do?', nodeModulesInstallFailOptions);
        if (res === 'again') {
          options.force = false;
          continue;
        }
        if (res === 'againForce') {
          options.force = true;
          continue;
        }
        if (res === 'exit') {
          process.exit(0);
        }
        if (res === 'skip') {
          break;
        }
      }
    }

    Helpers.taskDone(
      `Reinstalled node modules for ${this.project.genericName}`,
    );
    //#endregion
  }
  //#endregion

  //#region fields & getters / empty node_modules
  /**
   * @returns true if node_modules folder is empty
   */
  get emptyNodeModules() {
    //#region @backendFunc
    let node_modules_path = crossPlatformPath(
      crossPlatformPath([this.project.location, config.folder.node_modules]),
    );

    if (Helpers.exists(node_modules_path)) {
      try {
        const real_node_modules_path = crossPlatformPath(
          fse.realpathSync(
            crossPlatformPath([
              this.project.location,
              config.folder.node_modules,
            ]),
          ),
        );
        node_modules_path = real_node_modules_path;
      } catch (error) {}
    }

    if (Helpers.isUnexistedLink(node_modules_path)) {
      try {
        Helpers.logWarn(
          `[npm-helpers][emptyNodeModules] removing unexisted node_modules` +
            ` link form ${this.project.location}`,
        );
        fse.unlinkSync(node_modules_path);
      } catch (error) {}
      return true;
    }

    if (!Helpers.exists(node_modules_path)) {
      return true;
    }

    if (!Helpers.exists(crossPlatformPath([node_modules_path, '.bin']))) {
      return true;
    }

    if (Helpers.findChildren(node_modules_path, c => c).length === 0) {
      return true;
    }

    const package_json = crossPlatformPath([
      path.dirname(node_modules_path),
      config.file.package_json,
    ]);

    const minDepsLength = Object.keys(
      this.allDepsFromPackageJson(Helpers.readJson5(package_json)),
    ).length;

    const notFullyInstalled =
      Helpers.findChildren(node_modules_path, c => c).length <
      minDepsLength + 1;

    if (notFullyInstalled) {
      Helpers.logWarn(
        `[npm-helpers] Not all deps are installed in ${this.project.location}`,
      );
    }

    return notFullyInstalled;
    //#endregion
  }
  //#endregion

  //#region methods & getters / reset package-lock.json
  async resetPackageLockJson() {
    //#region @backendFunc
    const children = this.project.children;
    const currentLocation = this.project.location;

    children.forEach(c => {
      Helpers.info(
        `reverting changes of package-lock.json for ${chalk.bold(c.name)}`,
      );

      // console.log(`Project ${c.name} - loc: ${c.location} `)

      try {
        this.project
          .run(
            `git checkout ${c.location.replace(currentLocation + '/', '')}/package-lock.json`,
          )
          .sync();
      } catch (error) {}
    });
    Helpers.info('RESETING DONE');
    //#endregion
  }
  //#endregion

  //#region getters & methods / start npm task
  startNpmTask(taskName: string, additionalArguments?: string | object) {
    if (_.isObject(additionalArguments)) {
      additionalArguments = Object.keys(additionalArguments)
        .map(k => `--${k} ${additionalArguments[k]}`)
        .join(' ');
    }
    const command = `npm run ${taskName} ${
      additionalArguments ? ' -- ' + additionalArguments : ''
    }`;
    Helpers.info(`Starting npm task: "${command}"`);

    return this.project.run(command, {
      output: true,
      biggerBuffer: true,
    });
  }
  //#endregion

  //#region methods & getters / prepare command
  async prepareCommand(
    options?: CoreModels.NpmInstallOptions,
  ): Promise<string> {
    let {
      pkg,
      silent,
      useYarn,
      force,
      removeYarnOrPackageJsonLock,
      generateYarnOrPackageJsonLock,
    } = options || {};

    force = true; // TODO QUICK_FIX

    let command = '';
    const commonOptions = `--ignore-engines`;

    if (useYarn) {
      //#region yarn
      const argsForFasterInstall = `${force ? '--force' : ''} ${commonOptions} `;
      command =
        `${
          removeYarnOrPackageJsonLock
            ? `(rm ${config.file.yarn_lock}  || true) ` +
              `&& touch ${config.file.yarn_lock} && `
            : ''
        }` +
        `yarn ${pkg ? (pkg?.installType === 'remove' ? 'remove' : 'add') : 'install'} ${pkg ? pkg.name : ''} ` +
        ` ${generateYarnOrPackageJsonLock ? '' : '--no-lockfile'} ` +
        ` ${argsForFasterInstall} ` +
        ` ${pkg && pkg.installType && pkg.installType === '--save-dev' ? '-dev' : ''} `;
      //#endregion
    } else {
      //#region npm
      const argsForFasterInstall =
        `${force ? '--force' : ''} ${commonOptions} --no-audit ` +
        `${silent ? '--silent --no-progress' : ''}   `;

      command =
        `${
          removeYarnOrPackageJsonLock
            ? `(rm ${config.file.package_lock_json} || true) ` +
              `&& touch ${config.file.package_lock_json}  && `
            : ''
        }` +
        `npx --node-options=--max-old-space-size=8000 npm ` +
        `${pkg?.installType === 'remove' ? 'uninstall' : 'install'} ${pkg ? pkg.name : ''} ` +
        ` ${generateYarnOrPackageJsonLock ? '' : '--no-package-lock'} ` +
        ` ${pkg && pkg.installType ? pkg.installType : ''} ` +
        ` ${argsForFasterInstall} `;
      //#endregion
    }
    Helpers.info(`Command for npm install:

      ${command}

      `);
    return command;
  }
  //#endregion

  //#region methods & getters / check if logged in to registry
  /**
   *
   * @param registry without specified registr is checking npm registry
   * @returns
   */
  async isLoggedInToRegistry(registry?: string): Promise<boolean> {
    //#region @backendFunc
    // validate registry with regex
    if (registry && registry.match(/^(https?:\/\/)?([a-z0-9-]+\.?)+(:\d+)?$/)) {
      throw new Error(`Invalid registry: ${registry}`);
    }
    return new Promise((resolve, reject) => {
      child_process.exec(
        registry ? `npm whoami --registry=${registry}` : 'npm whoami',
        { cwd: this.project.location },
        (error, stdout, stderr) => {
          if (error) {
            if (stderr.includes('ENEEDAUTH')) {
              resolve(false);
            } else {
              reject(new Error(stderr));
            }
          } else {
            resolve(true);
          }
        },
      );
    });
    //#endregion
  }
  //#endregion

  //#region methods & getters / login to registry
  /**
   * Prompt the user to log in to a specific npm registry.
   * @param {string} [registry] - Optional npm registry URL.
   * @returns {Promise<void>} - A promise that resolves when the login process completes.
   */
  async loginToRegistry(registry?: string): Promise<void> {
    //#region @backendFunc
    return new Promise((resolve, reject) => {
      const command = registry
        ? `npm login --registry=${registry}`
        : 'npm login';

      const child = child_process.exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr));
        } else {
          resolve();
        }
      });

      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);
      process.stdin.pipe(child.stdin);
    });
    //#endregion
  }
  //#endregion

  //#region methods & getters / check if logged in to npm
  async makeSureLoggedInToNpmRegistry(registry?: string): Promise<void> {
    //#region @backendFunc
    while (true) {
      let loggedIn = await this.isLoggedInToRegistry();
      if (loggedIn) {
        Helpers.info(
          `You logged in to npm registry=${registry || '< default npm>'}`,
        );
        break;
      }
      Helpers.pressKeyAndContinue(
        `
        NPM REGISTRY: ${!registry ? '< default public npm >' : registry}

        You are not logged in to npm. Please login to npm and press any key to continue...

        `,
      );

      try {
        if (!!registry) {
          Helpers.info(`Enter you npm credentials for registry: ${registry}`);
        }
        await this.loginToRegistry();
      } catch (error) {}
    }
    //#endregion
  }

  /**
   * @deprecated
   * use makeSureLoggedInToNpmRegistry()
   */
  checkIfLogginInToNpm() {
    //#region @backendFunc
    // if (!this.canBePublishToNpmRegistry) {
    //   return;
    // }
    try {
      this.project.run('npm whoami').sync();
    } catch (e) {
      Helpers.error(`Please login in to npm.`, false, true);
    }
    //#endregion
  }
  //#endregion
}
