import { _, path } from 'tnp-core';
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
}
