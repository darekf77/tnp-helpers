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
import { config } from 'tnp-config';
//#endregion

export class HelpersGit {

  //#region get last commit hash
  lastCommitHash(cwd): string {
    Helpers.log('[lastcommithash] ' + cwd, 1)
    try {
      let hash = this.isGitRepo(cwd) && child_process.execSync(`git log -1 --format="%H"`, { cwd }).toString().trim()
      return hash;
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(`[lastCommitHash] Not able to get last commit hash for repository in ${cwd}`, 1)
      return null;

    }
  }
  //#endregion

  //#region get penultimate commit hash
  penultimageCommitHash(cwd): string {
    Helpers.log('[penultimageCommitHash] ' + cwd, 1)
    try {
      let hash = this.isGitRepo(cwd) && child_process.execSync(`git log -2 --format="%H"`, { cwd }).toString().trim()
      return hash;
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(`[lastCommitHash] Not able to get last commit hash for repository in ${cwd}`, 1)
      return null;

    }
  }
  //#endregion

  //#region check tag exists
  checkTagExists(tag: string, cwd = process.cwd()) {
    Helpers.log('[checkTagExists] ' + cwd, 1)
    if (!Helpers.git.hasAnyCommits(cwd)) {
      return false;
    }
    const command = `git show-ref --tags ${tag}`.trim();
    const result = (Helpers.commnadOutputAsString(command, cwd) || '') !== '';
    return result;
  }
  //#endregion

  lastTagVersionName(cwd: string) {
    Helpers.log('[lastTagVersionName] ' + cwd, 1)
    if (!Helpers.git.hasAnyCommits(cwd)) {
      return void 0;
    }
    try {
      let command = `git describe --tags $(git rev-list --tags --max-count=1)`;
      if (process.platform === 'win32') {
        command = 'git describe --tags --abbrev=0';
      }
      const tag = Helpers.commnadOutputAsString(command, cwd);
      if (!tag) {
        return void 0;
      }
      return tag;
    } catch (e) {
      Helpers.warn(`[lastCommitHash] Not able to get last commit version name for repository in ${cwd}`, false)
      return void 0;
    }
  }


  //#region get last tag hash
  lastTagHash(cwd): string {
    Helpers.log('[lastTagHash] ' + cwd, 1)
    try {

      const tag = Helpers.git.lastTagVersionName(cwd);
      if (!tag) {
        return null;
      }
      let hash = child_process.execSync(`git log -1 --format=format:"%H" ${tag}`, { cwd }).toString().trim()
      return hash;
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(`[lastCommitHash] Not able to get last commit hash for repository in ${cwd}`, 1)
      return null;

    }
  }
  //#endregion

  //#region get last commit date
  lastCommitDate(cwd: string): Date {
    Helpers.log('[lastCommitDate] ' + cwd, 1)
    try {
      let unixTimestamp = this.isGitRepo(cwd)
        && child_process
          .execSync(`git log -1 --pretty=format:%ct`, { cwd })
          .toString()
          .trim()

      return new Date(Number(unixTimestamp) * 1000)
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(`[lastCommitDate] Cannot counts commits in branch in: ${cwd}`, 1)
      return null;
    }
  }
  //#endregion

  //#region get last commit date
  lastCommitMessage(cwd): string {
    Helpers.log('[lastCommitMessage] ' + cwd, 1)
    try {

      let unixTimestamp = child_process.execSync(`git log -1 --pretty=%B`, { cwd }).toString().trim()
      return unixTimestamp;
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(`[lastCommitMessage] Cannot display last commit message in branch in: ${cwd}`, 1)
      return null;
    }
  }
  //#endregion

