import {
  _,
  //#region @backend
  path,
  //#endregion
} from 'tnp-core';
import { Project } from './project';
import { HelpersTnp } from './helpers';
//#region @backend
import { CLI } from 'tnp-cli';
//#endregion
const Helpers = HelpersTnp.Instance;
import { RunOptions } from 'tnp-core';

export abstract class ProjectGit {

  //#region @backend

  public runCommandGetString(this: Project, command: string) {
    return Helpers.commnadOutputAsString(command, this.location, false);
  }

  public run(this: Project, command: string, options?: RunOptions) {
    if (!options) { options = {}; }
    if (_.isUndefined(options.showCommand)) {
      options.showCommand = false;
    }
    if (!options.cwd) { options.cwd = this.location; }
    if (options.showCommand) {
      Helpers.info(`[${CLI.chalk.underline('Executing shell command')}]  "${command}" in [${options.cwd}]`);
    } else {
      Helpers.log(`[${CLI.chalk.underline('Executing shell command')}]  "${command}" in [${options.cwd}]`);
    }
    return Helpers.run(command, options);
  }
  //#endregion

  //#region @backend
  // @ts-ignore
  public get git(this: Project) {
    const self = this;
    return {
      clone(url: string, destinationFolderName = '') {
        return Helpers.git.clone({ cwd: self.location, url, destinationFolderName });
      },
      restoreLastVersion(localFilePath: string) {
        return Helpers.git.restoreLastVersion(self.location, localFilePath);
      },
      resetFiles(...relativePathes: string[]) {
        return Helpers.git.resetFiles(self.location, ...relativePathes);
      },
      get isGitRepo() {
        return Helpers.git.isGitRepo(self.location);
      },
      get isGitRoot() {
        return Helpers.git.isGitRoot(self.location);
      },
      get originURL() {
        return Helpers.git.getOriginURL(self.location);
      },
      async updateOrigin(askToRetry = false) {
        await Helpers.git.pullCurrentBranch(self.location, askToRetry);
      },
      commit(args?: string) {
        return Helpers.git.commit(self.location, Project, args);
      },
      pushCurrentBranch(force = false) {
        return Helpers.git.pushCurrentBranch(self.location, force);
      },
      get thereAreSomeUncommitedChange() {
        return Helpers.git.checkIfthereAreSomeUncommitedChange(self.location);
      },
      pullCurrentBranch() {
        return Helpers.git.pullCurrentBranch(self.location);
      },
      get currentBranchName() {
        return Helpers.git.currentBranchName(self.location);
      },
      resetHard() {
        self.run(`git reset --hard`).sync()
      },
      countComits() {
        return Helpers.git.countCommits(self.location);
      },
      lastCommitDate() {
        return Helpers.git.lastCommitDate(self.location)
      },
      lastCommitHash() {
        return Helpers.git.lastCommitHash(self.location)
      },
      penultimageCommitHash() {
        return Helpers.git.penultimageCommitHash(self.location)
      },
      checkTagExists(tag:string) {
        return Helpers.git.checkTagExists(tag,self.location)
      },
      lastTagHash() {
        return Helpers.git.lastTagHash(self.location)
      },
      /**
       * TODO does this make any sense
       */
      renameOrigin(newNameOrUlr: string) {
        if (!newNameOrUlr.endsWith('.git')) {
          newNameOrUlr = (newNameOrUlr + '.git')
        }
        const oldOrigin = self.git.originURL;
        if (!newNameOrUlr.startsWith('git@') && !newNameOrUlr.startsWith('https://')) {
          newNameOrUlr = oldOrigin.replace(path.basename(oldOrigin), newNameOrUlr);
        }

        try {
          self.run(`git remote rm origin`).sync();
        } catch (error) { }

        try {
          self.run(`git remote add origin ${newNameOrUlr}`).sync();
          Helpers.info(`Origin changed:
        from: ${oldOrigin}
          to: ${newNameOrUlr}\n`);
        } catch (e) {
          Helpers.error(`Not able to change origin.. reverting to old`, true, true);
          self.run(`git remote add origin ${oldOrigin}`).sync();
        }
      },
    }
  }
  //#endregion
}

// export interface ProjectGit extends Partial<Project> { }
