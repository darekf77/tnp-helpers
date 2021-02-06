import * as _ from 'lodash';
import * as path from 'path';
import { config } from 'tnp-config';
import { BaselineSiteJoinprefix } from './constants';

export class HelpersPath {

  create(...pathPart: string[]) {
    return path.join(...pathPart);
  }

  PREFIX(baseFileName) {
    return `${BaselineSiteJoinprefix}${baseFileName}`
  }
  removeRootFolder(filePath: string) {
    return filePath.replace(new RegExp(`^${config.regexString.pathPartStringRegex}`, 'g'), '')
  }
  removeExtension(filePath: string) {
    const ext = path.extname(filePath);
    return path.join(path.dirname(filePath), path.basename(filePath, ext))
  }
  removeExt(filePath: string) {
    return filePath.replace(/\.[^\/.]+$/, '')
  }
  /**
   * return cross platform version of path
   */
  crossPlatofrm(p: string) {
    if (process.platform === 'win32') {
      return p.replace(/\\/g, '/');
    }
    return p;
  }
}
