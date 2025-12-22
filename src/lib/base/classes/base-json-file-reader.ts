import { config } from 'tnp-core/src';
import { crossPlatformPath, path, _ } from 'tnp-core/src';
import { Helpers } from 'tnp-helpers/src';
import { PackageJson } from 'type-fest';

export interface BaseJsonFileReaderOptions<DATA> {
  /**
   * cwd for <my-json>.json
   * <cwd>/<my-json>
   * (you can also provide full path - basename will be cut)
   */
  cwd?: string;
  /**
   * file name
   * example: package.json, taon.json etc.
   */
  fileName?: string;
  /**
   * json content to read from memory
   */
  jsonContent?: Partial<DATA>;
  /**
   * callback for external reload
   */
  reloadInMemoryCallback?: (data: DATA) => void;
  /**
   * use json with comments reader to read json file
   */
  readJsonAsJsonWithComments?: boolean;
  /**
   * default value for data
   * if file not exist
   * (ONLY FOR cwd + fileName mode)
   */
  defaultValue?: Partial<DATA>;
}

/**
 * Base class for reading json files
 * There are 2 modes of reading json files:
 * - cwd + fileName (read and write to disk in cwd)
 * - jsonContent (read and write to memory and use
 *   reloadInMemoryCallback for external reload)
 */
export class BaseJsonFileReader<DATA> {

  //#region fields
  /**
   * null when package.json not exist
   */
  protected data: DATA | null;

  /**
   * use json with comments reader to read package.json
   */
  protected readonly readJsonAsJsonWithComments: boolean = false;
  //#endregion

  //#region constructor
  public readonly cwd: string;
  protected readonly fileName: string;
  /**
   * @deprecated
   * use only when cwd and fileName are not provided
   */
  protected readonly jsonContent?: Partial<DATA>;
  protected readonly defaultValue?: Partial<DATA>;
  protected readonly reloadInMemoryCallback?: (data: DATA) => void;
  constructor(options: BaseJsonFileReaderOptions<DATA>) {
    let {
      cwd,
      fileName,
      jsonContent,
      reloadInMemoryCallback,
      readJsonAsJsonWithComments,
      defaultValue,
    } = options;
    if (cwd) {
      cwd = crossPlatformPath(cwd);
      if (cwd.endsWith(`/${config.file.package_json}`)) {
        cwd = cwd.replace(`/${config.file.package_json}`, '');
      }
      this.cwd = cwd;
    }

    this.defaultValue = defaultValue;
    this.fileName = fileName;
    if (cwd && jsonContent) {
      throw new Error(
        `You can't provide cwd and jsonContent at the same time. Choose one.`,
      );
    }
    if (!cwd && !jsonContent) {
      throw new Error(`You need to provide cwd or jsonContent`);
    }
    this.readJsonAsJsonWithComments = !!readJsonAsJsonWithComments;
    this.reloadInMemoryCallback = reloadInMemoryCallback;
    this.jsonContent = _.cloneDeep(jsonContent);
    this.reloadPackageJsonInMemory();
  }
  //#endregion

  //#region path
  /**
   * cwd + fileName
   */
  get path() {
    return crossPlatformPath([this.cwd, this.fileName]);
  }
  //#endregion

  //#region reload package json in memory
  /**
   * if something else change package.json in this project
   * and you know that you need to reload it..
   */
  reloadPackageJsonInMemory(): void {
    if (this.jsonContent) {
      this.data = _.cloneDeep(this.jsonContent as any);
    } else {
      try {
        if (this.readJsonAsJsonWithComments) {
          this.data = Helpers.readJsonC(this.path);
        } else {
          this.data = Helpers.readJson(this.path);
        }
        if (!this.data && this.defaultValue) {
          this.data = _.cloneDeep(this.defaultValue as any);
        }
      } catch (error) {
        if (this.defaultValue) {
          this.data = _.cloneDeep(this.defaultValue as any);
        } else {
          this.data = null;
        }
      }
    }
    this.reloadInMemoryCallback &&
      this.reloadInMemoryCallback(_.cloneDeep(this.data as any));
  }
  //#endregion

  //#region write package json to disk
  saveToDisk(purpose?: string) {

    //#region @backendFunc
    if (this.jsonContent) {
      // @ts-ignore
      this.jsonContent = _.cloneDeep(this.data);
    } else {
      if (!this.data) {
        Helpers.warn(
          `[taon][saveToDisk] Empty object to save in ${this.fileName} in ${this.cwd}`,
        );
        return;
      }
      Helpers.log(
        `Save package.json to disk ${purpose ? `(${purpose})` : ''} in ${this.cwd}`,
      );
      Helpers.writeJson(this.path, this.data as any);
    }
    this.reloadPackageJsonInMemory();
    //#endregion

  }
  //#endregion

  //#region link to
  linkTo(destination: string): void {

    //#region @backendFunc
    const source = path.join(this.cwd, this.fileName);
    const dest = path.join(destination, this.fileName);
    Helpers.removeFileIfExists(dest);
    Helpers.createSymLink(source, dest);
    //#endregion

  }
  //#endregion

  //#region get all data
  getAllData(): DATA {
    return _.cloneDeep(this.data);
  }
  //#endregion

  //#region set all data
  setAllData(data: DATA): void {
    this.data = _.cloneDeep(data);
    this.saveToDisk();
  }
  //#endregion

}