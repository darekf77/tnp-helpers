import { config, dotTaonFolder } from 'tnp-core/src';
import { crossPlatformPath, os, path, UtilsOs } from 'tnp-core/src';

import { Helpers } from '../index';

import { BaseProject } from './classes/base-project';

/**
 * Class to save and restore temporary code
 * TODO fix removing files from repo
 */
export class GhTempCode {
  constructor(
    private cwd: string,
    private project: BaseProject,
  ) {}

  // TODO save it in db
  private GHTEMP_CODE_REPO_PATH = 'git@github.com:darekf77/ghtemp-code.git';

  private get cwdRepo() {

    //#region @backendFunc
    return crossPlatformPath([UtilsOs.getRealHomeDir(), dotTaonFolder]);
    //#endregion

  }

  private get tempPathRepo() {
    return crossPlatformPath([this.cwdRepo, 'ghtemp-code']);
  }

  init() {

    //#region @backendFunc
    if (!Helpers.exists(this.cwdRepo)) {
      Helpers.mkdirp(this.cwdRepo);
    }
    if (!Helpers.exists(this.tempPathRepo)) {
      Helpers.run(`git clone ${this.GHTEMP_CODE_REPO_PATH}`, {
        cwd: this.cwdRepo,
      }).sync();
    }
    Helpers.run(`git reset --hard && git pull origin master`, {
      cwd: this.tempPathRepo,
    }).sync();
    return this;
    //#endregion

  }

  async save() {

    //#region @backendFunc
    const changes = [
      ...this.project.git.listOfCurrentGitChanges.created,
      ...this.project.git.listOfCurrentGitChanges.modified,
    ];

    for (const fileFromRepo of Helpers.filesFrom(this.tempPathRepo)) {
      Helpers.removeFileIfExists(fileFromRepo);
    }

    for (const folderFromRepo of Helpers.foldersFrom(this.tempPathRepo).filter(
      f => !f.endsWith('/.git'),
    )) {
      Helpers.remove(folderFromRepo, true);
    }

    const changesRelative = changes.map(f => Helpers.relative(this.cwd, f));
    for (let index = 0; index < changes.length; index++) {
      const filesAbs = changes[index];
      if (!Helpers.isFolder(filesAbs)) {
        Helpers.copyFile(
          filesAbs,
          crossPlatformPath([this.tempPathRepo, changesRelative[index]]),
        );
      }
    }

    Helpers.run(
      `git add . && git commit -m "changes" && git push origin master`,
      { cwd: this.tempPathRepo, output: true },
    ).sync();

    Helpers.info(`Saved ${changes.length} files in ${this.tempPathRepo}`);
    //#endregion

  }

  async restore() {

    //#region @backendFunc
    Helpers.run(`git reset --soft HEAD~1`, { cwd: this.tempPathRepo }).sync();
    Helpers.info(`Restored last commit in ${this.tempPathRepo}...`);
    const { created, modified } = Helpers.git.getListOfCurrentGitChanges(
      this.tempPathRepo,
    );
    const filesToRestore = [...created, ...modified].map(f =>
      crossPlatformPath([this.tempPathRepo, f]),
    );
    const filesToRestoreRelative = filesToRestore.map(f =>
      f.replace(this.tempPathRepo + '/', ''),
    );
    for (let index = 0; index < filesToRestore.length; index++) {
      const filesAbs = filesToRestore[index];
      if (!Helpers.isFolder(filesAbs)) {
        Helpers.copyFile(
          filesAbs,
          crossPlatformPath([this.cwd, filesToRestoreRelative[index]]),
        );
      }
    }
    Helpers.info(
      `Restored ${filesToRestore.length} files from ${this.tempPathRepo}`,
    );
    return this;
    //#endregion

  }
}