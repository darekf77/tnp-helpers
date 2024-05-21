
export type BaseProjectType = 'unknow' | 'unknow-npm-project';

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

