//#region imports
import {
  BaseClientCompiler,
  BaseClientCompilerOptions,
} from 'incremental-compiler/src';
import { path, crossPlatformPath } from 'tnp-core/src';
import { _ } from 'tnp-core/src';
import { config } from 'tnp-core/src';
import { Helpers } from 'tnp-helpers/src';

import { BaseProject } from './base-project';
//#endregion

export abstract class BaseCompilerForProject<
  ADDITIONAL_DATA = any,
  PROJECT extends BaseProject = BaseProject,
> extends BaseClientCompiler<ADDITIONAL_DATA> {
  //#region check folder compiler
  protected checkFolderCompiler(
    project: PROJECT,
    options: BaseClientCompilerOptions,
    dontCheck = false,
  ): BaseClientCompilerOptions {
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
          f.startsWith(
            crossPlatformPath([project.location, config.folder.node_modules]),
          )
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
    options?: BaseClientCompilerOptions,
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
