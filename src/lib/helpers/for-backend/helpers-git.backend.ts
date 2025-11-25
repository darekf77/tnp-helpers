//#region imports
import * as ini from 'ini';
import simpleGit from 'simple-git';
import { config } from 'tnp-core/src';
import {
  _,
  path,
  rimraf,
  fse,
  child_process,
  crossPlatformPath,
  dateformat,
} from 'tnp-core/src';
import { CLI, UtilsOs, UtilsTerminal } from 'tnp-core/src';

import { Helpers } from '../../index';

//#endregion

const tempGitCommitMsgFile = 'tmp-git-commit-name.txt';

export class HelpersGit {
  //#region tag and push to git repo
  async tagAndPushToGitRepo(
    cwd: string,
    options: {
      newVersion: string;
      autoReleaseUsingConfig: boolean;
      isCiProcess: boolean;
      skipTag?: boolean; // if true, it will not tag the commit
    },
  ): Promise<void> {
    //#region @backendFunc
    const { newVersion, autoReleaseUsingConfig, isCiProcess } = options;
    const tagName = `v${newVersion}`;

    this.stageAllAndCommit(cwd, `release: ${tagName}`);

    const tagMessage = 'new version ' + newVersion;
    if (!options.skipTag) {
      try {
        Helpers.run(`git tag -a ${tagName} ` + `-m "${tagMessage}"`, {
          cwd,
          output: false,
        }).sync();
      } catch (error) {
        throw new Error(`Not able to tag project`);
      }
    }
    // const lastCommitHash = this.project.git.lastCommitHash();
    // this.project.packageJson.setBuildHash(lastCommitHash);

    if (
      autoReleaseUsingConfig ||
      (await UtilsTerminal.confirm({
        message:
          `Push changes to git repo ` +
          `(${Helpers.git.getOriginURL(cwd)}#${Helpers.git.currentBranchName(cwd)}) ?`,
        defaultValue: true,
      }))
    ) {
      Helpers.log('Pushing to git repository... ');
      Helpers.log(`Git branch: ${this.currentBranchName(cwd)}`);

      if (
        !(await this.pushCurrentBranch(cwd, {
          askToRetry: !isCiProcess,
        }))
      ) {
        throw `Not able to push to git repository`;
      }
      Helpers.info('Pushing to git repository done.');
    }
    //#endregion
  }
  //#endregion

  //#region getters & methods / get all tags
  async getAllTags(cwd: string) {
    //#region @backendFunc
    const git = simpleGit(cwd);
    try {
      const tags = await git.tags();
      return tags.all; // array of tag names
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      return [];
    }
    //#endregion
  }
  //#endregion

  //#region getters & methods / is valid repo url
  isValidRepoUrl(url: string): boolean {
    const regex =
      /^([A-Za-z0-9]+@|http(|s)\:\/\/)([A-Za-z0-9.]+(:\d+)?)(?::|\/)([\d\/\w.-]+?)(\.git)?$/;
    const res = regex.test(url);
    return res;
  }
  //#endregion

  //#region getters & methods / remove tag
  removeTag(cwd: string, tagName: string) {
    //#region @backendFunc
    try {
      child_process.execSync(`git tag -d ${tagName}`, { cwd });
      Helpers.info(`Tag "${tagName}" removed successfully.`);
    } catch (error) {
      Helpers.warn(
        `[${config.frameworkName}-helpers] not able to remove tag ${tagName} in ${cwd}`,
        true,
      );
    }
    //#endregion
  }
  //#endregion

  //#region getters & methods / action mess reset git hard commit
  public get ACTION_MSG_RESET_GIT_HARD_COMMIT(): string {
    return '$$$ update $$$';
  }
  //#endregion

  //#region get last commit hash
  lastCommitHash(cwd): string {
    Helpers.log('[taon-helpers][lastcommithash] ' + cwd, 1);
    try {
      let hash =
        this.isInsideGitRepo(cwd) &&
        child_process
          .execSync(`git log -1 --format="%H"`, { cwd })
          .toString()
          .trim();
      return hash;
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(
        `[taon-helpers][lastCommitHash] Not able to get last commit hash for repository in ${cwd}`,
        1,
      );
      return null;
    }
  }
  //#endregion

  //#region get penultimate commit hash
  penultimateCommitHash(cwd): string {
    Helpers.log('[penultimateCommitHash] ' + cwd, 1);
    try {
      let hash =
        this.isInsideGitRepo(cwd) &&
        child_process
          .execSync(`git log -2 --format="%H"`, { cwd })
          .toString()
          .trim();
      return hash;
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(
        `[lastCommitHash] Not able to get last commit hash for repository in ${cwd}`,
        1,
      );
      return null;
    }
  }
  //#endregion

  //#region check tag exists
  checkTagExists(tag: string, cwd = process.cwd()): boolean {
    Helpers.log('[checkTagExists] ' + cwd, 1);
    if (!Helpers.git.hasAnyCommits(cwd)) {
      return false;
    }
    const command = `git show-ref --tags ${tag}`.trim();
    const result = (Helpers.commandOutputAsString(command, cwd) || '') !== '';
    return result;
  }
  //#endregion

  //#region get last tag version name
  lastTagVersionName(cwd: string): string {
    Helpers.log('[lastTagVersionName] ' + cwd, 1);
    if (!Helpers.git.hasAnyCommits(cwd)) {
      return '';
    }
    try {
      if (process.platform === 'win32' && UtilsOs.isRunningInWindowsCmd()) {
        let tagOnCMd = Helpers.commandOutputAsString(
          `for /f %i in ('git rev-list --tags --max-count=1') do @git describe --tags %i`,
        );
        console.log({ tagOnCMd });
        tagOnCMd = tagOnCMd.toString().trim();
        return tagOnCMd ? tagOnCMd : '';
      }

      const latestCommit = Helpers.commandOutputAsString(
        `git rev-list --tags --max-count=1`,
        cwd,
      )
        .toString()
        .trim();

      if (!latestCommit) {
        return '';
      }

      const tag = Helpers.commandOutputAsString(
        `git describe --tags ${latestCommit}`,
        cwd,
      )
        .toString()
        .trim();

      if (!tag) {
        return '';
      }
      return tag;
    } catch (e) {
      Helpers.warn(
        `[lastCommitHash] Not able to get last commit version name for repository in ${cwd}`,
        false,
      );
      return '';
    }
  }
  //#endregion

