import { Helpers } from '../index';
import type { BaseProject } from './base-project';
import { BaseFeatureForProject } from './base-feature-for-project';
import { _ } from 'tnp-core/src';

// TODO
export class BaseIgnoreHideHelpers<
  PROJECT extends BaseProject = any,
> extends BaseFeatureForProject {
  //#region files to ignore
  protected filesToGitIgnore() {
    return [
      '.DS_Store',
      'yarn-error.log',
      // TODO add more
    ];
  }

  protected folderToGitIgnore() {
    return [
      'node_modules',
      'dist',
      'coverage',
      // TODO add more
    ];
  }

  protected filesAToHideFromUser() {
    return this.filesToGitIgnore();
  }

  protected foldersToHideFromUser() {
    return this.folderToGitIgnore();
  }

  public writeGitIgnore() {
    // const content = this.filesToGitIgnore().join('\n');
    // this.project.writeToFile('.gitignore', content);
  }

  /**
   *
   * @returns
   */
  public filesAndFoldersPatternsToHideFromUser() {
    return Helpers.uniqArray([
      ...this.filesAToHideFromUser(),
      ...this.foldersToHideFromUser(),
    ]).reduce((acc, item) => {
      return _.merge(acc, {
        [`**/${item}`]: true,
      });
    }, {});
  }

  //#endregion
}
