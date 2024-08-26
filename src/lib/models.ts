import * as core from 'tnp-core/src';
import type { BaseProject } from './base';

export type BaseProjectType = core.CoreModels.BaseProjectType;
export const BaseProjectTypeArr = core.CoreModels.BaseProjectTypeArr;
// , BaseProjectTypeArr
/**
 * Angular project type
 */
export type NgProject = {
  projectType: 'library' | 'application';
  /**
   * where ng-packagr.json is located, tsconfig etc.
   */
  root: string;
  /**
   * Source code project
   */
  sourceRoot: string;
  prefix: string;
};

export type LibraryBuildCommandOptions = {
  watch?: boolean;
  buildType: core.CoreModels.LibraryType;
};

export type LibrariesBuildOptions<PROJECT extends BaseProject = BaseProject> = {
  strategy?: 'link' | 'copy';
  /**
   * @deprecated
   * this will be detected in future
   */
  buildType: core.CoreModels.LibraryType;
  /**
   * by default we are copying all libraries to node_modules of itself
   */
  copylink_to_node_modules?: string[];
  releaseBuild?: boolean;
  /**
   * override build options for specific libraries
   * @todo
   */
  libraries?: PROJECT[];
  outputLineReplace?: (libForOutput: PROJECT, useExternalProvidedLibs: boolean) => (line: string) => string;
  useLastUserConfiguration?: boolean;
};

export type TestBuildOptions = {
  onlySpecyficFiles?: string[];
  updateSnapshot?: boolean;
};

export interface ChangelogData {
  changes: string[];
  version: string;
  date: string;
}
