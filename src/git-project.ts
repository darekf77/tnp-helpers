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
      options.showCommand = false;
    }
    if (!options.cwd) { options.cwd = this.location; }
    if (options.showCommand) {
      Helpers.info(`[[${chalk.underline('Executing shell command')}]]  "${command}" in [[${options.cwd}]]`);
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
        const ALWAYS_HTTPS = true;
        if (!url.endsWith('.git')) {
          url = (url + '.git')
        }
        if (ALWAYS_HTTPS) {
          if (!url.startsWith('https://')) {
            const [serverPart, pathPart] = url.split(':');
            const server = (serverPart || '').replace('git@', '');
            url = `https://${server}/${pathPart}`;
          }
        }

        const commnad = `git -c http.sslVerify=false clone ${url} ${destinationFolderName}`;
        Helpers.info(`

        Cloning:
        ${commnad}

        `)
        self.run(commnad).sync();
      },
      restoreLastVersion(localFilePath: string) {
        try {
          Helpers.info(`[git] restoring last verion of file ${self.name}/${localFilePath}`)
          self.run(`git checkout -- ${localFilePath}`).sync();
        } catch (error) {
          Helpers.warn(`[tnp-git] Not able to resotre last version of file ${localFilePath}`);
        }
      },
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
              biggerBuffer: false,
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
      commit(args?: string) {
        if (!_.isString(args)) {
          args = 'update'
        }

        const gitRootProject = Project.nearestTo(self.location, { findGitRoot: true });
        try {
          Helpers.info(`[git][commit] Adding current git changes in git root:
            ${gitRootProject.location}
            `)
          gitRootProject.run(`git add --all . `).sync()
        } catch (error) {
          Helpers.warn(`Failed to 'git add --all .' in:
            ${gitRootProject.location}`);
        }

        if (args.search('-m') === -1 && args.search('-msg') === -1) {
          const addBrackets = !(
            (args.startsWith('\'') ||
              args.startsWith('"')) &&
            (args.endsWith('\'') ||
              args.endsWith('"'))
          );
          args = `-m ${addBrackets ? `"${args}"` : args}`;
        }
        try {
          Helpers.info(`[git][commit] trying to commit what it with argument:
          "${args}"
          location: ${self.location}
          `)
          self.run(`git commit --no-verify ${args}`).sync()
        } catch (error) {
          Helpers.warn(`[git][commit] not able to commit what is`);
        }
      },
      pushCurrentBranch(force = false) {
        const currentBranchName = Helpers.git.currentBranchName(self.location);
        while (true) {
          try {
            Helpers.info(`[git][push] ${force ? 'force' : ''} pushing current branch ${currentBranchName}`);
            self.run(`git push ${force ? '-f' : ''} origin ${currentBranchName}`).sync()
            break;
          } catch (err) {
            Helpers.error(`Not able to push branch ${currentBranchName} in:
            ${self.location}`, false, true);
            Helpers.pressKeyAndContinue(`Press any key to try again: `);
            continue;
          }
        }
      },
      get thereAreSomeUncommitedChange() {
        return Helpers.run(`git diff --name-only`, { output: false, cwd: self.location }).sync().toString().trim() !== ''
      },
      pullCurrentBranch(force = false) {

        if (self.git.originURL === '') {
          Helpers.warn(`Not pulling branch without `
            + `remote origin url.... in folder ${path.basename(self.location)}`);
          return;
        }
        if (force) {
          // TODO
        } else {
          self.run(`git -c http.sslVerify=false pull origin ${self.git.currentBranchName}`).sync()
        }
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
      },

      penultimageCommitHash() {
        return Helpers.git.penultimageCommitHash(self.location)
      },
      lastTagHash() {
        return Helpers.git.lastTagHash(self.location)
      }
    }
  }
  //#endregion
}

// export interface ProjectGit extends Partial<Project> { }
