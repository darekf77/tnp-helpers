import * as core from 'tnp-core/src';

export type BaseProjectType = core.CoreModels.BaseProjectType;
export const BaseProjectTypeArr = core.CoreModels.BaseProjectTypeArr;
// , BaseProjectTypeArr
/**
 * Angular project type
 */
export type NgProject = {
  "projectType": "library" | "application",
  /**
   * where ng-packagr.json is located, tsconfig etc.
   */
  "root": string,
  /**
   * Source code project
   */
  "sourceRoot": string,
  "prefix": string;
}

