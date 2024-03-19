export * from './validators/validators';
//#region @browser
export { HelpersAngular } from './for-browser/angular.helper';
//#endregion

import { HelpersFiredev as Base } from './helpers';

/**
 * Firedev helpers
 */
export const Helpers = Base.Instance;
export * from './base-project';
export * from './base-project-resolver';
//#region @backend
export * from './base-command-line.backend';
//#endregion
export * from './models';

