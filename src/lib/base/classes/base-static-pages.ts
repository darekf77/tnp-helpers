//#region imports
import { config } from 'tnp-core/src';
import { path } from 'tnp-core/src';

import { Helpers } from '../../index';

import { BaseFeatureForProject } from './base-feature-for-project';
import type { BaseProject } from './base-project';
//#endregion

/**
 * Easy way to create github pages
 * (or similar static site hosting)
 */
export class BaseStaticPages<
  PROJECT extends BaseProject = any,
> extends BaseFeatureForProject<PROJECT> {
  readonly TMP_STATIC_PAGE_SITE_REPOS = 'tmp-static-pages-sites-repos';

  //#region clear folder for gh-pages
  protected async cleanFolderForStaticPages(pathToBranchRepoFolder: string) {

    //#region @backendFunc
    const noAllowedToDeleteFiles = [config.file._gitignore];
    const noAllowedToDeleteFolders = ['.git'];

    for (const fileAbsPath of Helpers.filesFrom(pathToBranchRepoFolder)) {
      if (!noAllowedToDeleteFiles.includes(path.basename(fileAbsPath))) {
        Helpers.removeIfExists(fileAbsPath);
      }
    }

    for (const folderAbsPath of Helpers.foldersFrom(pathToBranchRepoFolder)) {
      if (!noAllowedToDeleteFolders.includes(path.basename(folderAbsPath))) {
        Helpers.removeFolderIfExists(folderAbsPath);
      }
    }
    //#endregion

  }
  //#endregion

  //#region main folder
  protected get mainFolder() {
    return this.project.cache['mainFolder'];
  }

  get mainFolderAbsPath() {
    return this.project.pathFor([this.TMP_STATIC_PAGE_SITE_REPOS, this.mainFolder]);
  }
  //#endregion

  //#region pages branch name
  get pagesBranchName() {
    return `${this.mainFolder}-pages`;
  }
  //#endregion

  //#region init
  async init(mainFolder: string, completeProcess = false) {

    //#region @backendFunc
    this.project.cache['mainFolder'] = mainFolder;
    const tempRepoPath = this.project.pathFor([
      this.TMP_STATIC_PAGE_SITE_REPOS,
      mainFolder,
    ]);
    if (!Helpers.exists(tempRepoPath)) {
      await Helpers.git.clone({
        cwd: this.project.pathFor(this.TMP_STATIC_PAGE_SITE_REPOS),
        url: this.project.git.originURL,
        destinationFolderName: mainFolder,
      });
    }
    Helpers.git.checkout(tempRepoPath, this.pagesBranchName, {
      createBranchIfNotExists: true,
      switchBranchWhenExists: true,
    });
    await this.cleanFolderForStaticPages(tempRepoPath);

    const currentDocsFolderAbsPath = this.project.pathFor(config.folder.docs);
    if (
      Helpers.filesFrom(currentDocsFolderAbsPath).length > 0 &&
      Helpers.exists([currentDocsFolderAbsPath, 'index.html'])
    ) {
      Helpers.copy(currentDocsFolderAbsPath, tempRepoPath, {
        recursive: true,
        overwrite: true,
      });
    }
    if (completeProcess) {
      Helpers.git.stageAllFiles(tempRepoPath);
      Helpers.git.commit(tempRepoPath, 'update docs');
      try {
        await Helpers.git.pushCurrentBranch(tempRepoPath);
      } catch (error) {
        Helpers.error(
          `Cannot push to ${this.pagesBranchName} branch`,
          false,
          true,
        );
      }
      if (
        Helpers.filesFrom(currentDocsFolderAbsPath).length > 0 &&
        Helpers.exists([currentDocsFolderAbsPath, 'index.html'])
      ) {
        Helpers.removeFolderIfExists(currentDocsFolderAbsPath);
        Helpers.mkdirp(currentDocsFolderAbsPath);
        Helpers.writeFile(
          [currentDocsFolderAbsPath, 'info.md'],
          `# ${this.project.name} docs`,
        );
        this.project.git.addAndCommit(`chore: gh pages branch instead docs`);
        try {
          await this.project.git.pushCurrentBranch({
            forcePushNoQuestion: true,
            force: true,
          });
        } catch (error) {
          Helpers.error(
            `Cannot push to ${this.pagesBranchName} branch`,
            false,
            true,
          );
        }
      }
    }
    //#endregion

  }
  //#endregion

}