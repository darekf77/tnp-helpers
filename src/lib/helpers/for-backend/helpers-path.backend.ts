import { _, path } from 'tnp-core';
import { config } from 'tnp-config';
import { BaselineSiteJoinprefix } from 'tnp-config';
import { Helpers } from '../../index';

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
    return Helpers.path.removeExt(filePath);
    // const ext = path.extname(filePath);
    // return path.join(path.dirname(filePath), path.basename(filePath, ext))
  }
  removeExt(filePath: string) {
    return filePath.replace(/\.[^\/.]+$/, '')
  }
}