  //#region get last tag hash
  /**
   *
   * @param cwd di
   * @param majorVersion example v1, or v2
   * @returns name of trag
   */
  lastTagNameForMajorVersion(cwd, majorVersion: string): string {
    Helpers.log(
      '[taon-helpers][lastTagNameForMajorVersion] ' +
        cwd +
        '  major ver:' +
        majorVersion,
    );
    const tag = Helpers.git.lastTagVersionName(cwd);
    if (!tag) {
      return '';
    }
    // git describe --match "v1.1.*" --abbrev=0 --tags $(git rev-list --tags --max-count=1)
    let tagName: string;
    const cm1 =
      `git describe --match "v${majorVersion.toString().replace('v', '')}.*" ` +
      `--abbrev=0 `;
    const cm2 =
      `git describe --match "v${majorVersion.toString().replace('v', '')}.*" ` +
      `--abbrev=0 --tags $(git rev-list --tags --max-count=1)`;

    const cm3 =
      `git describe --match "${majorVersion.toString().replace('v', '')}.*" ` +
      `--abbrev=0`;
    const cm4 =
      `git describe --match "${majorVersion.toString().replace('v', '')}.*" ` +
      `--abbrev=0 --tags $(git rev-list --tags --max-count=1)`;
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
    } catch (e) {}
    try {
      if (process.platform === 'win32') {
        tagName = child_process.execSync(cm3, { cwd }).toString().trim();
      } else {
        tagName = child_process.execSync(cm4, { cwd }).toString().trim();
      }

      if (tagName) {
        return tagName;
      }
    } catch (e) {}
    return '';
  }
  //#endregion

  //#region get list of current git changes
  getListOfCurrentGitChanges(cwd: string): {
    modified: string[];
    deleted: string[];
    created: string[];
  } {
    //#region @backendFunc
    try {
      // Execute git status command to get the list of changes
      const output = Helpers.commandOutputAsString(
        'git status --porcelain',
        cwd,
        {
          biggerBuffer: true,
        },
      );

      // Split the output into lines
      const lines = output.trim().split('\n');

      // Initialize arrays to hold modified, deleted, and untracked files
      let modifiedFiles = [] as string[];
      let deletedFiles = [] as string[];
      let createdFiles = [] as string[];

      // Process each line to determine the type of change
      lines.forEach(line => {
        const [changeType, filePath] = line.trim().split(/\s+/);
        switch (changeType) {
          case 'M': // Modified
            modifiedFiles.push(filePath);
            break;
          case 'A': // Created (goes to added)
            modifiedFiles.push(filePath);
            break;
          case 'D': // Deleted
            deletedFiles.push(filePath);
            break;
          case '??': // Untracked (newly created)
            createdFiles.push(filePath);
            break;
          default:
            // Ignore other types of changes
            break;
        }
      });

      const fixFolders = (files: string[]) => {
        files = files.reduce((acc, curr) => {
          const newFiles = [curr];
          const fullPath = crossPlatformPath([cwd, curr]);
          if (Helpers.isFolder(fullPath)) {
            newFiles.push(
              ...Helpers.filesFrom(fullPath, true).map(f =>
                f.replace(cwd + '/', ''),
              ),
            );
          }
          return [...acc, ...newFiles];
        }, []);
        return files;
      };

      modifiedFiles = fixFolders(modifiedFiles);
      createdFiles = fixFolders(createdFiles);

      return {
        modified: modifiedFiles,
        deleted: deletedFiles,
        created: createdFiles,
      };
    } catch (error) {
      Helpers.error('[taon-helpers][git] Error:' + error.message, false, true);
    }
    //#endregion
  }
  //#endregion

  //#region get last tag hash
  lastTagHash(cwd: string): string {
    Helpers.log('[taon-helpers][lastTagHash] ' + cwd, 1);
    try {
      const tag = Helpers.git.lastTagVersionName(cwd);
      if (!tag) {
        return '';
      }
      let hash = child_process
        .execSync(`git log -1 --format=format:"%H" ${tag}`, { cwd })
        .toString()
        .trim();
      return hash;
    } catch (e) {
      Helpers.logWarn(
        `[taon-helpers][lastCommitHash] ` +
          `Not able to get last commit hash for repository in ${cwd}`,
      );
      return '';
    }
  }
  //#endregion

  //#region get last commit date
  lastCommitDate(cwd: string): Date {
    Helpers.log('[taon-helpers][lastCommitDate] ' + cwd, 1);
    try {
      let unixTimestamp =
        this.isInsideGitRepo(cwd) &&
        child_process
          .execSync(`git log -1 --pretty=format:%ct`, { cwd })
          .toString()
          .trim();

      return new Date(Number(unixTimestamp) * 1000);
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(
        `[taon-helpers][lastCommitDate] Cannot counts commits in branch in: ${cwd}`,
        1,
      );
      return null;
    }
  }
  //#endregion

  //#region get commit message by hash
  async getCommitMessageByHash(cwd: string, hash: string): Promise<string> {
    //#region @backendFunc
    try {
      const git = simpleGit(cwd);

      const log = await git.log({
        // from: hash.trim(), TODO this is not working with "to" ... very weird
        // to: hash.trim(), // TODO this is not working with "from" ... very weird
      });
      if (log.total === 0) {
        console.warn(
          `[taon-helpers][getCommitMessageByHash] No commit found with hash "${hash}"`,
        );
        return '';
      }
      return log.all.find(f => f.hash === hash)?.message || '';
    } catch (error) {
      console.error('Error getting commit message by hash:', error);
      throw error;
    }
    //#endregion
  }
  //#endregion

  //#region get commit message by index
  /**
   * Get commit message by index
   * @param cwd string
   * @param index zero means last commit
   */
  async getCommitMessageByIndex(cwd: string, index: number): Promise<string> {
    //#region @backendFunc
    try {
      const git = simpleGit(cwd);

      // Get the list of commits with their messages
      const log = await git.log();

      // Reverse the array to handle zero-based index from the last commit
      const commitMessages = log.all;

      if (index < 0 || index >= commitMessages.length) {
        console.warn(
          `[taon-helpers][getCommitMessageByIndex] Index (${index}) out of bounds`,
        );
        return '';
      }

      // Return the commit message by index
      return commitMessages[index].message;
    } catch (error) {
      console.error('Error:', error);
      return '';
    }
    //#endregion
  }
  //#endregion

  //#region get commit hash by index
  /**
   * Get commit message by index
   * @param cwd string
   * @param index zero means last commit
   */
  async getCommitHashByIndex(cwd: string, index: number): Promise<string> {
    //#region @backendFunc
    try {
      const git = simpleGit(cwd);

      // Get the list of commits with their messages
      const log = await git.log();

      // Reverse the array to handle zero-based index from the last commit
      const commits = log.all;

      if (index < 0 || index >= commits.length) {
        console.warn(
          `[taon-helpers][getCommitMessageByIndex] Index (${index}) out of bounds`,
        );
        return '';
      }

      // Return the commit message by index
      return commits[index].hash;
    } catch (error) {
      console.error('Error:', error);
      return '';
    }
    //#endregion
  }
  //#endregion

  //#region get last commit date
  lastCommitMessage(cwd): string {
    Helpers.log('[taon-helpers][lastCommitMessage] ' + cwd, 1);
    try {
      let unixTimestamp = child_process
        .execSync(`git log -1 --pretty=%B`, { cwd })
        .toString()
        .trim();
      return unixTimestamp;
    } catch (e) {
      Helpers.log(e, 1);
      Helpers.log(
        `[taon-helpers]lastCommitMessage] Cannot display last commit message in branch in: ${cwd}`,
        1,
      );
      return null;
    }
  }
  //#endregion

  //#region get penultimate commit message
  async penultimateCommitMessage(cwd: string): Promise<string> {
    return await this.getCommitMessageByIndex(cwd, 1);
  }
  //#endregion

  //#region get number of commit in repository
  countCommits(cwd: string): number {
    Helpers.log('[taon-helpers][countCommits] ' + cwd, 1);
    if (!Helpers.git.hasAnyCommits(cwd)) {
      return 0;
    }
    try {
      Helpers.log('[taon-helpers] RUNNING COUNT COMMITS');
      // git rev-parse HEAD &> /dev/null check if any commits
      let currentLocalBranch = this.currentBranchName(cwd);
      let value = Number(
        this.isInsideGitRepo(cwd) &&
          Helpers.commandOutputAsString(
            `git rev-list --count ${currentLocalBranch}`,
            cwd,
          ).trim(),
      );

      return !isNaN(value) ? value : 0;
    } catch (e) {
      Helpers.logWarn(
        `[taon-helpers][countCommits] Cannot counts commits in branch in: ${cwd}`,
      );
      return 0;
    }
  }
  //#endregion

  //#region get number of commit in repository
  hasAnyCommits(cwd: string) {
    // con.log('[taon-helpers][hasAnyCommits] ' + cwd, 1)
    try {
      if (process.platform === 'win32') {
        Helpers.run('git rev-parse HEAD', {
          cwd,
          silence: true,
          output: false,
        }).sync();
        // child_process.execSync('git rev-parse HEAD', { cwd, stdio: ['pipe',] }).toString().trim()
      } else {
        Helpers.run('git rev-parse HEAD &> /dev/null', {
          cwd,
          silence: true,
          output: false,
        }).sync();
      }
      return true;
    } catch (e) {
      return false;
    }
  }
  //#endregion

  //#region get number of commit in repository
  isInMergeProcess(cwd: string) {
    Helpers.log('[taon-helpers][hasAnyCommits] ' + cwd, 1);
    try {
      const message = (child_process.execSync(`git status`, { cwd }) || '')
        .toString()
        .trim();
      return message.search('Unmerged paths:') !== -1;
    } catch (e) {
      return false;
    }
  }
  //#endregion

  //#region get branches names
  getBranchesNames(cwd: string, pattern?: string | RegExp): string[] {
    Helpers.log('[taon-helpers][getBranchesNames] ' + cwd, 1);
    try {
      let branchPattern = pattern;
      if (_.isString(pattern)) {
        branchPattern = new RegExp(pattern.replace(/[^a-zA-Z0-9]+/g, '.*'));
      }
      const command = `git branch -a`;
      // console.log({ command, cwd })
      const branchNamesFromStdout = Helpers.commandOutputAsString(
        command,
        cwd,
        {
          biggerBuffer: true,
        },
      );
      // console.log({ branchPattern, branchNamesFromStdout });

      const branchNamesFiltered = branchNamesFromStdout
        .toString()
        .trim()
        .split('\n')
        .map(l => l.replace('*', '').replace(`remotes/origin/`, '').trim())
        .filter(l => {
          if (l.includes('->')) {
            return false;
          }
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
      // console.log({ _branchNames: branchNamesFiltered });
      return branchNamesFiltered;
    } catch (e) {
      Helpers.log(e);
      Helpers.log(
        '[taon-helpers][getBranchesNames] not able to get branches names',
      );
      return [];
    }
  }
  //#endregion

  //#region get all origins

  allOrigins(cwd: string): { origin: string; url: string }[] {
    // Determine the path to the .git/config file

    const gitConfigPath = crossPlatformPath([cwd, '.git', 'config']);

    // Read the contents of the .git/config file synchronously
    try {
      const configFile = fse.readFileSync(gitConfigPath, 'utf-8');
      const config = ini.parse(configFile);

      // Extract remotes from the config object
      const remotes = Object.keys(config)
        .filter(key => key.startsWith('remote '))
        .map(remoteKey => {
          const name = remoteKey.split('"')[1]; // Parse out the name from the section key
          const url = config[remoteKey].url;
          return { origin: name, url };
        });

      return remotes;
    } catch (error) {
      return [];
    }
  }
  //#endregion

  //#region get current branch name
  currentBranchName(cwd: string): string {
    Helpers.log('[taon-helpers][currentBranchName] ' + cwd, 1);
    try {
      const branchName = child_process
        .execSync(`git rev-parse --abbrev-ref HEAD`, { cwd })
        .toString()
        .trim();
      return branchName;
    } catch (e) {
      return '';
    }
  }
  //#endregion

  //#region commit "what is"
  stageAllAndCommit(cwd: string, commitMessage?: string): void {
    this.stageAllFiles(cwd);
    this.commit(cwd, commitMessage);
  }
  //#endregion

  //#region commit
  commit(cwd: string, commitMessage?: string): void {
    Helpers.log('[taon-helpers][commit] ' + cwd, 1);
    if (!_.isString(commitMessage)) {
      commitMessage = 'update';
    }

    const tempCommitnameFile = crossPlatformPath([cwd, tempGitCommitMsgFile]);
    Helpers.writeFile(tempCommitnameFile, commitMessage);

    try {
      Helpers.info(`[taon-helpers][git][commit] trying to commit what it with argument:
      "${commitMessage}"
      location: ${cwd}
      `);
      var commandToExecute = `git commit --no-verify -F "${tempCommitnameFile}"`;
      // Helpers.info(`COMMITING WITH COMMAND: ${commandToExecute}`);
      // process.exit(0)
      Helpers.run(commandToExecute, { cwd }).sync();
      Helpers.removeFileIfExists(tempCommitnameFile);
    } catch (error) {
      Helpers.log(error);
      Helpers.removeFileIfExists(tempCommitnameFile);
      Helpers.log(
        `[taon-helpers][git][commit] not able to commit with command: ${commandToExecute}`,
      );
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
  getOriginURL(cwd: string, differentOriginName = ''): string {
    Helpers.log('[taon-helpers][getOriginURL] ' + cwd, 1);
    if (!this.isInsideGitRepo(cwd)) {
      return '';
    }
    let url = '';
    try {
      // git config --get remote.origin.url
      url = Helpers.commandOutputAsString(
        `git config --get remote.${
          differentOriginName ? differentOriginName : 'origin'
        }.url`,
        cwd,
        {
          biggerBuffer: false,
        },
      )
        .toString()
        .trim();
    } catch (error) {
      return '';
    }
    if (!url.endsWith('.git')) {
      return `${url}.git`;
    }
    return url;
  }
  //#endregion

  //#region find git root
  findGitRoot(cwd: string) {
    if (this.isGitRoot(cwd)) {
      return cwd;
    }

    let absoluteLocation = crossPlatformPath(cwd);
    let previousLocation: string;
    if (fse.existsSync(absoluteLocation)) {
      absoluteLocation = fse.realpathSync(absoluteLocation);
    }
    if (
      fse.existsSync(absoluteLocation) &&
      !fse.lstatSync(absoluteLocation).isDirectory()
    ) {
      absoluteLocation = path.dirname(absoluteLocation);
    }

    while (true) {
      if (
        path.basename(path.dirname(absoluteLocation)) ===
        config.folder.node_modules
      ) {
        absoluteLocation = path.dirname(path.dirname(absoluteLocation));
      }
      if (this.isGitRoot(absoluteLocation)) {
        break;
      }
      previousLocation = absoluteLocation;
      const newAbsLocation = path.join(absoluteLocation, '..');
      if (!path.isAbsolute(newAbsLocation)) {
        return;
      }
      absoluteLocation = crossPlatformPath(path.resolve(newAbsLocation));
      if (
        !fse.existsSync(absoluteLocation) &&
        absoluteLocation.split('/').length < 2
      ) {
        return;
      }
      if (previousLocation === absoluteLocation) {
        return;
      }
    }
    return absoluteLocation;
  }
  //#endregion

  //#region is git root
  isGitRoot(cwd: string): boolean {
    Helpers.log('[taon-helpers][isGitRoot] ' + cwd, 1);
    if (!fse.existsSync(crossPlatformPath([cwd, '.git']))) {
      return false;
    }
    Helpers.log('[taon-helpers][isGitRepo] ' + cwd, 1);

    try {
      var rootGitCwd = Helpers.run('git rev-parse --show-toplevel', {
        biggerBuffer: false,
        cwd,
        output: false,
      })
        .sync()
        ?.toString()
        ?.trim();
      // console.log({
      //   rootGitCwd,
      //   cwd
      // })
      return (
        rootGitCwd && crossPlatformPath(rootGitCwd) === crossPlatformPath(cwd)
      );
    } catch (e) {
      return false;
    }
  }
  //#endregion

  //#region is git repo
  isInsideGitRepo(cwd: string): boolean {
    Helpers.log('[taon-helpers][isGitRepo] ' + cwd, 1);
    if (!Helpers.git.hasAnyCommits(cwd)) {
      return false;
    }
    try {
      var test = Helpers.run('git rev-parse --is-inside-work-tree', {
        biggerBuffer: false,
        cwd,
        output: false,
      }).sync();
    } catch (e) {
      return false;
    }
    return !!test;
  }
  //#endregion

  //#region reset soft HEAD
  resetSoftHEAD(cwd: string, HEAD = 1): void {
    try {
      child_process.execSync(`git reset --soft HEAD~${HEAD}`, { cwd });
    } catch (error) {
      Helpers.error(
        `[${config.frameworkName}] not able to soft repository in ${self.location}`,
      );
    }
  }
  //#endregion

  //#region reset hard
  resetHard(
    cwd: string,
    options?: {
      HEAD?: number;
    },
  ): void {
    //#region @backendFunc
    const { HEAD } = options || {};
    Helpers.info(
      `[taon-helpers] [resetHard] ` +
        `${_.isNumber(HEAD) ? `HEAD~${HEAD}` : ''} ${cwd}`,
    );
    try {
      child_process.execSync(
        `git reset --hard ${_.isNumber(HEAD) ? `HEAD~${HEAD}` : ''}`,
        { cwd },
      );
    } catch (error) {
      Helpers.error(
        `[${config.frameworkName}] not able to reset repository in ${self.location}`,
      );
    }
    //#endregion
  }
  //#endregion

  //#region pull
  private _pull(
    cwd: string,
    options?: {
      branchName?: string;
      defaultHardResetCommits?: number;
    },
  ) {
    let { branchName, defaultHardResetCommits } = options || {};
    if (_.isNumber(defaultHardResetCommits)) {
      this.resetHard(cwd, { HEAD: defaultHardResetCommits });
    } else {
      this.resetHard(cwd);
    }
    child_process.execSync(`git pull --tags --rebase origin ${branchName}`, {
      cwd,
    });
  }

  async pullCurrentBranch(
    cwd: string,
    options?: {
      askToRetry?: boolean;
      /**
       * default true, when false it will throw error instead process.exit(0)
       */
      exitOnError?: boolean;
      defaultHardResetCommits?: number;
    },
  ): Promise<void> {
    options = options || ({} as any);
    let { askToRetry, exitOnError } = options || {};
    if (_.isUndefined(exitOnError)) {
      options.exitOnError = true;
      exitOnError = true;
    }
    Helpers.log('[taon-helpers][pullCurrentBranch] ' + cwd, 1);
    if (global['tnpNonInteractive']) {
      askToRetry = false;
    }
    Helpers.log(`askToRetry: ${askToRetry}`);
    if (this.getOriginURL(cwd) === '') {
      Helpers.warn(
        `Not pulling branch without ` +
          `remote origin url.... in folder ${path.basename(cwd)}`,
      );
      return;
    }
    Helpers.info(
      `[taon-helpers][${dateformat(
        new Date(),
        'dd-mm-yyyy HH:MM:ss',
      )}] Pulling git changes in "${cwd}", origin=${Helpers.git.getOriginURL(
        cwd,
      )}  `,
    );
    let acknowledgeBeforePull = false;

    while (true) {
      const isSsh = Helpers.git.getOriginURL(cwd).includes('git@');

      try {
        if (acknowledgeBeforePull) {
          Helpers.pressKeyAndContinue('Press any key to continue pulling...');
        }
        let currentLocalBranch = this.currentBranchName(cwd);

        Helpers.git._pull(cwd, {
          ...options,
          branchName: currentLocalBranch,
        });
        Helpers.info(
          `[taon-helpers] Branch "${currentLocalBranch}" updated successfully in ${path.basename(
            cwd,
          )}`,
        );
        break;
      } catch (e) {
        // console.log(e)
        if (!askToRetry && exitOnError) {
          Helpers.error(
            `[taon-helpers] Cannot update current branch in: ${cwd}`,
            askToRetry,
            true,
          );
        }
        if (!askToRetry && !exitOnError) {
          throw e;
        }
        if (askToRetry) {
          //#region ask to retry question
          const pullOptions = {
            again: {
              name: 'Try pull again',
            },
            normalButSshOrHttpOrigin: {
              name: `Try pull again with ${isSsh ? 'HTTPS' : 'SSH'} origin ?`,
            },
            skip: {
              name: 'Skip pulling',
            },
            resetHardLast5Commits: {
              name: 'Reset hard last 5 commits and pull again',
            },
            openInVscode: {
              name: 'Open project in VSCode',
            },
            exit: {
              name: 'Exit process',
            },
          };

          const whatToDo = await UtilsTerminal.select<keyof typeof pullOptions>(
            {
              question: 'What to do ?',
              choices: pullOptions,
            },
          );
          acknowledgeBeforePull = whatToDo === 'openInVscode';

          if (whatToDo === 'normalButSshOrHttpOrigin') {
            if (isSsh) {
              await Helpers.git.changeRemoveFromSshToHttps(cwd);
            } else {
              await Helpers.git.changeRemoteFromHttpsToSSh(cwd);
            }
          }

          if (whatToDo === 'resetHardLast5Commits') {
            try {
              Helpers.git.resetHard(cwd, { HEAD: 5 });
            } catch (error) {}
            continue;
          }

          if (whatToDo === 'openInVscode') {
            try {
              Helpers.run(`code .`, { cwd }).sync();
            } catch (error) {}
            continue;
          }

          if (whatToDo === 'skip') {
            break;
          }

          if (whatToDo === 'exit') {
            process.exit(0);
          }
          //#endregion
        }
      }
    }
    Helpers.info(
      `[${dateformat(new Date(), 'dd-mm-yyyy HH:MM:ss')}] DONE PULLING`,
    );
  }
  //#endregion

  //#region melts action commits
  /**
   * Return number of melted action commits
   */
  meltActionCommits(cwd: string): number {
    let i = 0;
    while (true) {
      if (
        this.lastCommitMessage(cwd) ===
        Helpers.git.ACTION_MSG_RESET_GIT_HARD_COMMIT
      ) {
        Helpers.logInfo(
          `[${config.frameworkName}-helpers] Melting action commit #`,
        );
        Helpers.git.resetSoftHEAD(cwd, 1);
        ++i;
      } else {
        // TODO breaking cli processes - put outside this fn
        // Helpers.git.unstageAllFiles(cwd);
        return i;
      }
    }
  }
  //#endregion

  //#region push current branch
  /**
   *  TODO issue 2: Updates were rejected because the tag already exists in the remote
   * @returns info if process succeed
   */
  async pushCurrentBranch(
    cwd: string,
    options?: {
      force?: boolean;
      origin?: string;
      askToRetry?: boolean;
      forcePushNoQuestion?: boolean;
    },
  ): Promise<boolean> {
    options = options || {};
    options.origin = options.origin ? options.origin : 'origin';

    const { askToRetry, forcePushNoQuestion = false } = options;
    let { origin } = options;
    let { force } = options;
    if (force && !forcePushNoQuestion) {
      Helpers.info(`
      Pushing force branch ${this.currentBranchName(cwd)} in location

${cwd}

      `);
      if (!(await Helpers.consoleGui.question.yesNo(`Are you sure ? `))) {
        process.exit(0);
      }
    }
    Helpers.log('[taon-helpers][pushCurrentBranch] ' + cwd, 1);
    const currentBranchName = Helpers.git.currentBranchName(cwd);

    while (true) {
      const isSsh = Helpers.git
        .getOriginURL(cwd, options.origin)
        .includes('git@');

      try {
        const taskName = `
    [${dateformat(new Date(), 'dd-mm-yyyy HH:MM:ss')}]
    Pushing ${
      force ? 'FORCE' : 'NORMALLY'
    } current branch (remote=${origin}): ${currentBranchName}
    `;
        Helpers.info(taskName);
        const command = `git push ${
          force ? '-f' : ''
        } ${origin} ${currentBranchName} --tags`;
        Helpers.info(
          `[git][push] [${dateformat(new Date(), 'dd-mm-yyyy HH:MM:ss')}] ${
            force ? 'force' : 'normal'
          } pushing current branch ${currentBranchName} ,` +
            ` origin=${Helpers.git.getOriginURL(cwd, origin)}`,
        );

        Helpers.run(command, { cwd }).sync();
        Helpers.info(taskName);
        break;
      } catch (err) {
        Helpers.error(
          `[taon-helpers] Not able to push branch ${currentBranchName} in (origin=${origin}):
        ${cwd}`,
          true,
          true,
        );
        if (!askToRetry) {
          return false;
        }

        const pushOptions = {
          normal: {
            name: 'Try normal push again ?',
          },
          normalButSshOrHttpOrigin: {
            name: `Try normal ${isSsh ? 'HTTPS' : 'SSH'} origin push again ?`,
          },
          force: {
            name: 'Try again with force push ?',
          },
          skip: {
            name: 'Skip pushing',
          },
          openInVscode: {
            name: 'Open in vscode window',
          },
          exit: {
            name: 'Exit process',
          },
        };

        const whatToDo = await UtilsTerminal.select<keyof typeof pushOptions>({
          question: 'What to do ?',
          choices: pushOptions,
        });

        if (whatToDo === 'normalButSshOrHttpOrigin') {
          if (isSsh) {
            await Helpers.git.changeRemoveFromSshToHttps(cwd);
          } else {
            await Helpers.git.changeRemoteFromHttpsToSSh(cwd);
          }
        }

        if (whatToDo === 'openInVscode') {
          try {
            Helpers.run(`code .`, { cwd }).sync();
          } catch (error) {}

          continue;
        }

        if (whatToDo === 'skip') {
          return false;
        }

        if (whatToDo === 'exit') {
          process.exit(0);
        }
        force = whatToDo === 'force';
        continue;
      }
    }
    return true;
  }
  //#endregion

  //#region get default branch for repo
  defaultRepoBranch(cwd: string): string {
    //#region @backendFunc
    Helpers.log('[defaultRepoBranch] ' + cwd, 1);
    try {
      const raw = child_process
        .execSync(`git symbolic-ref refs/remotes/origin/HEAD`, { cwd })
        .toString()
        .trim();

      // Remove the prefix manually
      const prefix = 'refs/remotes/origin/';
      const defaultBranch = raw.startsWith(prefix)
        ? raw.slice(prefix.length)
        : raw;

      return defaultBranch;
    } catch (e) {
      Helpers.logWarn(`Cannot find default branch for repo in: ${cwd}`);
      return '';
    }
    //#endregion
  }
  //#endregion

  //#region checkout default branch
  checkoutDefaultBranch(cwd: string): void {
    Helpers.log('[checkoutDefaultBranch] ' + cwd, 1);
    const defaultBranch = child_process
      .execSync(
        `git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`,
        { cwd },
      )
      .toString()
      .trim();
    child_process.execSync(`git checkout ${defaultBranch}`, { cwd });
  }
  //#endregion

  //#region add
  /**
   *
   * @param cwd
   * @param optinos
   */
  stageAllFiles(cwd: string): void {
    try {
      child_process.execSync(`git add --all .`, { cwd });
    } catch (error) {}
  }
  //#endregion

  //#region add
  /**
   *
   * @param cwd
   * @param optinos
   */
  stageFile(cwd: string, fileRelativePath: string): void {
    try {
      child_process.execSync(`git add ${fileRelativePath}`, { cwd });
    } catch (error) {}
  }
  //#endregion

  //#region stash
  /**
   *
   * @param cwd
   * @param optinos
   */
  stash(
    cwd: string,
    optinos?: {
      onlyStaged?: boolean;
    },
  ): void {
    const { onlyStaged } = optinos || {};
    // console.log({ onlyStaged, cwd });
    try {
      if (onlyStaged) {
        child_process.execSync(`git stash push --staged`, { cwd });
      } else {
        child_process.execSync(`git stash -u`, { cwd });
      }
    } catch (error) {
      Helpers.info('Not able to stash changes');
      console.error(error);
    }
  }
  //#endregion

  //#region rebase
  /**
   *
   * @param cwd
   * @param optinos
   */
  rebase(cwd: string, toBranch: string): void {
    // console.log({ onlyStaged, cwd });
    try {
      child_process.execSync(`git rebase ${toBranch}`, { cwd });
    } catch (error) {
      Helpers.info('Not able to rebase');
      console.error(error);
    }
  }
  //#endregion

  //#region stash apply
  stashApply(cwd: string): void {
    try {
      child_process.execSync(`git stash apply`, { cwd });
    } catch (error) {}
  }
  //#endregion

  //#region fetch
  fetch(cwd: string, all = false): void {
    Helpers.taskStarted('Fetching git changes');
    try {
      child_process.execSync(`git fetch ${all ? '--all' : ''}`, { cwd });
    } catch (error) {
      Helpers.error('Not able to git fetch.', false, true);
    }
    Helpers.taskDone('Fetching git changes');
  }
  //#endregion

  cleanRepoFromAnyFilesExceptDotGitFolder(cwd: string): void {
    //#region @backendFunc
    const entries = fse.readdirSync(cwd);

    for (const entry of entries) {
      // Skip the .git directory
      if (entry === '.git') {
        continue;
      }

      const fullPath = crossPlatformPath([cwd, entry]);
      const stats = fse.statSync(fullPath);

      if (stats.isDirectory()) {
        try {
          // when link
          fse.unlinkSync(fullPath);
        } catch (error) {}
        // Recursively remove directories
        Helpers.remove(fullPath, true);
      } else {
        // Remove files
        try {
          fse.unlinkSync(fullPath);
        } catch (error) {}
      }
    }
    //#endregion
  }

  //#region checkout
  checkout(
    cwd,
    branchName: string,
    options?: {
      createBranchIfNotExists?: boolean;
      fetchBeforeCheckout?: boolean;
      switchBranchWhenExists?: boolean;
    },
  ): void {
    let {
      createBranchIfNotExists,
      fetchBeforeCheckout,
      switchBranchWhenExists,
    } = options || {};

    if (fetchBeforeCheckout) {
      this.fetch(cwd);
    }

    if (
      switchBranchWhenExists &&
      this.getBranchesNames(cwd, branchName).includes(branchName)
    ) {
      createBranchIfNotExists = false;
    }
    try {
      child_process.execSync(
        `git checkout ${createBranchIfNotExists ? '-b' : ''} ${branchName}`,
        { cwd },
      );
    } catch (error) {
      Helpers.error(`Not able to checkout branch: ${branchName}`, false, true);
    }
  }
  //#endregion

  //#region checkout from to
  checkoutFromTo(
    checkoutFromBranch: string,
    targetBranch: string,
    origin = 'origin',
    cwd,
  ): void {
    Helpers.log('[checkout] ' + cwd, 1);
    child_process.execSync(`git fetch`, { cwd });
    const currentBranchName = this.currentBranchName(cwd);
    if (currentBranchName === targetBranch) {
      Helpers.info('Already on proper branch.. just pulling');
      child_process.execSync(`git reset --hard`, { cwd });
      child_process.execSync(`git pull ${origin} ${checkoutFromBranch}`, {
        cwd,
      });
    } else {
      const targetBranchExists =
        this.getBranchesNames(cwd).filter(f => targetBranch === f).length > 0;
      child_process.execSync(`git reset --hard`, { cwd });
      if (currentBranchName !== checkoutFromBranch) {
        child_process.execSync(`git checkout ${checkoutFromBranch}`, { cwd });
      }
      child_process.execSync(`git pull ${origin} ${checkoutFromBranch}`, {
        cwd,
      });
      if (targetBranchExists) {
        child_process.execSync(`git checkout ${targetBranch}`, { cwd });
        child_process.execSync(`git rebase ${checkoutFromBranch}`, { cwd });
      } else {
        child_process.execSync(`git checkout -b ${targetBranch}`, { cwd });
      }
    }
  }
  //#endregion

  //#region revert file changes
  revertFileChanges(cwd, fileReletivePath: string): void {
    try {
      Helpers.run(`git checkout ${fileReletivePath}`, { cwd }).sync();
    } catch (error) {}
  }
  //#endregion

  //#region get remote provider
  /**
   * Extract the provider (github.com, gitlab.com etc.)
   * from a remote URL
   * @param cwd The current working directory
   *
   */
  getRemoteProvider(cwd: string): string {
    //#region @backendFunc
    const remoteUrl = this.getOriginURL(cwd);
    if (!remoteUrl) {
      return null;
    }
    try {
      // Handle SSH URLs like git@github.com:user/repo.git
      const sshMatch = remoteUrl.match(/^git@([^:]+):/);
      if (sshMatch) {
        return sshMatch[1];
      }

      // Handle HTTP/HTTPS URLs like https://github.com/user/repo.git
      const httpMatch = remoteUrl.match(/^https?:\/\/([^/]+)\//);
      if (httpMatch) {
        return httpMatch[1];
      }

      // Handle SSH URLs with ssh:// format
      const sshAltMatch = remoteUrl.match(/^ssh:\/\/(?:[^@]+@)?([^/]+)/);
      if (sshAltMatch) {
        return sshAltMatch[1];
      }

      return null;
    } catch (e) {
      // console.error("Failed to extract provider from remote URL:", e);
      return null;
    }
    //#endregion
  }
  //#endregion

  //#region clone
  /**
   * @returns absolute path to cloned folder
   */
  async clone({
    cwd,
    url,
    destinationFolderName = '',
    throwErrors,
    override,
  }: {
    cwd: string;
    url: string;
    destinationFolderName?: string;
    throwErrors?: boolean;
    override?: boolean;
  }): Promise<string> {
    cwd = crossPlatformPath(cwd);
    if (!Helpers.exists(cwd)) {
      try {
        Helpers.mkdirp(cwd);
      } catch (error) {
        Helpers.warn(`Not able to recreate path ${cwd}`);
      }
    }
    Helpers.log('[clone] ' + cwd, 1);
    // const ALWAYS_HTTPS = true;
    if (!url) {
      Helpers.error(`[taon-helpers] no url provided for cloning`);
    }

    if (url.split(' ').length > 2) {
      // const [rUrl, rDest] = url.split(' ');
      Helpers.error(`[taon-helpers]incorrect clone url "${url}"`);
    }

    if (url.split(' ').length === 2) {
      const [rUrl, rDest] = url.split(' ');
      if (destinationFolderName) {
        Helpers.error(`[taon-helpers] wrong cloning argument

        url = "${url}"
        destinationFolderName = "${destinationFolderName}"

        cant use both at the same time
        `);
      } else {
        destinationFolderName = rDest;
        url = rUrl;
      }
    }

    if (!url.endsWith('.git')) {
      url = url + '.git';
    }

    const cloneFolderPath = crossPlatformPath(
      path
        .join(
          cwd,
          !!destinationFolderName && destinationFolderName.trim() !== ''
            ? destinationFolderName
            : path.basename(url),
        )
        .trim()
        .replace('.git', ''),
    );
    // console.log({ cloneFolderPath })

    if (override) {
      Helpers.tryRemoveDir(cloneFolderPath);
    } else if (
      Helpers.exists(cloneFolderPath) &&
      Helpers.exists(path.join(cloneFolderPath, '.git'))
    ) {
      Helpers.warn(
        `[taon-helpers] Already cloned ${path.basename(cloneFolderPath)}...`,
      );
      return cloneFolderPath;
    }
    let isHttpCommand = url.startsWith('http://') || url.startsWith('https://');

    let command = isHttpCommand
      ? `git -c http.sslVerify=false clone ${url} ${path.basename(
          cloneFolderPath,
        )}`
      : `git clone ${url} ${path.basename(cloneFolderPath)}`;

    Helpers.info(`

    Cloning:
    ${command}

    `);
    if (throwErrors) {
      Helpers.run(command, { cwd }).sync();
    } else {
      while (true) {
        isHttpCommand = url.startsWith('http://') || url.startsWith('https://');

        command = isHttpCommand
          ? `git -c http.sslVerify=false clone ${url} ${path.basename(
              cloneFolderPath,
            )}`
          : `git clone ${url} ${path.basename(cloneFolderPath)}`;

        Helpers.info(`Cloning from url: ${CLI.chalk.bold(url)}..`);
        try {
          Helpers.run(command, { cwd, output: false }).sync();
          break;
        } catch (error) {
          if (error?.stderr?.toString()?.search('remote: Not Found') !== -1) {
            Helpers.error(
              `[taon-helpers][git] Project not found :${url}`,
              true,
              true,
            );
          } else {
            Helpers.error(
              `[taon-helpers] Can't clone from url: ${CLI.chalk.bold(url)}..`,
              true,
              true,
            );
          }
          const cloneLinkOpt = {
            again: {
              name: 'Try again',
            },
            againDif: {
              name: `Try again with ${isHttpCommand ? 'ssh' : 'http'} url`,
            },
            skip: {
              name: 'Skip cloning this repository',
            },
            exit: {
              name: 'Exit process',
            },
          };
          const res = await Helpers.consoleGui.select<
            keyof typeof cloneLinkOpt
          >('What to do?', cloneLinkOpt);
          if (res === 'again') {
            continue;
          }
          if (res === 'againDif') {
            url = isHttpCommand
              ? Helpers.git.originHttpToSsh(url)
              : Helpers.git.originSshToHttp(url);
            continue;
          }
          if (res === 'exit') {
            process.exit(0);
          }
          if (res === 'skip') {
            break;
          }
        }
      }
    }
    return cloneFolderPath;
    // const packageJson = path.join(cloneFolderPath, config.file.package_json);
    // Helpers.info(packageJson)
    // if (!Helpers.exists(packageJson) && Helpers.exists(cloneFolderPath)) {
    //   Helpers.info(`[taon-helpers] Recreating unexited package.json for project ${path.basename(cloneFolderPath)}..`);
    //   try {
    //     Helpers.run(`npm init -y`, { cwd: cloneFolderPath, output: false }).sync();
    //   } catch (error) { }
    // }
  }
  //#endregion

  //#region check if there are some uncommited changes
  checkIfthereAreSomeUncommitedChange(cwd: string): boolean {
    Helpers.log(
      '[taon-helpers][checkIfthereAreSomeUncommitedChange] ' + cwd,
      1,
    );
    return Helpers.git.thereAreSomeUncommitedChangeExcept([], cwd);
  }
  //#endregion

  //#region check if there are some uncommited changes except
  thereAreSomeUncommitedChangeExcept(
    filesList: string[] = [],
    cwd: string,
  ): boolean {
    Helpers.log('[taon-helpers][thereAreSomeUncommitedChangeExcept] ' + cwd, 1);
    filesList = filesList.map(f => crossPlatformPath(f));
    try {
      const res = Helpers.run(
        `git ls-files --deleted --modified --others --exclude-standard`,
        { output: false, cwd },
      )
        .sync()
        .toString()
        .trim();

      const list = !res
        ? []
        : res.split(/\r\n|\n|\r/).filter(f => {
            f = f?.trim();
            return !!f && !filesList.includes(crossPlatformPath(f));
          });

      return list.length > 0;
    } catch (error) {
      return false;
    }
  }
  //#endregion

  //#region check if there are some uncommited changes except
  /**
   *
   * @param cwd get current working directory
   * @returns relative pathes to uncommited files
   */
  uncommitedFiles(cwd: string): string[] {
    try {
      const res = Helpers.run(
        `git ls-files --deleted --modified --others --exclude-standard`,
        { output: false, cwd },
      )
        .sync()
        .toString()
        .trim();

      const list = !res
        ? []
        : res.split(/\r\n|\n|\r/).filter(f => {
            f = f?.trim();
            return !!f;
          });
      return list;
    } catch (error) {
      return [];
    }
  }
  //#endregion

  //#region restore last version
  restoreLastVersion(cwd: string, relativeFilePath: string): void {
    Helpers.log('[taon-helpers][restoreLastVersion] ' + cwd, 1);
    if (!Helpers.exists([cwd, relativeFilePath])) {
      return;
    }
    try {
      Helpers.log(
        `[taon-helpers][git] restoring last verion of file ${path.basename(
          cwd,
        )}/${relativeFilePath}`,
      );
      Helpers.run(`git checkout -- ${relativeFilePath}`, { cwd }).sync();
    } catch (error) {
      Helpers.warn(
        `[taon-helpers][git] Not able to resotre last version of file ${relativeFilePath}`,
      );
    }
  }
  //#endregion

  //#region reset files
  resetFiles(cwd: string, ...relativePathes: string[]): void {
    Helpers.log('[taon-helpers][resetFiles] ' + cwd, 1);
    relativePathes.forEach(p => {
      try {
        Helpers.run(`git checkout HEAD -- ${p}`, { cwd }).sync();
      } catch (err) {
        Helpers.error(
          `[taon-helpers][git] Not able to reset files: ${p} inside project ${path.basename(
            cwd,
          )}.`,
          true,
          true,
        );
      }
    });
  }
  //#endregion

  //#region get list of staged files
  /**
   * By default return Absolute pathes to staged files
   *
   * @param cwd
   * @returns (absolute pathes to stages files
   */
  stagedFiles(cwd: string, outputRelatieve = false): string[] {
    cwd = crossPlatformPath(cwd).replace(/\/$/, '');
    const command = `git diff --name-only --cached`.trim();
    const result = Helpers.commandOutputAsString(command, cwd, {}) || '';
    return (result ? result.split('\n') : []).map(relative => {
      if (outputRelatieve) {
        return crossPlatformPath(relative);
      }
      return crossPlatformPath([cwd, relative]);
    });
  }
  //#endregion

  //#region get list of changes files from commit
  async getChangedFiles(cwd: string, commitHash: string): Promise<string[]> {
    const output = await Helpers.commandOutputAsStringAsync(
      'git diff-tree --no-commit-id --name-only -r ${commitHash}',
      cwd,
    );
    const changedFiles = output.trim().split('\n');
    return changedFiles;
  }
  //#endregion

  //#region get orign ssh from origin http
  originHttpToSsh(originHttp: string, verbose = false): string {
    if (!originHttp) {
      Helpers.warn(
        `[${config.frameworkName}-helpers][originHttpToSsh] originHttp is empty or undefined`,
      );
      return originHttp;
    }
    const httpsPattern = /^https:\/\/(.+?)\/(.+?\/.+?)(\.git)?$/;
    const match = originHttp.match(httpsPattern);

    if (originHttp === 'undefined' || _.isNil(originHttp)) {
      Helpers.error(
        '[taon-helpers][originHttpToSsh] Origin URL is not defined',
      );
      return originHttp;
    }
    if (!match) {
      verbose &&
        Helpers.warn(
          'The current remote URL is not in HTTPS format:' + originHttp,
        );
      return originHttp;
    }

    const host = match[1];
    const repoPath = match[2];
    const sshUrl = `git@${host}:${repoPath}.git`;
    return sshUrl;
  }
  //#endregion

  //#region change remote from https to  ssh
  async changeRemoteFromHttpsToSSh(
    cwd: string,
    diffrentOriginName: string = 'origin',
  ): Promise<void> {
    try {
      const currentUrl =
        (await this.getOriginURL(cwd, diffrentOriginName)) || '';

      const sshUrl = this.originHttpToSsh(currentUrl);
      await Helpers.run(`git remote set-url ${diffrentOriginName} ${sshUrl}`, {
        cwd,
      }).sync();
      console.log('Remote URL has been changed to:', sshUrl);
    } catch (error) {
      console.error('Failed to change remote URL:', error);
    }
  }
  //#endregion

  //#region get http origin from ssh origin
  originSshToHttp(originSsh: string, verbose = false): string {
    if (!originSsh) {
      Helpers.warn(
        `[${config.frameworkName}-helpers][originSshToHttp] originSsh is empty or undefined`,
      );
      return originSsh;
    }
    const sshPattern = /^git@(.+?):(.+?\/.+?)(\.git)?$/;
    const match = originSsh.match(sshPattern);

    if (originSsh === 'undefined' || _.isNil(originSsh)) {
      Helpers.error(
        '[taon-helpers][originSshToHttp] Origin URL is not defined',
      );
      return originSsh;
    }

    if (!match) {
      verbose &&
        Helpers.warn(
          'The current remote URL is not in SSH format:' + originSsh,
        );
      return originSsh;
    }

    const host = match[1];
    const repoPath = match[2];
    const httpsUrl = `https://${host}/${repoPath}.git`;
    return httpsUrl;
  }
  //#endregion

  //#region change remote from ssh to https
  async changeRemoveFromSshToHttps(
    cwd: string,
    diffrentOriginName: string = 'origin',
  ): Promise<void> {
    try {
      const currentUrl =
        (await this.getOriginURL(cwd, diffrentOriginName)) || '';

      const httpsUrl = this.originSshToHttp(currentUrl);
      await Helpers.run(`git remote set-url origin ${httpsUrl}`, {
        cwd,
      }).sync();
      console.log('Remote URL has been changed to:', httpsUrl);
    } catch (error) {
      console.error('Failed to change remote URL:', error);
    }
  }
  //#endregion

  //#region unstage all files
  unstageAllFiles(cwd: string): void {
    try {
      Helpers.run(`git reset HEAD -- .`, { cwd }).sync();
    } catch (error) {}
  }
  //#endregion

  //#region get fils change in commit by hash
  /**
   * Get the list of files changed in a specific commit by its hash.
   * @param {string} hash - The hash of the commit.
   * @returns {Promise<string[]>} - A promise that resolves to an array of file paths.
   */
  async getChangedFilesInCommitByHash(
    cwd: string,
    hash: string,
  ): Promise<string[]> {
    //#region @backendFunc
    try {
      const git = simpleGit(cwd);
      const diffSummary = await git.diffSummary([`${hash}^!`]);
      return diffSummary.files.map(file => file.file);
    } catch (error) {
      console.error('Error getting changed files by hash:', error);
      throw error;
    }
    //#endregion
  }
  //#endregion

  //#region get fils change in commit by index
  /**
   * Get the list of files changed in a specific commit by its index in the commit history.
   * Index 0 refers to the last commit.
   * @param {number} index - The index of the commit.
   * @returns {Promise<string[]>} - A promise that resolves to an array of file paths.
   */
  async getChangedFilesInCommitByIndex(
    cwd: string,
    index: number,
  ): Promise<string[]> {
    //#region @backendFunc
    try {
      const git = simpleGit(cwd);
      const log = await git.log();
      if (index >= log.total) {
        console.warn(
          '[taon-helpers][getChangedFilesInCommitByIndex] Index out of range',
        );
        return [];
      }
      const hash = log.all[index].hash;
      return this.getChangedFilesInCommitByHash(cwd, hash);
    } catch (error) {
      console.error('Error getting changed files by index:', error);
      throw error;
    }
    //#endregion
  }
  //#endregion

  //#region get changes summary
  async changesSummary(cwd: string, prefix = ''): Promise<string> {
    //#region @backendFunc
    try {
      const git = simpleGit(cwd);
      const changesSummary = (await git.status()).files.map(c => c.path);
      return (
        changesSummary.length === 0 ? [` --- no changes --- `] : changesSummary
      )
        .map(f => `\n${prefix}${f}`)
        .join('');
    } catch (error) {
      console.error('Error getting changes summary:', error);
      return ' --- No changes ---';
    }
    //#endregion
  }
  //#endregion

  //#region get user info
  async getUserInfo(
    cwd: string,
    global = false,
  ): Promise<{ name?: string; email?: string }> {
    try {
      const name = child_process
        .execSync(`git config ${global ? '--global' : ''} user.name`, {
          encoding: 'utf-8',
          cwd: cwd || process.cwd(),
        })
        .trim();
      const email = child_process
        .execSync(`git config ${global ? '--global' : ''} user.email`, {
          encoding: 'utf-8',
          cwd: cwd || process.cwd(),
        })
        .trim();

      return { name, email };
    } catch (error) {
      console.error('Error fetching Git user info:', error.message);
      return {};
    }
  }

  async setUserInfos(optinos: {
    cwd: string;
    name: string;
    email: string;
    global?: boolean;
  }): Promise<void> {
    const { cwd, name, email, global } = optinos;
    if (!global && !this.isInsideGitRepo(cwd)) {
      console.error('Not a Git repository:', cwd);
      return;
    }
    try {
      child_process.execSync(
        `git config ${global ? '--global' : ''} user.name "${name}"`,
        { cwd },
      );
      child_process.execSync(
        `git config ${global ? '--global' : ''} user.email "${email}"`,
        { cwd },
      );
    } catch (error) {
      console.error('Error setting Git user info:', error.message);
      await UtilsTerminal.pressAnyKeyToContinueAsync();
    }
  }

  //#endregion

  async backupBranch(cwd: string, branchName?: string): Promise<string> {
    //#region @backendFunc
    const orgBranchName = this.currentBranchName(cwd);
    if (branchName) {
      if (branchName !== orgBranchName) {
        this.checkout(cwd, branchName, {
          createBranchIfNotExists: false,
          switchBranchWhenExists: true,
          fetchBeforeCheckout: true,
        });
      }
    } else {
      branchName = orgBranchName;
    }
    const backupBranchName = `backup/${branchName}-${dateformat(new Date(), 'yyyy-mm-dd-HH-MM-ss')}`;
    Helpers.log(
      `[taon-helpers][backupBranch] Creating backup branch: ${backupBranchName} in repo: ${cwd}`,
    );
    this.checkout(cwd, backupBranchName, { createBranchIfNotExists: true });
    Helpers.log(
      `[taon-helpers][backupBranch] Backup branch created and pushed: ${backupBranchName}`,
    );
    this.checkout(cwd, orgBranchName, {
      createBranchIfNotExists: false,
      switchBranchWhenExists: true,
    });
    return backupBranchName;
    //#endregion
  }
}
