//#region imports
import {
  _,
  path,
  fse,
  child_process,
  crossPlatformPath,
} from 'tnp-core';
import { CLI } from 'tnp-cli';
import { Helpers } from './index';
import type { Project } from './project';
//#endregion

export class HelpersGit {
  //#region get last commit hash
  lastCommitHash(directoryPath): string {
    try {
      const cwd = directoryPath;
      let hash = child_process.execSync(`git rev-parse HEAD &> /dev/null && git log -1 --format="%H"`, { cwd }).toString().trim()
      return hash;
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(`[lastCommitHash] Not able to get last commit hash for repository in ${directoryPath}`, 1)
      return null;

    }
  }
  //#endregion

  //#region get penultimate commit hash
  penultimageCommitHash(directoryPath): string {
    try {
      const cwd = directoryPath;
      let hash = child_process.execSync(`git rev-parse HEAD &> /dev/null && git log -2 --format="%H"`, { cwd }).toString().trim()
      return hash;
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(`[lastCommitHash] Not able to get last commit hash for repository in ${directoryPath}`, 1)
      return null;

    }
  }
  //#endregion

  //#region check tag exists
  checkTagExists(tag: string, cwd = process.cwd()) {

    const command = `git show-ref --tags ${tag}`.trim();
    const result = (Helpers.commnadOutputAsString(command, cwd) || '') !== '';
    return result;
  }
  //#endregion


  //#region get last tag hash
  lastTagHash(directoryPath): string {
    try {
      const cwd = directoryPath;
      const tag = Helpers.commnadOutputAsString(`git describe --tags $(git rev-list --tags --max-count=1)`, cwd);
      if (!tag) {
        return null;
      }
      let hash = child_process.execSync(`git log -1 --format=format:"%H" ${tag}`, { cwd }).toString().trim()
      return hash;
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(`[lastCommitHash] Not able to get last commit hash for repository in ${directoryPath}`, 1)
      return null;

    }
  }
  //#endregion

  //#region get last commit date
  lastCommitDate(directoryPath): Date {
    try {
      const cwd = directoryPath;
      let unixTimestamp = child_process.execSync(`git rev-parse HEAD &> /dev/null && git log -1 --pretty=format:%ct`, { cwd }).toString().trim()
      return new Date(Number(unixTimestamp) * 1000)
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(`[lastCommitDate] Cannot counts commits in branch in: ${directoryPath}`, 1)
      return null;
    }
  }
  //#endregion

  //#region get number of commit in repository
  countCommits(cwd: string) {
    try {
      // git rev-parse HEAD &> /dev/null check if any commits
      let currentLocalBranch = child_process.execSync(`git branch | sed -n '/\* /s///p'`, { cwd }).toString().trim()
      let value = child_process.execSync(`git rev-parse HEAD &> /dev/null && git rev-list --count ${currentLocalBranch}`, { cwd }).toString().trim()
      return Number(value);
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(`[countCommits] Cannot counts commits in branch in: ${cwd}`, 1)
      return 0;
    }
  }
  //#endregion

  //#region get current branch name
  currentBranchName(cwd) {
    try {
      const branchName = child_process.execSync(`git branch | sed -n '/\* /s///p'`, { cwd }).toString().trim()
      return branchName;
    } catch (e) {
      Helpers.error(e);
    }
  }
  //#endregion

  //#region commit "what is"
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
  //#endregion

