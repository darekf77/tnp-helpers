//#region imports
import { config } from 'tnp-config/src';
import { _, fse, path } from 'tnp-core/src';
import { PackageJson } from 'type-fest';

import { Helpers, UtilsQuickFixes } from '../../index';

import { BaseFeatureForProject } from './base-feature-for-project';
import type { BaseProject } from './base-project';
//#endregion

export class BaseQuickFixes<
  PROJECT extends BaseProject<any, any> = BaseProject<any, any>,
> extends BaseFeatureForProject<PROJECT> {
  constructor(public project: PROJECT) {
    super(project);
    this.project = project;
  }

  /**
   * filesRelativePaths example:
   * ['node_modules/@types/glob/index.d.ts', '/home/user/project/src/app.ts']
   *
   * @param filesRelativeAbsPaths\ Quick fix for typescript check
   */
  excludeNodeModulesDtsFromTypescriptCheck(filesRelativeAbsPaths:string[]) {
    //#region @backendFunc
    for (const file of filesRelativeAbsPaths) {
      const fileContent = Helpers.readFile(file) || '';
      if(fileContent) {
         if(!fileContent.startsWith(`// @ts-${'nocheck'}`)) {
          const contentFixed = `// @ts-${'nocheck'}\n${fileContent}`;
          if(fileContent !== contentFixed) {
            Helpers.writeFile(file, contentFixed);
          }
         }
      }
    }
    //#endregion

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
    const fixedContent = UtilsQuickFixes.replaceKnownFaultyCode(content);
    Helpers.writeFile(filePath, fixedContent);
    //#endregion
  }
  //#endregion

  //#region add missing empty libs
  public createDummyEmptyLibsReplacements(missingLibsNames: string[] = []) {
    //#region @backendFunc
    missingLibsNames.forEach(missingLibName => {
      const pathInProjectNodeModules = path.join(
        this.project.location,
        config.folder.node_modules,
        missingLibName,
      );
      if (fse.existsSync(pathInProjectNodeModules)) {
        Helpers.warn(
          `Package "${missingLibName}" will replaced with empty package mock. ${this.project.genericName}`,
        );
      }
      // Helpers.remove(pathInProjectNodeModules);
      if (!fse.existsSync(pathInProjectNodeModules)) {
        Helpers.mkdirp(pathInProjectNodeModules);
      }

      Helpers.writeFile(
        path.join(pathInProjectNodeModules, 'index.js'),
        `
Object.defineProperty(exports, '__esModule', { value: true });
exports.default = {};
`,
      );
      Helpers.writeFile(
        path.join(pathInProjectNodeModules, 'index.d.ts'),
        `
declare const _default: {};
export default _default;
`,
      );
      Helpers.writeFile(
        path.join(pathInProjectNodeModules, config.file.package_json),
        {
          name: missingLibName,
          version: '0.0.0',
        } as PackageJson,
      );
    });
    //#endregion
  }
  //#endregion
}
