import { _ } from 'tnp-core/src';
export class HelpersNpm {

  checkValidNpmPackageName(pkg) {
    if (!_.isString(pkg) || pkg.length > 214) {
      return false;
    }
    return new RegExp('^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(\@.+$)?').test(pkg);
  }


}