  //#region get number of commit in repository
  countCommits(cwd: string) {
    Helpers.log('[countCommits] ' + cwd, 1)
    if (!Helpers.git.hasAnyCommits(cwd)) {
      return 0;
    }
    try {
      Helpers.log('RUNNING COUNT COMMITS')
      // git rev-parse HEAD &> /dev/null check if any commits
      let currentLocalBranch = this.currentBranchName(cwd);
      let value = Number(this.isGitRepo(cwd) && Helpers
        .commnadOutputAsString(`git rev-list --count ${currentLocalBranch}`, cwd).trim())

      return !isNaN(value) ? value : 0;
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(`[countCommits] Cannot counts commits in branch in: ${cwd}`, 1)
      return 0;
    }
  }
  //#endregion

  //#region get number of commit in repository
  hasAnyCommits(cwd: string) {
    Helpers.log('[hasAnyCommits] ' + cwd, 1)
    try {
      if (process.platform === 'win32') {
        child_process.execSync('git rev-parse HEAD', { cwd }).toString().trim()
      } else {
        child_process.execSync('git rev-parse HEAD &> /dev/null', { cwd }).toString().trim()
      }
      return true;
    } catch (e) {
      return false
    }
  }
  //#endregion

  //#region get branches names
  getBranchesNames(cwd: string, pattern?: string | RegExp): string[] {
    Helpers.log('[getBranchesNames] ' + cwd, 1)
    try {
      let branchPattern = pattern;
      if (_.isString(pattern)) {
        branchPattern = new RegExp(pattern.replace(/[^a-zA-Z0-9]+/g, '.*'));
      }
      const command = `git branch -a`;
      // console.log({ command, cwd })
      const branchNames = Helpers.commnadOutputAsString(command, cwd, true, true)
      // console.log({ branchNames })

      const _branchNames = branchNames
        .toString()
        .trim()
        .split('\n')
        .map(l => l.replace('*', '').trim())
        .filter(l => {
          // console.log('testing: ' + l)
          if (_.isRegExp(branchPattern)) {
            const match = branchPattern.test(l);
            return match;
          }
          // if (_.isString(pattern)) {
          //   return l.search(pattern)
          // }
          return true;
        });
      return _branchNames;
    } catch (e) {
      Helpers.log(e);
      return [];
    }
  }
  //#endregion


  //#region get current branch name
  currentBranchName(cwd) {
    Helpers.log('[currentBranchName] ' + cwd, 1)
    try {
      const branchName = child_process.execSync(`git branch | sed -n '/\* /s///p'`, { cwd }).toString().trim()
      return branchName;
    } catch (e) {
      Helpers.error(e);
    }
  }
  //#endregion

  //#region commit "what is"
  commitWhatIs(cwd: string, customMessage = 'changes') {
    Helpers.log('[commitWhatIs]')
    try {
      Helpers.run(`git add --all . `, { cwd }).sync()
    } catch (error) {
      Helpers.warn(`Failed to git add --all .`);
    }

    try {
      Helpers.run(`git commit -m "${customMessage}"`, { cwd }).sync()
    } catch (error) {
      Helpers.warn(`Failed to git commit -m "${customMessage}"`);
    }
  }
  //#endregion

