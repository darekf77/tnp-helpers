import * as child from 'child_process';
import * as path from 'path';

import { Helpers } from './index';

export class HelpersGit {

  lastCommitHash(directoryPath): string {
    try {
      const cwd = directoryPath;
      let hash = child.execSync(`git log -1 --format="%H"`, { cwd }).toString().trim()
      return hash;
    } catch (e) {
      console.log(e)
      Helpers.error(`Cannot counts commits in branch in: ${directoryPath}`)
    }

  }

  lastCommitDate(directoryPath): Date {
    try {
      const cwd = directoryPath;
      let unixTimestamp = child.execSync(`git log -1 --pretty=format:%ct`, { cwd }).toString().trim()
      return new Date(Number(unixTimestamp) * 1000)
    } catch (e) {
      console.log(e)
      Helpers.error(`Cannot counts commits in branch in: ${directoryPath}`)
    }

  }


  countCommits(directoryPath) {
    try {
      const cwd = directoryPath;
      let currentLocalBranch = child.execSync(`git branch | sed -n '/\* /s///p'`, { cwd }).toString().trim()
      let value = child.execSync(`git rev-list --count ${currentLocalBranch}`, { cwd }).toString().trim()
      return Number(value);
    } catch (e) {
      console.log(e)
      Helpers.error(`Cannot counts commits in branch in: ${directoryPath}`)
    }

  }

  currentBranchName(cwd) {
    try {
      const branchName = child.execSync(`git branch | sed -n '/\* /s///p'`, { cwd }).toString().trim()
      return branchName;
    } catch (e) {
      Helpers.error(e);
    }
  }

  commitWhatIs(customMessage = 'changes') {

    try {
      Helpers.run(`git add --all . `).sync()
    } catch (error) {
      Helpers.warn(`Failed to git add --all .`);
    }

    try {
      Helpers.run(`git commit -m "${customMessage}"`).sync()
    } catch (error) {
      Helpers.warn(`Failed to git commit -m "${customMessage}"`);
    }

  }

  async pullCurrentBranch(directoryPath, askToRetry = false) {
    Helpers.info(`Pulling git changes in "${directoryPath}" `)
    try {
      const cwd = directoryPath;
      let currentLocalBranch = child.execSync(`git branch | sed -n '/\* /s///p'`, { cwd }).toString().trim()
      child.execSync(`git pull origin ${currentLocalBranch}`, { cwd });
      Helpers.info(`Branch "${currentLocalBranch}" updated successfully in ${path.basename(directoryPath)}`)
    } catch (e) {
      // console.log(e)
      Helpers.error(`Cannot update current branch in: ${directoryPath}`, askToRetry, true)
      if (askToRetry) {
        await Helpers.questionYesNo(`Do you wanna try again ?`, async () => {
          await Helpers.git.pullCurrentBranch(directoryPath, askToRetry)
        }, () => {
          process.exit(0)
        })
      }

    }

  }

  defaultRepoBranch(directoryPath) {
    try {
      const cwd = directoryPath;
      const defaultBranch = child
        .execSync(`git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`, { cwd })
        .toString().trim()
      return defaultBranch;
    } catch (e) {
      console.log(e)
      Helpers.error(`Cannot find default branch for repo in : ${directoryPath}`)
    }
  }

  //#endregion

}
