import { config } from 'tnp-core/src';
import { _, CoreModels, crossPlatformPath, path } from 'tnp-core/src';
import { Helpers } from 'tnp-core/src';
import { PackageJson as PackageJsonBase } from 'type-fest';

import {
  BaseJsonFileReader,
  BaseJsonFileReaderOptions,
} from './base-json-file-reader';

export type PackageJson = PackageJsonBase & {
  lastBuildTagHash?: string;
  publisher?: string;
  displayName?: string;
};

//#region package json dependency obj
export type PackageJsonDependencyObj =
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies'
  | 'resolutions';

export const PackageJsonDependencyObjArr = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'resolutions',
] as PackageJsonDependencyObj[];
//#endregion

export class BasePackageJson extends BaseJsonFileReader<PackageJson> {
  constructor(
    options: Omit<BaseJsonFileReaderOptions<PackageJson>, 'fileName'>,
  ) {
    super({ ...options, fileName: config.file.package_json });
  }

  //#region name

  /**
   * 'dependencies'
   * 'devDependencies'
   * 'peerDependencies'
   * 'resolutions';
   * and whatever is in package.json to npm install
   */
  get dependenciesTypesArray(): PackageJsonDependencyObj[] {
    return PackageJsonDependencyObjArr;
  }

  get name(): string {
    return this.data?.name || '';
  }

  async setName(name: string): Promise<void> {
    //#region @backendFunc
    if (!this.data) {
      Helpers.warn(`[taon][setName] Package.json not exist in ${this.cwd}`);
      return;
    }
    this.data.name = name;
    this.saveToDisk('setting new name');
    //#endregion
  }
  //#endregion

  //#region dev dependencies
  /**
   * devDependencies dependencies
   */
  get devDependencies(): PackageJson['devDependencies'] {
    return _.cloneDeep(this.data ? this.data.devDependencies : {}) || {};
  }
  //#endregion

  //#region resolutions dependencies
  /**
   * resolutions dependencies
   */
  get resolutions(): PackageJson['resolutions'] {
    return _.cloneDeep(this.data ? this.data['resolutions'] : {}) || {};
  }
  //#endregion

  //#region dependencies
  /**
   * npm dependencies from package.json
   */
  get dependencies(): PackageJson['dependencies'] {
    return _.cloneDeep(this.data ? this.data.dependencies : {}) || {};
  }

  get optionalDependencies(): PackageJson['optionalDependencies'] {
    return _.cloneDeep(this.data ? this.data.optionalDependencies : {}) || {};
  }

  get description(): string {
    return this.data?.description || '';
  }

  get displayName(): string {
    return this.data.displayName || '';
  }

  get license(): string {
    return this.data.license || '';
  }

  get publisher(): string {
    return this.data.publisher || '';
  }

  get contributes(): PackageJson['contributes'] {
    return this.data?.contributes;
  }

  get repository(): PackageJson['repository'] {
    return this.data?.repository;
  }

  setRepository(repository: PackageJson['repository']) {
    this.data.repository = repository;
    this.saveToDisk('setting repository');
  }

  /**
   * set the WHOLE dependencies object
   * THIS WILL NOT MERGE -> IT WILL REPLACE WHOLE DEPENDENCIES OBJECT
   */
  setDependencies(dependencies: PackageJson['dependencies']) {
    if (!this.data) {
      Helpers.warn(
        `[taon][setDependencies] Package.json not exist in ${this.cwd}`,
      );
      return;
    }
    this.data.dependencies = dependencies;
    this.saveToDisk();
  }
  //#endregion

  /**
   * set the WHOLE dependencies object
   * THIS WILL NOT MERGE -> IT WILL REPLACE WHOLE DEPENDENCIES OBJECT
   */
  setDevDependencies(devDependencies: PackageJson['devDependencies']) {
    if (!this.data) {
      Helpers.warn(
        `[taon][setDevDependencies] Package.json not exist in ${this.cwd}`,
      );
      return;
    }
    this.data.devDependencies = devDependencies;
    this.saveToDisk();
  }
  //#endregion

  //#region peer dependencies
  /**
   * peerDependencies dependencies
   */
  get peerDependencies(): PackageJson['peerDependencies'] {
    return _.cloneDeep(this.data ? this.data.peerDependencies : {}) || {};
  }

