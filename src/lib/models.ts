import * as core from 'tnp-core/src';
import type { BaseProject, TypeOfCommit } from './base';

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
};

export type LibrariesBuildOptions<PROJECT extends BaseProject = BaseProject> = {
  strategy?: 'link' | 'copy';
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
  outputLineReplace?: (
    libForOutput: PROJECT,
    useExternalProvidedLibs: boolean,
  ) => (line: string) => string;
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

export interface PushProcessOptions {
  force?: boolean;
  typeofCommit?: TypeOfCommit;
  mergeUpdateCommits?: boolean;
  askToConfirmPush?: boolean;
  askToConfirmCommit?: boolean;
  skipLint?: boolean;
  askToConfirmBranchChange?: boolean;
  origin?: string;
  args?: string[];
  setOrigin?: 'ssh' | 'http';
  exitCallBack?: () => void;
  forcePushNoQuestion?: boolean;
  overrideCommitMessage?: string;
  commitMessageRequired?: boolean;
  /**
   * only needed when push github
   * and I forgot to add my username before issue
   * taon pfix proper input my-repo#344
   * that should be
   * taon pfix proper input my-username/my-repo#344
   */
  currentOrigin?: string;
  skipChildren?: boolean;
  noExit?: boolean;
}
