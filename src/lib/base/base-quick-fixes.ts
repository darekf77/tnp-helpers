//#region imports
import { _ } from 'tnp-core/src';
import { BaseFeatureForProject } from './base-feature-for-project';
import type { BaseProject } from './base-project';
import { Helpers, UtilsQuickFixes } from '../index';
import { config } from 'tnp-config/src';
//#endregion

export class BaseQuickFixes<
  PROJCET extends BaseProject = any,
> extends BaseFeatureForProject {
  constructor(project: PROJCET) {
    super(project);
    this.project = project;
  }

  //#region fix sqlite pacakge in node_modules
  fixSQLLiteModuleInNodeModules() {
    //#region @backendFunc
    const filePath = this.project.pathFor(
      `${config.folder.node_modules}/sql.js/dist/sql-wasm.js`,
    );

    if (!Helpers.exists(filePath)) {
      return;
    }
    const content = Helpers.readFile(filePath);
    const fixedContent = UtilsQuickFixes.replaceSQLliteFaultyCode(content);
    Helpers.writeFile(filePath, fixedContent);
    //#endregion
  }
  //#endregion
}