  /**
   * set the WHOLE peerDependencies object
   * THIS WILL NOT MERGE -> IT WILL REPLACE WHOLE PEER DEPENDENCIES OBJECT
   */
  setPeerDependencies(peerDependencies: PackageJson['peerDependencies']) {
    if (!this.data) {
      Helpers.warn(
        `[taon][setPeerDependencies] Package.json not exist in ${this.cwd}`,
      );
      return;
    }
    this.data.peerDependencies = peerDependencies;
    this.saveToDisk();
  }
  //#endregion

  setOptionalDependencies(
    optionalDependencies: PackageJson['optionalDependencies'],
  ) {
    if (!this.data) {
      Helpers.warn(
        `[taon][setOptionalDependencies] Package.json not exist in ${this.cwd}`,
      );
      return;
    }
    this.data.optionalDependencies = optionalDependencies;
    this.saveToDisk();
  }
  //#endregion

  //#region remove dev dependencies
  removeDevDependencies() {
    if (!this.data) {
      Helpers.warn(
        `[taon][removeDevDependencies] Package.json not exist in ${this.cwd}`,
      );
      return;
    }
    try {
      delete this.data.devDependencies;
    } catch (error) {}
    this.saveToDisk();
  }
  //#endregion

  //#region all dependencies
  /**
   * @returns object witl all deps from current project package json
   */
  get allDependencies(): { [packageName: string]: string } {
    return this.allDepsFromPackageJson(this.data);
  }

  /**
   * @returns object witl all deps from package json
   */
  allDepsFromPackageJson(packageJson: PackageJson) {
    return _.cloneDeep(
      _.merge({
        ...PackageJsonDependencyObjArr.reduce((acc, depObj) => {
          return {
            ...acc,
            ...(packageJson[depObj] || {}),
          };
        }, {}),
      }),
    );
  }
  //#endregion

  //#region version
  /**
   * version from package.json -> property version
   */
  get version(): string {
    return this.data?.version;
  }

  setVersion(version: string): void {
    //#region @backendFunc
    this.data.version = version;
    this.saveToDisk('setting new version');
    //#endregion
  }
  //#endregion

  //#region bin
  /**
   * bin with cli config from package.json
   */
  get bin(): Partial<Record<string, string>> {
    return _.cloneDeep(this.data?.bin || {}) as any;
  }

  set bin(value: Partial<Record<string, string>>) {
    this.data.bin = value;
    this.saveToDisk('setting bin');
  }
  //#endregion

  //#region engines
  get engines(): PackageJson['engines'] {
    return _.cloneDeep(this.data.engines);
  }

  async setEngines(engines: PackageJson['engines']): Promise<void> {
    //#region @backendFunc
    let enginesString: string;

    try {
      enginesString = JSON.stringify(engines);
    } catch (error) {
      enginesString = `< CAN'T PARSE ENGINES >`;
    }

    Helpers.info(`Setting engines to project  ${this.cwd}: ${enginesString}`);

    this.data.engines = engines;
    this.saveToDisk('setting new engines');
    //#endregion
  }
  //#endregion

  //#region homepage
  get homepage(): PackageJson['homepage'] {
    return _.cloneDeep(this.data.homepage);
  }

  async setHomepage(homepage: PackageJson['homepage']): Promise<void> {
    //#region @backendFunc
    Helpers.info(
      `Setting homepage property to ${this.cwd}/${this.fileName} : ${homepage}`,
    );
    this.data.homepage = homepage;
    this.saveToDisk('setting new engines');
    //#endregion
  }
  //#endregion

  //#region version with patch plus one
  get versionWithPatchPlusOne(): string {
    const ver = this.version.split('.');
    if (ver.length > 0) {
      ver[ver.length - 1] = (parseInt(_.last(ver)) + 1).toString();
    }
    return ver.join('.');
  }
  //#endregion

  //#region version with minor plus one and path zero
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

  //#region version with major plus one and minor zero and patch zero
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

  //#region get version path as number
  get versionPathAsNumber(): number {
    //#region @backendFunc
    const ver = this.version.split('.');
    const res = Number(_.last(ver));
    return isNaN(res) ? 0 : res;
    //#endregion
  }
  //#endregion

  //#region major version
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

  //#region minor version
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

