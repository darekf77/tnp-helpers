export * from './validators/validators';
//#region @browser
export { HelpersAngular } from './for-browser/angular.helper';
//#endregion

import { HelpersFiredev as Base } from './helpers';

/**
 * Firedev helpers
 */  // @ts-ignore
export const Helpers = Base.Instance;
export * from './models';
export * from './base';
