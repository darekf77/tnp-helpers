export * from './validators/validators';
//#region @browser
export { HelpersAngular } from './helpers/for-browser/angular.helper';
//#endregion

import { HelpersFiredev as Base } from './helpers/helpers';

/**
 * Firedev helpers
 */  // @ts-ignore
export const Helpers = Base.Instance;
export * from './base';
export * from './models';