  //#region commit
  commit(cwd: string, ProjectClass: typeof Project, args?: string) {
    if (!_.isString(args)) {
      args = 'update'
    }

    const gitRootProject = ProjectClass.nearestTo(cwd, { findGitRoot: true });
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
      location: ${cwd}
      `)
      Helpers.run(`git commit --no-verify ${args}`, { cwd }).sync()
    } catch (error) {
      Helpers.warn(`[git][commit] not able to commit what is`);
    }
  }
  //#endregion

  //#region get remote origin
  getOriginURL(cwd: string) {
    let url = '';
    try {
      // git config --get remote.origin.url
      url = Helpers.run(`git config --get remote.origin.url`,
        { output: false, cwd }).sync().toString().trim()
    } catch (error) {

    }
    return url;
  }
  //#endregion

  //#region is git root
  isGitRoot(cwd: string) {
    return fse.existsSync(path.join(cwd, '.git'))
  }
  //#endregion

  //#region is git repo
  isGitRepo(cwd: string) {
    try {
      var test = Helpers.run('git rev-parse --is-inside-work-tree',
        {
          biggerBuffer: false,
          cwd,
          output: false
        }).sync();

    } catch (e) {
      return false;
    }
    return !!test;
  }
  //#endregion

  private pull(branchName = 'master', cwd = crossPlatformPath(process.cwd())) {
    child_process.execSync(`git pull --tags --ff-only origin ${branchName}`, { cwd });
  }

  //#region pull current branch
  async pullBranch(branchName: string, directoryPath: string, askToRetry = false) {
    if (this.getOriginURL(directoryPath) === '') {
      Helpers.warn(`Not pulling branch without `
        + `remote origin url.... in folder ${path.basename(directoryPath)}`);
      return;
    }
    Helpers.info(`Pulling git changes in "${directoryPath}" `)
    try {
      const cwd = directoryPath;
      Helpers.git.pull(branchName, cwd);
      Helpers.info(`Branch "${branchName}" updated successfully in ${path.basename(directoryPath)}`)
    } catch (e) {
      // console.log(e)
      Helpers.error(`Cannot update current branch in: ${directoryPath}`, askToRetry, true)
      if (askToRetry) {
        await Helpers.questionYesNo(`Do you wanna try again ?`, async () => {
          await Helpers.git.pullCurrentBranch(directoryPath, askToRetry)
        }, () => {
          process.exit(0)
        });
      }
    }
  }
  //#endregion

  //#region pull current branch
  async pullCurrentBranch(directoryPath: string, askToRetry = true) {
    if(global['tnpNonInteractive']) {
      askToRetry = false;
    }
    Helpers.info(`askToRetry: ${askToRetry}`)
    if (this.getOriginURL(directoryPath) === '') {
      Helpers.warn(`Not pulling branch without `
        + `remote origin url.... in folder ${path.basename(directoryPath)}`);
      return;
    }
    Helpers.info(`Pulling git changes in "${directoryPath}" `)
    try {
      const cwd = directoryPath;
      let currentLocalBranch = child_process.execSync(`git branch | sed -n '/\* /s///p'`, { cwd }).toString().trim()
      Helpers.git.pull(currentLocalBranch, cwd);
      Helpers.info(`Branch "${currentLocalBranch}" updated successfully in ${path.basename(directoryPath)}`)
    } catch (e) {
      console.log(e)
      Helpers.error(`Cannot update current branch in: ${directoryPath}`, askToRetry, true)
      if (askToRetry) {
        await Helpers.questionYesNo(`Do you wanna try again ?`, async () => {
          await Helpers.git.pullCurrentBranch(directoryPath, askToRetry)
        }, () => {
          process.exit(1)
        });
      }
    }
    Helpers.info(`DONE PULLING`)
  }
  //#endregion

  //#region push current branch
  pushCurrentBranch(cwd: string, force = false) {
    const currentBranchName = Helpers.git.currentBranchName(cwd);
    while (true) {
      try {
        Helpers.info(`[git][push] ${force ? 'force' : ''} pushing current branch ${currentBranchName}`);
        Helpers.run(`git push ${force ? '-f' : ''} origin ${currentBranchName} --tags`, { cwd }).sync()
        break;
      } catch (err) {
        Helpers.error(`[tnp-helpers] Not able to push branch ${currentBranchName} in:
        ${cwd}`, true, true);
        Helpers.pressKeyAndContinue(`Press any key to try again: `);
        // TODO issue 1:  issue with press any key
        // TODO issue 2: Updates were rejected because the tag already exists in the remote
        continue;
      }
    }
  }
  //#endregion

  //#region get default branch for repo
  defaultRepoBranch(cwd: string) {
    try {
      const defaultBranch = child_process
        .execSync(`git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`, { cwd })
        .toString().trim()
      return defaultBranch;
    } catch (e) {
      console.log(e)
      Helpers.error(`Cannot find default branch for repo in : ${cwd}`)
    }
  }
  //#endregion

  //#region checkout default branch
  checkoutDefaultBranch(directoryPath) {
    const cwd = directoryPath;
    const defaultBranch = child_process
      .execSync(`git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`, { cwd })
      .toString().trim()
    child_process.execSync(`git checkout ${defaultBranch}`, { cwd });
  }
  //#endregion

  //#region clone
  clone({ cwd, url, destinationFolderName = '', throwErrors, override }:
    {
      cwd: string;
      url: string;
      destinationFolderName?: string;
      throwErrors?: boolean;
      override?: boolean;
    }) {
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

    const cloneFolderName = path.join(
      cwd,
      (!!destinationFolderName && destinationFolderName.trim() !== '') ? destinationFolderName : path.basename(url)
    );
    if (override) {
      Helpers.remove(cloneFolderName)
    } else if (Helpers.exists(cloneFolderName) && Helpers.exists(path.join(cloneFolderName, '.git'))) {
      Helpers.warn(`Alread cloned ${path.basename(cloneFolderName)}...`);
      return;
    }

    const commnad = `git -c http.sslVerify=false clone ${url} ${destinationFolderName}`;
    Helpers.info(`

    Cloning:
    ${commnad}

    `);
    if (throwErrors) {
      Helpers.run(commnad, { cwd }).sync();
    } else {
      try {
        Helpers.run(commnad, { cwd, output: false }).sync();
      } catch (error) {
        if (error?.stderr?.toString()?.search('remote: Not Found') !== -1) {
          Helpers.warn(`[tnp-helpers][git] Project not found :${url}`);
        } else {
          Helpers.error(`Can't clone from url: ${CLI.chalk.bold(url)}..`, false, true);
        }
      }
    }
  }
  //#endregion

  //#region check if there are some uncommited changes
  checkIfthereAreSomeUncommitedChange(cwd: string) {
    try {
      return Helpers.run(`git diff --name-only`, { output: false, cwd }).sync().toString().trim() !== '';
    } catch (error) {
      return true;
    }
  }
  //#endregion

  //#region restore last version
  restoreLastVersion(cwd: string, localFilePath: string) {
    try {
      Helpers.info(`[git] restoring last verion of file ${path.basename(cwd)}/${localFilePath}`)
      Helpers.run(`git checkout -- ${localFilePath}`, { cwd }).sync();
    } catch (error) {
      Helpers.warn(`[tnp-git] Not able to resotre last version of file ${localFilePath}`);
    }
  }
  //#endregion

  //#region reset files
  resetFiles(cwd: string, ...relativePathes: string[]) {
    relativePathes.forEach(p => {
      try {
        Helpers.run(`git checkout HEAD -- ${p}`, { cwd }).sync()
      } catch (err) {
        Helpers.error(`[project.git] Not able to reset files: ${p} inside project ${path.basename(cwd)}.`
          , true, true)
      }
    });
  }
  //#endregion

}
