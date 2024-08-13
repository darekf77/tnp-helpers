export * from './validators/validators';
//#region @browser
export { HelpersAngular } from './helpers/for-browser/angular.helper';
//#endregion

export * from './utils';
import { HelpersFiredev as Base } from './helpers/helpers';
/**
 * Firedev helpers
 */ // @ts-ignore
export const Helpers: Base = Base.Instance as Base;
export * from './base';
export * from './models';
//#region @backend
export * from './helpers/for-backend/ts-code/index';
//#endregion
