//#region imports
//#region @backend
import { path, crossPlatformPath } from 'tnp-core/src';
//#endregion
import { IncCompiler } from 'incremental-compiler/src';
import { _ } from 'tnp-core/src';
import { BaseProject } from './base-project';
import { Helpers } from 'tnp-helpers/src';
import { config } from 'tnp-config/src';
//#endregion

export abstract class BaseCompilerForProject<
  ADDITIONAL_DATA = any,
  PROJECT extends BaseProject = BaseProject,
> extends IncCompiler.Base<ADDITIONAL_DATA> {
  //#region check folder compiler
  protected checkFolderCompiler(
    project: PROJECT,
    options: IncCompiler.Models.BaseClientCompilerOptions,
    dontCheck = false,
  ) {
    //#region @backendFunc
    if (_.isUndefined(options)) {
      return options;
    }
    if (_.isUndefined(options.folderPath)) {
      options.folderPath = [];
    }
    const folders = _.isArray(options.folderPath)
      ? options.folderPath
      : [options.folderPath];

    options.folderPath = folders.map(f => {
      f = crossPlatformPath(f);
      if (!dontCheck) {
        if (
          f.startsWith(path.join(project.location, config.folder.node_modules))
        ) {
          Helpers.error(
            `[checkFolderCompiler] Please don't watch node_module folder for ${project.location}`,
            false,
            true,
          );
        }
        if (
          !f.startsWith(project.location) ||
          f.startsWith(`${project.location}/..`)
        ) {
          Helpers.error(
            `[checkFolderCompiler] Please watch only folder inside project ${project.location}`,
            false,
            true,
          );
        }
      }
      return f;
    });
    return options;
    //#endregion
  }
  //#endregion

  //#region constructor

  constructor(
    public project: PROJECT,
    options?: IncCompiler.Models.BaseClientCompilerOptions,
    allowFolderOutSideProject = false,
  ) {
    super();
    //#region @backend
    options = this.checkFolderCompiler(
      project,
      options,
      allowFolderOutSideProject,
    );
    if (options) {
      this.initOptions(options);
    }
    //#endregion
  }

  //#endregion
}