  //#region commit
  commit(cwd: string, ProjectClass: typeof Project, args?: string) {
    Helpers.log('[commit] ' + cwd, 1)
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
      Helpers.log(error)
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
      var cmdddd = `git commit --no-verify ${args}`;
      Helpers.run(cmdddd, { cwd }).sync()
    } catch (error) {
      Helpers.log(error)
      Helpers.warn(`[git][commit] not able to commit what is with command: ${cmdddd}`);
    }
  }
  //#endregion

  //#region get remote origin
  getOriginURL(cwd: string, differentOriginName = '') {
    Helpers.log('[getOriginURL] ' + cwd, 1)
    let url = '';
    try {
      // git config --get remote.origin.url
      url = Helpers.run(`git config --get remote.${differentOriginName ? differentOriginName : 'origin'}.url`,
        { output: false, cwd }).sync().toString().trim()
    } catch (error) {
      return '< not able to get origin >'
    }
    return url;
  }
  //#endregion

  //#region is git root
  isGitRoot(cwd: string) {
    Helpers.log('[isGitRoot] ' + cwd, 1)
    return this.isGitRepo(cwd) && fse.existsSync(path.join(cwd, '.git'))
  }
  //#endregion

  //#region is git repo
  isGitRepo(cwd: string) {
    Helpers.log('[isGitRepo] ' + cwd, 1)
    if (!Helpers.git.hasAnyCommits(cwd)) {
      return false;
    }
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
    Helpers.log('[pull] ' + cwd, 1)
    child_process.execSync(`git pull --tags --rebase origin ${branchName}`, { cwd });
  }

  //#region pull current branch
  async pullBranch(branchName: string, cwd: string, askToRetry = false) {
    Helpers.log('[pullBranch] ' + cwd, 1)
    if (this.getOriginURL(cwd) === '') {
      Helpers.warn(`Not pulling branch without `
        + `remote origin url.... in folder ${path.basename(cwd)}`);
      return;
    }
    Helpers.info(`Pulling git changes in "${cwd}" , origin=${Helpers.git.getOriginURL(cwd)} `)
    try {
      Helpers.git.pull(branchName, cwd);
      Helpers.info(`Branch "${branchName}" updated successfully in ${path.basename(cwd)}`)
    } catch (e) {
      // console.log(e)
      Helpers.error(`Cannot update current branch in: ${cwd}`, askToRetry, true)
      if (askToRetry) {
        await Helpers.questionYesNo(`Do you wanna try again ?`, async () => {
          await Helpers.git.pullCurrentBranch(cwd, askToRetry)
        }, () => {
          process.exit(0)
        });
      }
    }
  }
  //#endregion

  //#region pull current branch
  async pullCurrentBranch(cwd: string, askToRetry = true) {
    Helpers.log('[pullCurrentBranch] ' + cwd, 1)
    if (global['tnpNonInteractive']) {
      askToRetry = false;
    }
    Helpers.log(`askToRetry: ${askToRetry}`)
    if (this.getOriginURL(cwd) === '') {
      Helpers.warn(`Not pulling branch without `
        + `remote origin url.... in folder ${path.basename(cwd)}`);
      return;
    }
    Helpers.info(`Pulling git changes in "${cwd}", origin=${Helpers.git.getOriginURL(cwd)}  `)
    try {

      let currentLocalBranch = child_process.execSync(`git branch | sed -n '/\* /s///p'`, { cwd }).toString().trim()
      Helpers.git.pull(currentLocalBranch, cwd);
      Helpers.info(`Branch "${currentLocalBranch}" updated successfully in ${path.basename(cwd)}`)
    } catch (e) {
      console.log(e)
      Helpers.error(`Cannot update current branch in: ${cwd}`, askToRetry, true)
      if (askToRetry) {
        await Helpers.questionYesNo(`Do you wanna try again ?`, async () => {
          await Helpers.git.pullCurrentBranch(cwd, askToRetry)
        }, () => {
          process.exit(1)
        });
      }
    }
    Helpers.info(`DONE PULLING`)
  }
  //#endregion

  //#region push current branch
  pushCurrentBranch(cwd: string, force = false, origin = 'origin') {
    Helpers.log('[pushCurrentBranch] ' + cwd, 1)
    const currentBranchName = Helpers.git.currentBranchName(cwd);
    const taskName = `
    Pushing current branch (remote=${origin}): ${currentBranchName}
    `
    Helpers.info(taskName);
    while (true) {
      try {
        const command = `git push ${force ? '-f' : ''} ${origin} ${currentBranchName} --tags`;
        Helpers.info(`[git][push] ${force ? 'force' : ''} pushing current branch ${currentBranchName} ,`
          + ` origin=${Helpers.git.getOriginURL(cwd, origin)}`);

        Helpers.run(command, { cwd }).sync()
        Helpers.info(taskName);
        break;
      } catch (err) {
        Helpers.error(`[tnp-helpers] Not able to push branch ${currentBranchName} in (origin=${origin}):
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
    Helpers.log('[defaultRepoBranch] ' + cwd, 1)
    try {
      const defaultBranch = child_process
        .execSync(`git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`, { cwd })
        .toString().trim()
      return defaultBranch;
    } catch (e) {
      Helpers.log(e)
      Helpers.error(`Cannot find default branch for repo in : ${cwd}`)
    }
  }
  //#endregion

  //#region checkout default branch
  checkoutDefaultBranch(cwd) {
    Helpers.log('[checkoutDefaultBranch] ' + cwd, 1)
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
    Helpers.log('[clone] ' + cwd, 1)
    // const ALWAYS_HTTPS = true;

    if (url.split(' ').length > 2) {
      // const [rUrl, rDest] = url.split(' ');
      Helpers.error(`[tnp-helpers]incorrect clone url "${url}"`)
    }

    if (url.split(' ').length === 2) {
      const [rUrl, rDest] = url.split(' ');
      if (destinationFolderName) {
        Helpers.error(`[tnp-helpers] wrong cloning argument

        url = "${url}"
        destinationFolderName = "${destinationFolderName}"

        cant use both at the same time
        `)
      } else {
        destinationFolderName = rDest;
        url = rUrl;
      }
    }

    if (!url.endsWith('.git')) {
      url = (url + '.git')
    }

    const cloneFolderPath = path.join(
      cwd,
      (!!destinationFolderName && destinationFolderName.trim() !== '')
        ? destinationFolderName
        : path.basename(url)
    ).trim().replace('.git', '');
    // console.log({ cloneFolderPath })

    if (override) {
      Helpers.remove(cloneFolderPath)
    } else if (Helpers.exists(cloneFolderPath) && Helpers.exists(path.join(cloneFolderPath, '.git'))) {
      Helpers.warn(`Alread cloned ${path.basename(cloneFolderPath)}...`);
      return;
    }

    const commnad = url.startsWith(`https://`)
      ? `git -c http.sslVerify=false clone ${url} ${path.basename(cloneFolderPath)}`
      : `git clone ${url} ${path.basename(cloneFolderPath)}`;
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
    const packageJson = path.join(cloneFolderPath, config.file.package_json);
    // Helpers.info(packageJson)
    if (!Helpers.exists(packageJson)) {
      Helpers.info(`Recreating unexited package.json for project ${path.basename(cloneFolderPath)}..`);
      try {
        Helpers.run(`npm init -y`, { cwd: cloneFolderPath, output: false }).sync();
      } catch (error) { }
    }

  }
  //#endregion

  //#region check if there are some uncommited changes
  checkIfthereAreSomeUncommitedChange(cwd: string) {
    Helpers.log('[checkIfthereAreSomeUncommitedChange] ' + cwd, 1)
    return Helpers.git.thereAreSomeUncommitedChangeExcept([], cwd);
  }
  //#endregion

  thereAreSomeUncommitedChangeExcept(filesList: string[] = [], cwd: string) {
    Helpers.log('[thereAreSomeUncommitedChangeExcept] ' + cwd, 1)
    filesList = filesList.map(f => crossPlatformPath(f))
    try {
      const res = Helpers.run(`git ls-files --deleted --modified --others --exclude-standard`, { output: false, cwd }).sync().toString().trim();
      const list = !res ? [] : res
        .split(/\r\n|\n|\r/)
        .filter(f => {
          f = f?.trim();
          return !!f && !filesList.includes(crossPlatformPath(f));
        });

      return list.length > 0;
    } catch (error) {
      return false;
    }
  }

  //#region restore last version
  restoreLastVersion(cwd: string, localFilePath: string) {
    Helpers.log('[restoreLastVersion] ' + cwd, 1)
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
    Helpers.log('[resetFiles] ' + cwd, 1)
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