  //#region get version as number
  /**
   * @deprecated TODO not usefull ?
   */
  getVersionAsNumber(releaseType: CoreModels.ReleaseVersionType): number {
    if (releaseType === 'patch') {
      return this.versionPathAsNumber;
    }
    if (releaseType === 'minor') {
      return this.minorVersion;
    }
    if (releaseType === 'major') {
      return this.majorVersion;
    }
  }
  //#endregion

  //#region bump path version
  async bumpPatchVersion() {
    //#region @backendFunc

    // Read package.json
    const version = this.data?.version;
    if (!version) {
      this.setVersion('0.0.0');
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

    this.setVersion(newVersion);
    //#endregion
  }
  //#endregion

  //#region getters & methods / get version for
  getBumpedVersionFor(releaseType: CoreModels.ReleaseVersionType): string {
    //#region @backendFunc
    if (releaseType === 'patch') {
      return this.versionWithPatchPlusOne;
    }
    if (releaseType === 'minor') {
      return this.versionWithMinorPlusOneAndPatchZero;
    }
    if (releaseType === 'major') {
      return this.versionWithMajorPlusOneAndMinorZeroAndPatchZero;
    }
    //#endregion
  }

  getBumpedOrCurrentVersionFor(
    releaseType?: CoreModels.ReleaseVersionType,
  ): string {
    //#region @backendFunc
    if (releaseType) {
      return this.getBumpedVersionFor(releaseType);
    } else {
      return this.version;
    }
    //#endregion
  }
  //#endregion

  //#region update deps from locations
  updateDepsFrom(locations: string[]) {
    //#region @backendFunc
    locations.forEach(location => {
      const packageJson = Helpers.readJson(location, config.file.package_json);
      const deps = this.allDepsFromPackageJson(packageJson);
      Object.keys(deps).forEach(dep => {
        if (this.dependencies[dep]) {
          this.dependencies[dep] = deps[dep];
        }
      });
    });
    this.saveToDisk();
    //#endregion
  }
  //#endregion

  //#region update dependency
  /**
   * this will NOT SET dependency if
   * dependency name is not in package.json
   */
  updateDependency({
    packageName,
    version,
    createNewEntryIfNotExist,
  }: {
    packageName: string;
    version: string | null;
    createNewEntryIfNotExist?: boolean;
  }): void {
    //#region @backendFunc
    let exists = false;
    for (const depsName of PackageJsonDependencyObjArr) {
      if (this.data[depsName] && this.data[depsName][packageName]) {
        exists = true;
        if (version === null) {
          delete this.data[depsName][packageName];
        } else {
          this.data[depsName][packageName] = version;
        }
      }
    }
    if (createNewEntryIfNotExist && !exists && version !== null) {
      this.data['dependencies'] = this.data['dependencies'] || {};
      this.data['dependencies'][packageName] = version;
    }

    this.saveToDisk();
    //#endregion
  }
  //#endregion

  //#region is private
  get isPrivate(): boolean {
    //#region @backendFunc
    return !!this.data?.private;
    //#endregion
  }

  setIsPrivate(value: boolean) {
    //#region @backendFunc
    this.data.private = value;
    this.saveToDisk('setting private');
    //#endregion
  }
  //#endregion

  //#region side effects
  get sideEffects(): boolean {
    //#region @backendFunc
    return !!this.data?.sideEffects;
    //#endregion
  }
  //#endregion

  //#region set new version
  async setMainProperty(main: string, purpose = ''): Promise<void> {
    //#region @backendFunc
    Helpers.info(
      `Setting main property in  ${this.cwd}: ${main}/${this.fileName}`,
    );
    this.data.main = main;
    this.saveToDisk(`setting main version ` + purpose ? `[${purpose}]` : '');
    //#endregion
  }
  //#endregion

  //#region build hash
  setBuildHash(hash: string): void {
    this.data.lastBuildTagHash = hash;
    this.saveToDisk('setting build hash');
  }
  getBuildHash(): string {
    return this.data.lastBuildTagHash;
  }
  //#endregion

  //#region copyto
  copyTo(location: string | string[]): void {
    //#region @backendFunc
    location = crossPlatformPath(location);
    if (location.endsWith(config.file.package_json)) {
      location = crossPlatformPath(path.dirname(location));
    }
    Helpers.writeJson([location, config.file.package_json], this.data);
    //#endregion
  }
  //#endregion
}
