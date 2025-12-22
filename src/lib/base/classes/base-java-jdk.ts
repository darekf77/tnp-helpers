import { UtilsJava } from 'tnp-helpers/src';

import { BaseFeatureForProject } from './base-feature-for-project';
import { BaseProject } from './base-project';

export class BaseJavaJdk<
  PROJECT extends BaseProject = any,
> extends BaseFeatureForProject<PROJECT> {

  //#region api methods / selectJdkVersion
  async selectJdkVersion(): Promise<string | undefined> {
    return await UtilsJava.selectJdkVersion();
  }

  //#endregion

  //#region api methods / updateJavaHomePath
  updateJavaHomePath(selectedPath: string): void {
    UtilsJava.updateJavaHomePath(selectedPath);
  }
  //#endregion

  //#region api methods / selectTomcatVersion
  async selectTomcatVersion(): Promise<string> {
    return await UtilsJava.selectTomcatVersion();
  }
  //#endregion

  //#region api methods / updateTomcatHomePath
  updateTomcatHomePath(selectedPath: string): void {
    UtilsJava.updateTomcatHomePath(selectedPath);
  }
  //#endregion

}