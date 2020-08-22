import * as fse from 'fs-extra';
import * as path from 'path';
import * as _ from 'lodash';
import chalk from 'chalk';

import { Project } from './project';
import { HelpersTnp } from './helpers';
const Helpers = HelpersTnp.Instance;
import { Models } from 'tnp-models';

export abstract class ProjectGit {

  //#region @backend
  public run(this: Project, command: string, options?: Models.dev.RunOptions) {
    if (!options) { options = {}; }
    if (_.isUndefined(options.showCommand)) {
      options.showCommand = true;
    }
    if (!options.cwd) { options.cwd = this.location; }
    if (options.showCommand) {
      Helpers.info(`[[${chalk.underline('Executing shell command')}]]  "${command}" in [[${options.cwd}]]`);
    }
    return Helpers.run(command, options);
  }
  //#endregion

  //#region @backend
  public get git(this: Project, ) {
    const self = this;
    return {
      resetFiles(...relativePathes: string[]) {
        relativePathes.forEach(p => {
          try {
            self.run(`git checkout HEAD -- ${p}`, { cwd: self.location }).sync()
          } catch (err) {
            Helpers.error(`[project.git] Not able to reset files: ${p} inside project ${self.name}.`
              , true, true)
          }
        })
      },
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
      get isGitRepo() {

        try {
          var test = self.run('git rev-parse --is-inside-work-tree',
            {
              cwd: self.location,
              output: false
            }).sync();

        } catch (e) {

          return false;
        }

        return !!test;
      },
      get isGitRoot() {
        return fse.existsSync(path.join(self.location, '.git'))
      },
      get originURL() {
        let url = '';
        try {
          // git config --get remote.origin.url
          url = Helpers.run(`git config --get remote.origin.url`,
            { output: false, cwd: self.location }).sync().toString().trim()
        } catch (error) {

        }
        return url;
      },
      async updateOrigin(askToRetry = false) {
        await Helpers.git.pullCurrentBranch(self.location, askToRetry);
      },
      pushCurrentBranch() {
        self.run(`git push origin ${Helpers.git.currentBranchName(self.location)}`).sync()
      },
      get thereAreSomeUncommitedChange() {
        return Helpers.run(`git diff --name-only`, { output: false, cwd: self.location }).sync().toString().trim() !== ''
      },
      pullCurrentBranch() {
        self.run(`git pull origin ${self.git.currentBranchName}`).sync()
      },
      get currentBranchName() {
        // if (!self.git.isGitRepo) {
        //   return;
        // }
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
      }
    }
  }
  //#endregion
}

// export interface ProjectGit extends Partial<Project> { }
