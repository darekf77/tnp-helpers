//#region imports
import {
  _,
  path,
  fse,
  child_process,
  crossPlatformPath,
} from 'tnp-core';
import { CLI } from 'tnp-cli';
import { Helpers } from '../index';
import type { Project } from '../project';
import { config, ConfigModels } from 'tnp-config';
//#endregion


export class HelpersGit {

  //#region get last commit hash
  lastCommitHash(cwd): string {
    Helpers.log('[firedev-helpers][lastcommithash] ' + cwd, 1)
    try {
      let hash = this.isGitRepo(cwd) && child_process.execSync(`git log -1 --format="%H"`, { cwd }).toString().trim()
      return hash;
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(`[firedev-helpers][lastCommitHash] Not able to get last commit hash for repository in ${cwd}`, 1)
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
  /**
   *
   * @param cwd di
   * @param majorVersion example v1, or v2
   * @returns name of trag
   */
  lastTagNameForMajorVersion(cwd, majorVersion: string): string {
    Helpers.log('[firedev-helpers][lastTagNameForMajorVersion] ' + cwd + '  major ver:' + majorVersion);
    const tag = Helpers.git.lastTagVersionName(cwd);
    if (!tag) {
      return void 0;
    }
    // git describe --match "v1.1.*" --abbrev=0 --tags $(git rev-list --tags --max-count=1)
    let tagName = void 0 as string;
    const cm1 = `git describe --match "v${majorVersion.toString().replace('v', '')}.*" `
      + `--abbrev=0 `;
    const cm2 = `git describe --match "v${majorVersion.toString().replace('v', '')}.*" `
      + `--abbrev=0 --tags $(git rev-list --tags --max-count=1)`;

    const cm3 = `git describe --match "${majorVersion.toString().replace('v', '')}.*" `
      + `--abbrev=0`;
    const cm4 = `git describe --match "${majorVersion.toString().replace('v', '')}.*" `
      + `--abbrev=0 --tags $(git rev-list --tags --max-count=1)`
    // console.log({
    //   cm1, cm2, cm3, cm4
    // })

    try {
      if (process.platform === 'win32') {
        tagName = child_process.execSync(cm1, { cwd }).toString().trim();
      } else {
        tagName = child_process.execSync(cm2, { cwd }).toString().trim();
      }

      if (tagName) {
        return tagName;
      }
    } catch (e) { }
    try {
      if (process.platform === 'win32') {
        tagName = child_process.execSync(cm3, { cwd }).toString().trim()
      } else {
        tagName = child_process.execSync(cm4, { cwd }).toString().trim()
      }

      if (tagName) {
        return tagName;
      }
    } catch (e) { }
    return void 0;
  }
  //#endregion


  //#region get last tag hash
  lastTagHash(cwd): string {
    Helpers.log('[firedev-helpers][lastTagHash] ' + cwd, 1)
    try {

      const tag = Helpers.git.lastTagVersionName(cwd);
      if (!tag) {
        return null;
      }
      let hash = child_process.execSync(`git log -1 --format=format:"%H" ${tag}`, { cwd }).toString().trim()
      return hash;
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(`[firedev-helpers][lastCommitHash] Not able to get last commit hash for repository in ${cwd}`, 1)
      return null;

    }
  }
  //#endregion

  //#region get last commit date
  lastCommitDate(cwd: string): Date {
    Helpers.log('[firedev-helpers][lastCommitDate] ' + cwd, 1)
    try {
      let unixTimestamp = this.isGitRepo(cwd)
        && child_process
          .execSync(`git log -1 --pretty=format:%ct`, { cwd })
          .toString()
          .trim()

      return new Date(Number(unixTimestamp) * 1000)
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(`[firedev-helpers][lastCommitDate] Cannot counts commits in branch in: ${cwd}`, 1)
      return null;
    }
  }
  //#endregion

  //#region get last commit date
  lastCommitMessage(cwd): string {
    Helpers.log('[firedev-helpers][lastCommitMessage] ' + cwd, 1)
    try {

      let unixTimestamp = child_process.execSync(`git log -1 --pretty=%B`, { cwd }).toString().trim()
      return unixTimestamp;
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(`[firedev-helpers]lastCommitMessage] Cannot display last commit message in branch in: ${cwd}`, 1)
      return null;
    }
  }
  //#endregion

  //#region get number of commit in repository
  countCommits(cwd: string) {
    Helpers.log('[firedev-helpers][countCommits] ' + cwd, 1)
    if (!Helpers.git.hasAnyCommits(cwd)) {
      return 0;
    }
    try {
      Helpers.log('[firedev-helpers] RUNNING COUNT COMMITS')
      // git rev-parse HEAD &> /dev/null check if any commits
      let currentLocalBranch = this.currentBranchName(cwd);
      let value = Number(this.isGitRepo(cwd) && Helpers
        .commnadOutputAsString(`git rev-list --count ${currentLocalBranch}`, cwd).trim())

      return !isNaN(value) ? value : 0;
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(`[firedev-helpers][countCommits] Cannot counts commits in branch in: ${cwd}`, 1)
      return 0;
    }
  }
  //#endregion

  //#region get number of commit in repository
  hasAnyCommits(cwd: string) {
    Helpers.log('[firedev-helpers][hasAnyCommits] ' + cwd, 1)
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

  //#region get number of commit in repository
  isInMergeProcess(cwd: string) {
    Helpers.log('[firedev-helpers][hasAnyCommits] ' + cwd, 1)
    try {
      const message = (child_process.execSync(`git status`, { cwd }) || '').toString().trim()
      return message.search('Unmerged paths:') !== -1;
    } catch (e) {
      return false
    }
  }
  //#endregion

  //#region get branches names
  getBranchesNames(cwd: string, pattern?: string | RegExp): string[] {
    Helpers.log('[firedev-helpers][getBranchesNames] ' + cwd, 1)
    try {
      let branchPattern = pattern;
      if (_.isString(pattern)) {
        branchPattern = new RegExp(pattern.replace(/[^a-zA-Z0-9]+/g, '.*'));
      }
      const command = `git branch -a`;
      // console.log({ command, cwd })
      const branchNames = Helpers.commnadOutputAsString(command, cwd, {
        biggerBuffer: true,
        showWholeCommandNotOnlyLastLine: true,
      })
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
      Helpers.log('[firedev-helpers][getBranchesNames] not able to get branches names');
      return [];
    }
  }
  //#endregion


  //#region get current branch name
  currentBranchName(cwd) {
    Helpers.log('[firedev-helpers][currentBranchName] ' + cwd, 1)
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
    Helpers.log('[firedev-helpers][commitWhatIs]')
    try {
      Helpers.run(`git add --all . `, { cwd }).sync()
    } catch (error) {
      Helpers.warn(`Failed to git add --all .`);
    }

    try {
      Helpers.run(`git commit -m "${customMessage}"`, { cwd }).sync()
    } catch (error) {
      Helpers.warn(`[firedev-helpers][git][commitWhatIs] Failed to git commit -m "${customMessage}"`);
    }
  }
  //#endregion

  //#region commit
  commit(cwd: string, ProjectClass: typeof Project, args?: string) {
    Helpers.log('[firedev-helpers][commit] ' + cwd, 1)
    if (!_.isString(args)) {
      args = 'update'
    }

    const gitRootProject = ProjectClass.nearestTo(cwd, { findGitRoot: true });
    try {
      Helpers.info(`[firedev-helpers][git][commit] Adding current git changes in git root:
        ${gitRootProject.location}
        `)
      gitRootProject.run(`git add --all . `).sync()
    } catch (error) {
      Helpers.log(error)
      Helpers.warn(`[firedev-helpers][commit] Failed to 'git add --all .' in:
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
      Helpers.info(`[firedev-helpers][git][commit] trying to commit what it with argument:
      "${args}"
      location: ${cwd}
      `)
      var cmdddd = `git commit --no-verify ${args}`;
      Helpers.run(cmdddd, { cwd }).sync()
    } catch (error) {
      Helpers.log(error)
      Helpers.log(`[firedev-helpers][git][commit] not able to commit what is with command: ${cmdddd}`);
    }
  }
  //#endregion

  //#region get remote origin
  /**
   * example: https://github.com/darekf77/tnp-helpers.git
   *
   * Note: address ends with .git always
   *
   */
  getOriginURL(cwd: string, differentOriginName = '') {
    Helpers.log('[firedev-helpers][getOriginURL] ' + cwd, 1)
    if (!this.isGitRepo(cwd)) {
      return;
    }
    let url = '';
    try {
      // git config --get remote.origin.url
      url = Helpers.run(`git config --get remote.${differentOriginName ? differentOriginName : 'origin'}.url`,
        { output: false, cwd }).sync().toString().trim()
    } catch (error) {
      console.log(error)
      return void 0;
    }
    if (!url.endsWith('.git')) {
      return `${url}.git`;
    }
    return url;
  }
  //#endregion

  //#region is git root
  isGitRoot(cwd: string) {
    Helpers.log('[firedev-helpers][isGitRoot] ' + cwd, 1);
    if (!fse.existsSync(crossPlatformPath([cwd, '.git']))) {
      return false;
    }
    Helpers.log('[firedev-helpers][isGitRepo] ' + cwd, 1)

    try {
      var rootGitCwd = Helpers.run('git rev-parse --show-toplevel',
        {
          biggerBuffer: false,
          cwd,
          output: false
        }).sync()?.toString()?.trim();
      // console.log({
      //   rootGitCwd,
      //   cwd
      // })
      return rootGitCwd && (crossPlatformPath(rootGitCwd) === crossPlatformPath(cwd));
    } catch (e) {
      return false;
    }
  }
  //#endregion

  //#region is git repo
  isGitRepo(cwd: string) {
    Helpers.log('[firedev-helpers][isGitRepo] ' + cwd, 1)
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
    Helpers.log('[firedev-helpers][pull] ' + cwd, 1)
    child_process.execSync(`git pull --tags --rebase origin ${branchName}`, { cwd });
  }

  //#region pull current branch
  async pullBranch(branchName: string, cwd: string, askToRetry = false) {
    Helpers.log('[firedev-helpers][pullBranch] ' + cwd, 1)
    if (this.getOriginURL(cwd) === '') {
      Helpers.warn(`Not pulling branch without `
        + `remote origin url.... in folder ${path.basename(cwd)}`);
      return;
    }
    Helpers.info(`[firedev-helpers] Pulling git changes in "${cwd}" , origin=${Helpers.git.getOriginURL(cwd)} `)
    try {
      Helpers.git.pull(branchName, cwd);
      Helpers.info(`[firedev-helpers] Branch "${branchName}" updated successfully in ${path.basename(cwd)}`)
    } catch (e) {
      // console.log(e)
      Helpers.error(`[firedev-helpers] Cannot update current branch in: ${cwd}`, askToRetry, true)
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
    Helpers.log('[firedev-helpers][pullCurrentBranch] ' + cwd, 1)
    if (global['tnpNonInteractive']) {
      askToRetry = false;
    }
    Helpers.log(`askToRetry: ${askToRetry}`)
    if (this.getOriginURL(cwd) === '') {
      Helpers.warn(`Not pulling branch without `
        + `remote origin url.... in folder ${path.basename(cwd)}`);
      return;
    }
    Helpers.info(`[firedev-helpers] Pulling git changes in "${cwd}", origin=${Helpers.git.getOriginURL(cwd)}  `)
    try {

      let currentLocalBranch = child_process.execSync(`git branch | sed -n '/\* /s///p'`, { cwd }).toString().trim()
      Helpers.git.pull(currentLocalBranch, cwd);
      Helpers.info(`[firedev-helpers] Branch "${currentLocalBranch}" updated successfully in ${path.basename(cwd)}`)
    } catch (e) {
      // console.log(e)
      Helpers.error(`[firedev-helpers] Cannot update current branch in: ${cwd}`, askToRetry, true)
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
    Helpers.log('[firedev-helpers][pushCurrentBranch] ' + cwd, 1)
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
        Helpers.error(`[firedev-helpers] Not able to push branch ${currentBranchName} in (origin=${origin}):
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
  clone({ cwd, url, destinationFolderName = '', throwErrors, override }: {
    cwd: string;
    url: string;
    destinationFolderName?: string;
    throwErrors?: boolean;
    override?: boolean;
  }) {
    cwd = crossPlatformPath(cwd);
    if (!Helpers.exists(cwd)) {
      try {
        Helpers.mkdirp(cwd);
      } catch (error) {
        Helpers.warn(`Not able to recreate path ${cwd}`)
      }
    }
    Helpers.log('[clone] ' + cwd, 1)
    // const ALWAYS_HTTPS = true;

    if (url.split(' ').length > 2) {
      // const [rUrl, rDest] = url.split(' ');
      Helpers.error(`[firedev-helpers]incorrect clone url "${url}"`)
    }

    if (url.split(' ').length === 2) {
      const [rUrl, rDest] = url.split(' ');
      if (destinationFolderName) {
        Helpers.error(`[firedev-helpers] wrong cloning argument

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
      Helpers.warn(`[firedev-helpers] Already cloned ${path.basename(cloneFolderPath)}...`);
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
          Helpers.warn(`[firedev-helpers][git] Project not found :${url}`);
        } else {
          Helpers.error(`[firedev-helpers] Can't clone from url: ${CLI.chalk.bold(url)}..`, false, true);
        }
      }
    }
    // const packageJson = path.join(cloneFolderPath, config.file.package_json);
    // Helpers.info(packageJson)
    // if (!Helpers.exists(packageJson) && Helpers.exists(cloneFolderPath)) {
    //   Helpers.info(`[firedev-helpers] Recreating unexited package.json for project ${path.basename(cloneFolderPath)}..`);
    //   try {
    //     Helpers.run(`npm init -y`, { cwd: cloneFolderPath, output: false }).sync();
    //   } catch (error) { }
    // }

  }
  //#endregion

  //#region check if there are some uncommited changes
  checkIfthereAreSomeUncommitedChange(cwd: string) {
    Helpers.log('[firedev-helpers][checkIfthereAreSomeUncommitedChange] ' + cwd, 1)
    return Helpers.git.thereAreSomeUncommitedChangeExcept([], cwd);
  }
  //#endregion

  thereAreSomeUncommitedChangeExcept(filesList: string[] = [], cwd: string) {
    Helpers.log('[firedev-helpers][thereAreSomeUncommitedChangeExcept] ' + cwd, 1)
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
    Helpers.log('[firedev-helpers][restoreLastVersion] ' + cwd, 1)
    try {
      Helpers.info(`[firedev-helpers][git] restoring last verion of file ${path.basename(cwd)}/${localFilePath}`)
      Helpers.run(`git checkout -- ${localFilePath}`, { cwd }).sync();
    } catch (error) {
      Helpers.warn(`[firedev-helpers][git] Not able to resotre last version of file ${localFilePath}`);
    }
  }
  //#endregion

  //#region reset files
  resetFiles(cwd: string, ...relativePathes: string[]) {
    Helpers.log('[firedev-helpers][resetFiles] ' + cwd, 1)
    relativePathes.forEach(p => {
      try {
        Helpers.run(`git checkout HEAD -- ${p}`, { cwd }).sync()
      } catch (err) {
        Helpers.error(`[firedev-helpers][git] Not able to reset files: ${p} inside project ${path.basename(cwd)}.`
          , true, true)
      }
    });
  }
  //#endregion

  /**
   *
   * @param cwd
   * @returns absolute pathes to stages files
   */
  stagedFiles(cwd: string): string[] {
    cwd = crossPlatformPath(cwd).replace(/\/$/, '');
    const command = `git diff --name-only --cached`.trim();
    const result = (Helpers.commnadOutputAsString(command, cwd, {
      showWholeCommandNotOnlyLastLine: true,
    }) || '');
    return (result ? result.split('\n') : []).map(relative => {
      return crossPlatformPath([cwd, relative]);
    })
  }



}
