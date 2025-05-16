//#region imports
import { config } from 'tnp-config/src';
import { chalk, dateformat, fse, Utils } from 'tnp-core/src';
import { crossPlatformPath, path, _, UtilsTerminal } from 'tnp-core/src';

import {
  CommitData,
  Helpers,
  PushProcessOptions,
  TypeOfCommit,
} from '../../index';
import { translate } from '../translate';

import { BaseFeatureForProject } from './base-feature-for-project';
import type { BaseProject } from './base-project';
//#endregion

export class BaseGit<
  PROJECT extends BaseProject = any,
> extends BaseFeatureForProject<PROJECT> {
  //#region methods & getters / unstage all files
  unstageAllFiles() {
    //#region @backendFunc
    Helpers.git.unstageAllFiles(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / revert file changes
  revertFileChanges(fileReletivePath: string) {
    //#region @backendFunc
    Helpers.git.revertFileChanges(this.project.location, fileReletivePath);
    //#endregion
  }
  //#endregion

  //#region methods & getters / clone
  async clone(url: string, destinationFolderName = '', branchName?: string) {
    //#region @backendFunc
    const clondeFolderpath = await Helpers.git.clone({
      cwd: this.project.location,
      url,
      destinationFolderName,
    });
    if (branchName) {
      try {
        Helpers.git.checkout(clondeFolderpath, branchName);
        await Helpers.git.pullCurrentBranch(clondeFolderpath, {
          askToRetry: true,
        });
      } catch (error) {}
    }
    return crossPlatformPath([
      clondeFolderpath,
      destinationFolderName || '',
    ]).replace(/\/$/g, '');
    //#endregion
  }
  //#endregion

  //#region methods & getters / restore last version
  restoreLastVersion(relativeFilePath: string): void {
    //#region @backendFunc
    Helpers.git.restoreLastVersion(this.project.location, relativeFilePath);
    //#endregion
  }
  //#endregion

  //#region methods & getters / stage all files
  stageAllFiles(): void {
    //#region @backendFunc
    Helpers.git.stageAllFiles(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / stage all files
  stageFile(relativeFilePath: string): void {
    //#region @backendFunc
    Helpers.git.stageFile(this.project.location, relativeFilePath);
    //#endregion
  }
  //#endregion

  //#region methods & getters / stash
  stash(options?: { onlyStaged?: boolean }) {
    //#region @backendFunc
    return Helpers.git.stash(this.project.location, options);
    //#endregion
  }
  //#endregion

  //#region methods & getters / stash
  rebase(toBranch: string) {
    //#region @backendFunc
    return Helpers.git.rebase(this.project.location, toBranch);
    //#endregion
  }
  //#endregion

  //#region methods & getters / stash apply
  stashApply(): void {
    //#region @backendFunc
    Helpers.git.stashApply(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / fetch
  fetch(all = false) {
    //#region @backendFunc
    Helpers.git.fetch(this.project.location, all);
    //#endregion
  }
  //#endregion

  //#region methods & getters / reset files
  resetFiles(...relativePathes: string[]) {
    //#region @backendFunc
    return Helpers.git.resetFiles(this.project.location, ...relativePathes);
    //#endregion
  }
  //#endregion

  //#region methods & getters / is inside git repo
  get isInsideGitRepo() {
    //#region @backendFunc
    return Helpers.git.isInsideGitRepo(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / is without git repository
  get isWithoutGitRepository() {
    //#region @backendFunc
    return !fse.existsSync(path.join(this.project.location, '.git'));
    //#endregion
  }
  //#endregion

  //#region methods & getters / is git root
  get isGitRoot() {
    //#region @backendFunc
    return Helpers.git.isGitRoot(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / origin url
  get originURL() {
    //#region @backendFunc
    return Helpers.git.getOriginURL(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / commit
  commit(commitMessage?: string): void {
    //#region @backendFunc
    return Helpers.git.commit(this.project.location, commitMessage);
    //#endregion
  }
  //#endregion

  //#region methods & getters / add and commit
  /**
   * alias to stage all and commit
   */
  addAndCommit(commitMessage: string) {
    //#region @backendFunc
    return Helpers.git.stageAllAndCommit(this.project.location, commitMessage);
    //#endregion
  }
  //#endregion

  //#region methods & getters / get default develop Branch
  /**
   * general default development branch for all kinds of projects
   */
  getDefaultDevelopmentBranch(): string {
    return 'develop';
  }
  //#endregion

  //#region methods & getters / is using action commit
  isUsingActionCommit(): boolean {
    return false;
  }
  //#endregion

  jiraIssuesAreOutsideBrackets() {
    return false;
  }

  async getUserInfo(
    global = false,
  ): Promise<{ name?: string; email?: string }> {
    //#region @backendFunc
    return await Helpers.git.getUserInfo(this.project.location, global);
    //#endregion
  }

  async setUserInfo(
    { name, email }: { name?: string; email?: string },
    global = false,
  ): Promise<void> {
    //#region @backendFunc
    return await Helpers.git.setUserInfos({
      cwd: this.project.location,
      name,
      email,
      global,
    });
    //#endregion
  }

  //#region methods & getters / stage all and commit
  stageAllAndCommit(commitMessage: string) {
    //#region @backendFunc
    return Helpers.git.stageAllAndCommit(this.project.location, commitMessage);
    //#endregion
  }
  //#endregion

  //#region methods & getters / push current branch
  async pushCurrentBranch(options?: {
    force?: boolean;
    origin?: string;
    askToRetry?: boolean;
    forcePushNoQuestion?: boolean;
  }) {
    //#region @backendFunc
    return await Helpers.git.pushCurrentBranch(this.project.location, options);
    //#endregion
  }
  //#endregion

  //#region methods & getters / all origins
  get allOrigins() {
    //#region @backendFunc
    return Helpers.git.allOrigins(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / uncommited files
  get uncommitedFiles() {
    //#region @backendFunc
    return Helpers.git.uncommitedFiles(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / there are some uncommited change
  get thereAreSomeUncommitedChange() {
    //#region @backendFunc
    return Helpers.git.checkIfthereAreSomeUncommitedChange(
      this.project.location,
    );
    //#endregion
  }
  //#endregion

  //#region methods & getters / there are some uncommited change except
  thereAreSomeUncommitedChangeExcept(filesList: string[] = []) {
    //#region @backendFunc
    return Helpers.git.thereAreSomeUncommitedChangeExcept(
      filesList,
      this.project.location,
    );
    //#endregion
  }
  //#endregion

  /**
   * Resolve last changes
   * - uncommited changes
   * - action commits to melt
   */
  async resolveLastChanges(options?: {
    // TODO WIP on that
    tryAutomaticActionFirst?: boolean;
    projectNameAsOutputPrefix?: string;
  }): Promise<void> {
    //#region @backendFunc
    options = options || {};

    const displayLastCommitInfo = (): void => {
      Helpers.info(`
        Project: ${this.project.genericName}
        ${chalk.gray(`Last commit hash: ${this.project.git.lastCommitHash()}`)}
        ${chalk.gray(`Last commit date: ${dateformat(this.project.git.lastCommitDate(), 'dd-mm-yyyy HH:MM:ss')}`)}
        ${chalk.gray(`Last commit message: "${this.project.git.lastCommitMessage()}"`)}
      `);
    };

    const getUncommitedFiles = (): string[] => {
      return Utils.uniqArray([
        ...this.uncommitedFiles,
        ...this.stagedFilesRelativePaths,
      ]);
    };

    let hadMeltedActionCommits = false;
    while (true) {
      let uncommitedFiles = getUncommitedFiles();

      let hasUncommitedChanges = uncommitedFiles.length > 0;
      let lastCommitName = this.lastCommitMessage();
      const hasActionCommitsToMelt = this.hasActionCommitsToMelt;

      if (!hasUncommitedChanges && !hasActionCommitsToMelt) {
        break;
      }

      displayLastCommitInfo();
      if (hasActionCommitsToMelt) {
        hadMeltedActionCommits = true;
        Helpers.info(`LAST COMMIT MESSAGE SUGGEST TEMPORARY CHANGES`);

        // if (!options.tryAutomaticActionFirst) {
        await UtilsTerminal.pressAnyKeyToContinueAsync({
          message: `Melting last changes.. press any key to continue`,
        });
        // }
        this.project.git.meltActionCommits();
        lastCommitName = this.lastCommitMessage();
        uncommitedFiles = getUncommitedFiles();
        hasUncommitedChanges = uncommitedFiles.length > 0;
      }

      if (hasUncommitedChanges) {
        const reason = 'THERE ARE SOME UNCOMMITED CHANGES';
        const data = `
${uncommitedFiles
  .map(
    c =>
      `${options.projectNameAsOutputPrefix ? ` ${options.projectNameAsOutputPrefix}/` : ''}${c}`,
  )
  .join('\n')}`;

        Helpers.info(`
Please provide proper commit message for lastest changes in your project:

          ${this.project.genericName}

        ${chalk.yellow(reason)}
        ${data}

        `);

        //#region handle select options
        const optionsSelect = {
          openInVscode: {
            name: 'Open in vscode',
          },
          // autoCommit: {
          //   name: 'Inteligently auto commit all changes',
          // },
          addToLastCommitAndPush: {
            name: `Add to last commit ("${lastCommitName}") and ${hadMeltedActionCommits ? 'force ' : ''}push`,
          },
          discard: {
            name: `Discard all changes`,
          },
          commitAsChoreUpdateAndPush: {
            name: `Commit as "chore: update" and ${hadMeltedActionCommits ? 'force ' : ''}push`,
          },
          push: {
            name: `Just ${hadMeltedActionCommits ? 'force ' : ''}push changes...`,
          },
          // commitAsAndPush: {
          //   name: `Commit as < you will choose commit message > and ${hadMeltedActionCommits ? 'force ' : ''}push`,
          // },
          skip: {
            name: 'Skip resolving last changes for this project',
          },
          exit: {
            name: 'Exit',
          },
        };

        const selected = await UtilsTerminal.select<keyof typeof optionsSelect>(
          {
            choices: optionsSelect,
            question: `What to do with uncommited changes ?`,
            // autocomplete: true,
          },
        );
        //#endregion

        //#region handle actions
        if (selected === 'openInVscode') {
          this.project.run(`code ${this.project.location}`).sync();
          await UtilsTerminal.pressAnyKeyToContinueAsync({
            message: `Press any key to continue when you done`,
          });
        }
        // if (selected === 'autoCommit') {
        //   await automaticAction();
        // }
        if (selected === 'skip') {
          return;
        }
        if (selected === 'discard') {
          try {
            this.project.git.resetHard({ HEAD: 0 });
          } catch (error) {}
          return;
        }
        if (selected === 'exit') {
          process.exit(0);
        }
        if (selected === 'commitAsChoreUpdateAndPush') {
          this.project.git.stageAllFiles();
          this.project.git.commit('chore: update');

          await this.project.git.pushCurrentBranch({
            askToRetry: true,
            force: hadMeltedActionCommits,
          });
          return;
        }
        if (selected === 'push') {
          await this.project.git.pushCurrentBranch({
            askToRetry: true,
            force: hadMeltedActionCommits,
          });
          return;
        }
        // if (selected === 'commitAsAndPush') {
        //   const input = await UtilsTerminal.input({
        //     question: `Commit message`,
        //     defaultValue: lastCommitName,
        //   });
        //   this.project.git.stageAllFiles();
        //   this.project.git.commit(input);
        //   await this.project.git.pushCurrentBranch({
        //     askToRetry: true,
        //     force: hadMeltedActionCommits,
        //   });
        //   return;
        // }
        if (selected == 'addToLastCommitAndPush') {
          this.project.git.resetSoftHEAD(1);
          this.project.git.stageAllFiles();
          this.project.git.commit(lastCommitName);
          await this.project.git.pushCurrentBranch({
            askToRetry: true,
            force: hadMeltedActionCommits,
          });
          return;
        }
        //#endregion
      }
    }
    //#endregion
  }

  //#region methods & getters / has action commits to melt
  get hasActionCommitsToMelt(): boolean {
    //#region @backendFunc
    const lastCommitMessage = this.lastCommitMessage() || '';
    return (
      lastCommitMessage.trim() === Helpers.git.ACTION_MSG_RESET_GIT_HARD_COMMIT
    );
    //#endregion
  }
  //#endregion

  //#region methods & getters / melt action commits
  meltActionCommits() {
    //#region @backend
    return Helpers.git.meltActionCommits(this.project.location);
    //#endregion
  }
  //#endregion

  //#region push to git repo
  /**
   *
   * @param newVersion
   * @param pushWithoutAsking
   */
  async tagAndPushToGitRepo(
    newVersion: string,
    autoReleaseUsingConfig: boolean,
    isCiProcess: boolean,
  ): Promise<void> {
    //#region @backendFunc
    return await Helpers.git.tagAndPushToGitRepo(this.project.location, {
      newVersion,
      autoReleaseUsingConfig,
      isCiProcess,
    });
    //#endregion
  }
  //#endregion

  //#region methods & getters / pull current branch
  async pullCurrentBranch(options?: {
    askToRetry?: boolean;
    /**
     * default true, when false it will throw error instead process.exit(0)
     */
    exitOnError?: boolean;
    defaultHardResetCommits?: number;
  }) {
    //#region @backendFunc
    await Helpers.git.pullCurrentBranch(this.project.location, { ...options });
    //#endregion
  }
  //#endregion

  //#region methods & getters / current branch name
  get currentBranchName() {
    //#region @backendFunc
    return Helpers.git.currentBranchName(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / list of current git changes
  get listOfCurrentGitChanges() {
    //#region @backendFunc
    return Helpers.git.getListOfCurrentGitChanges(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / get branches names by
  getBranchesNamesBy(pattern: string | RegExp) {
    //#region @backendFunc
    return Helpers.git.getBranchesNames(this.project.location, pattern);
    //#endregion
  }
  //#endregion

  //#region methods & getters / reset soft HEAD
  resetSoftHEAD(HEAD = 1): void {
    //#region @backendFunc
    Helpers.git.resetSoftHEAD(this.project.location, HEAD);
    //#endregion
  }
  //#endregion

  //#region methods & getters / reset hard
  resetHard(options?: { HEAD?: number }) {
    //#region @backendFunc
    Helpers.git.resetHard(this.project.location, options);
    //#endregion
  }
  //#endregion

  //#region methods & getters / count commits
  countComits() {
    //#region @backendFunc
    return Helpers.git.countCommits(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / has any commits
  hasAnyCommits() {
    //#region @backendFunc
    return Helpers.git.hasAnyCommits(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / is in merge process
  get isInMergeProcess() {
    //#region @backendFunc
    return Helpers.git.isInMergeProcess(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / last commit date
  lastCommitDate() {
    //#region @backendFunc
    return Helpers.git.lastCommitDate(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / last commit hash
  lastCommitHash() {
    //#region @backendFunc
    return Helpers.git.lastCommitHash(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / last commit message
  lastCommitMessage(): string {
    //#region @backendFunc
    return Helpers.git.lastCommitMessage(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / last commit message
  async penultimateCommitMessage(): Promise<string> {
    //#region @backendFunc
    return await Helpers.git.penultimateCommitMessage(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / get commit message by index
  async getCommitMessageByIndex(index: number) {
    //#region @backendFunc
    return await Helpers.git.getCommitMessageByIndex(
      this.project.location,
      index,
    );
    //#endregion
  }
  //#endregion

  //#region methods & getters / get commit message by hash
  async getCommitMessageByHash(hash: string) {
    //#region @backendFunc
    return await Helpers.git.getCommitMessageByHash(
      this.project.location,
      hash,
    );
    //#endregion
  }
  //#endregion

  //#region methods & getters / get commit hash by index
  async getCommitHashByIndex(index: number) {
    //#region @backendFunc
    return await Helpers.git.getCommitHashByIndex(this.project.location, index);
    //#endregion
  }
  //#endregion

  //#region methods & getters / penultimate commit hash
  penultimateCommitHash() {
    //#region @backendFunc
    return Helpers.git.penultimateCommitHash(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / check tag exists
  checkTagExists(tag: string) {
    //#region @backendFunc
    return Helpers.git.checkTagExists(tag, this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / checkout
  checkout(
    branchName: string,
    options?: {
      createBranchIfNotExists?: boolean;
      fetchBeforeCheckout?: boolean;
      switchBranchWhenExists?: boolean;
    },
  ): void {
    //#region @backendFunc
    return Helpers.git.checkout(this.project.location, branchName, options);
    //#endregion
  }
  //#endregion

  allowedGitEmailDomains(): string[] {
    return [];
  }

  cleanRepoFromAnyFilesExceptDotGitFolder(): void {
    //#region @backendFunc
    return Helpers.git.cleanRepoFromAnyFilesExceptDotGitFolder(
      this.project.location,
    );
    //#endregion
  }

  //#region methods & getters / checkout from to
  checkoutFromTo(
    checkoutFromBranch: string,
    branch: string,
    origin = 'origin',
  ) {
    //#region @backendFunc
    return Helpers.git.checkoutFromTo(
      checkoutFromBranch,
      branch,
      origin,
      this.project.location,
    );
    //#endregion
  }
  //#endregion

  //#region methods & getters / last tag name for major version
  /**
   *
   * @param majorVersion example: v1, v2 etc.
   * @returns tag name
   */
  lastTagNameForMajorVersion(majorVersion) {
    //#region @backendFunc
    return Helpers.git.lastTagNameForMajorVersion(
      this.project.location,
      majorVersion,
    );
    //#endregion
  }
  //#endregion

  //#region methods & getters / last tag hash
  lastTagHash() {
    //#region @backendFunc
    return Helpers.git.lastTagHash(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / remote origin url
  get remoteOriginUrl() {
    //#region @backendFunc
    return Helpers.git.getOriginURL(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / remote origin url
  /**
   * get provider of remote origin
   */
  get remoteProvider(): string {
    //#region @backendFunc
    return Helpers.git.getRemoteProvider(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / last tag version name
  get lastTagVersionName() {
    //#region @backendFunc
    return Helpers.git.lastTagVersionName(this.project.location) || '';
    //#endregion
  }
  //#endregion

  //#region methods & getters / staged files
  get stagedFiles(): string[] {
    //#region @backendFunc
    return Helpers.git.stagedFiles(this.project.location);
    //#endregion
  }
  get stagedFilesRelativePaths(): string[] {
    //#region @backendFunc
    return Helpers.git.stagedFiles(this.project.location, true);
    //#endregion
  }

  //#endregion

  //#region methods & getters / rename origin
  /**
   * TODO does this make any sense
   */
  renameOrigin(newNameOrUlr: string) {
    //#region @backendFunc
    if (!newNameOrUlr.endsWith('.git')) {
      newNameOrUlr = newNameOrUlr + '.git';
    }
    const oldOrigin = this.project.git.originURL;
    if (
      !newNameOrUlr.startsWith('git@') &&
      !newNameOrUlr.startsWith('https://')
    ) {
      newNameOrUlr = oldOrigin.replace(path.basename(oldOrigin), newNameOrUlr);
    }

    try {
      this.project.run(`git remote rm origin`).sync();
    } catch (error) {}

    try {
      this.project.run(`git remote add origin ${newNameOrUlr}`).sync();
      Helpers.info(`Origin changed:
    from: ${oldOrigin}
      to: ${newNameOrUlr}\n`);
    } catch (e) {
      Helpers.error(`Not able to change origin.. reverting to old`, true, true);
      this.project.run(`git remote add origin ${oldOrigin}`).sync();
    }
    //#endregion
  }
  //#endregion

  //#region getters & methods / translate git commit from args
  /**
   * By default no translation of commit
   */
  transalteGitCommitFromArgs() {
    return { from: void 0 as string, to: void 0 as string };
  }
  //#endregion

  //#region getters & methods / us git branches when commiting and pushing
  /**
   * By defult true.. when commit branches will not function.
   * (false is better for simple projects)
   */
  useGitBranchesWhenCommitingAndPushing() {
    return true;
  }
  //#endregion

  //#region getters & methods / automatically add all changes when pushing to git
  /**
   * usefull when pushing in project with childrens as git repos
   */
  automaticallyAddAllChangesWhenPushingToGit() {
    return false;
  }
  //#endregion

  //#region getters & methods / use git branches as metadata for commits
  /**
   * usefull when pushing in project with childrens as git repos
   */
  useGitBranchesAsMetadataForCommits() {
    return true;
  }
  //#endregion

  //#region getters & methods / clone to
  async cloneTo(cwd: string, newProjectName?: string) {
    //#region @backendFunc
    if (!newProjectName) {
      newProjectName = path.basename(this.project.location);
    }

    const dest = crossPlatformPath([newProjectName, newProjectName]);
    if (fse.existsSync(dest)) {
      const res = await Helpers.questionYesNo(
        `Folder ${newProjectName} alredy exist, delete it ?`,
      );
      if (res) {
        Helpers.tryRemoveDir(dest);
      } else {
        Helpers.pressKeyAndContinue('Operation not completed... press any key');
        return false;
      }
    }

    Helpers.info(`Cloning ${this.project.name}...`);

    // copy instead cloning
    await Helpers.git.clone({
      cwd,
      url: this.project.git.remoteOriginUrl,
      destinationFolderName: newProjectName,
    });

    Helpers.info(`Clone success`);
    return true;
    //#endregion
  }
  //#endregion

  //#region getters & methods / get children
  /**
   * This is only for push/pull process
   *
   * There are 2 types of projects:
   * - with linked-projects.json
   * - with children from external folder
   *
   * projects that are children of this project (with its own git repo)
   */
  get gitChildren() {
    let childrenRepos: PROJECT[] = [];

    if (this.project.linkedProjects.linkedProjects.length > 0) {
      childrenRepos = this.project.linkedProjects.linkedProjects
        .map(c => {
          return this.project.ins.From([
            this.project.location,
            c.relativeClonePath,
          ]) as PROJECT;
        })
        .filter(f => !!f);
    } else {
      childrenRepos = this.project.children as PROJECT[];
    }

    childrenRepos = childrenRepos.filter(
      f => f.git.isInsideGitRepo && f.git.isGitRoot,
    ) as PROJECT[];
    return childrenRepos;
  }
  //#endregion

  //#region getters & methods / set remote origin type
  protected async setRemoteOriginType(
    setOrigin: 'ssh' | 'http',
  ): Promise<void> {
    //#region @backendFunc
    if (setOrigin === ('https' as string)) {
      setOrigin = 'http';
    }
    if (setOrigin === 'ssh') {
      await Helpers.git.changeRemoteFromHttpsToSSh(this.project.location);
    } else if (setOrigin === 'http') {
      await Helpers.git.changeRemoveFromSshToHttps(this.project.location);
    }
    //#endregion
  }
  //#endregion

  //#region methods & getters / push process
  async pullProcess(
    options: {
      cloneChildren?: boolean;
      setOrigin?: 'ssh' | 'http';
    } = {},
  ): Promise<void> {
    //#region @backendFunc
    options = options || {};
    options.cloneChildren = !!options.cloneChildren;
    let { cloneChildren, setOrigin } = options;

    await this._beforePullProcessAction(setOrigin, cloneChildren);

    await this.setRemoteOriginType(setOrigin);

    let uncommitedChanges = this.project.git.thereAreSomeUncommitedChange;
    if (uncommitedChanges) {
      Helpers.warn(
        `Stashing uncommit changes... in ${this.project.genericName}`,
      );
      try {
        this.project.git.stageAllFiles();
      } catch (error) {}
      try {
        this.project.git.stash();
      } catch (error) {}
    }

    await this.project.git.pullCurrentBranch({ askToRetry: true });
    await this._afterPullProcessAction(setOrigin);
    const location = this.project.location;
    this.project.ins.unload(this as any);
    this.project.ins.add(this.project.ins.From(location) as any);
    await this.project.linkedProjects.saveLocationToDB();

    if (this.automaticallyAddAllChangesWhenPushingToGit() || cloneChildren) {
      for (const child of this.gitChildren) {
        await child.git.pullProcess(options);
      }
    }
    await this.project.linkedProjects.saveAllLinkedProjectsToDB();
    //#endregion
  }
  //#endregion

  private async validateEmailDomain(
    allowedEmailsEnds: string[],
  ): Promise<void> {
    //#region @backendFunc
    while (true) {
      let gitConfig: { name?: string; email?: string } = null;
      try {
        gitConfig = await this.project.git.getUserInfo();
      } catch (error) {

      }
      const errorsMgs = {
        notUsingEmail: `You are not using any email(s) address(es) for git operations.`,
        notUsingName: `You are not using name for git operations`,
        notUsingEmailAndName: `You are not using any email(s) address(es) for git operations.`,
        notUsingAllowedEmails: `You are not using allowed ${allowedEmailsEnds.join(',')} email domains.`
      };
      const errors = {
        notUsingEmail: !gitConfig?.email ? errorsMgs.notUsingEmail : null,
        notUsingName: !gitConfig?.name ? errorsMgs.notUsingName : null,
        notUsingAllowedEmails: !allowedEmailsEnds.some(allowedEmailEnd =>
          gitConfig.email.endsWith(allowedEmailEnd),
        ) ? errorsMgs.notUsingAllowedEmails : null
      }

      if(allowedEmailsEnds.length === 0) {
        delete errors.notUsingAllowedEmails;
      }

      if(!Object.values(errors).some(e => e)) {
        return;
      }

      Object.values(errors).filter(e => e).forEach(e => {
        Helpers.warn(e);
      });

      Helpers.warn(
        `
        Please provide proper email and name for git operations.

        `,
      );

      const options = {
        changeLocalEmailAndName: {
          name: 'Change local .git/config email and name',
        },
        useItAnyway: {
          name: 'Use it anyway',
        },
        exitProcess: {
          name: 'Exit process',
        },
      };

      if(!gitConfig?.email || !gitConfig?.name) {
        delete options.useItAnyway;
      }

      const selected = await UtilsTerminal.select<keyof typeof options>({
        question: 'Select action',
        choices: options,
      });
      if (selected === 'changeLocalEmailAndName') {

        const email = await UtilsTerminal.input({
          question: 'Enter git email',
        });

        const name = await UtilsTerminal.input({
          question: 'Enter your git name and surname (or just name)',
        });
        await this.project.git.setUserInfo({ email, name });
      }

      if (selected === 'exitProcess') {
        process.exit(0);
      }
    }

    //#endregion
  }

  protected async _afterPullProcessAction(
    setOrigin: 'ssh' | 'http',
  ): Promise<void> {
    // nothing yet
  }

  //#region methods & getters / push process
  async pushProcess(options: PushProcessOptions = {}): Promise<void> {
    //#region @backendFunc
    let {
      force = false,
      typeofCommit,
      skipLint,
      forcePushNoQuestion,
      origin = 'origin',
      exitCallBack,
      askToConfirmPush,
      askToConfirmCommit,
      askToConfirmBranchChange,
      args = [],
      commitMessageRequired,
      overrideCommitMessage,
      skipChildren,
      setOrigin,
      currentOrigin,
      mergeUpdateCommits,
    } = options;

    await this._beforePushProcessAction(setOrigin);

    await this.setRemoteOriginType(setOrigin);

    await this.project.linkedProjects.saveLocationToDB();
    const commitData = await this._getCommitMessage(
      typeofCommit,
      args,
      commitMessageRequired,
      currentOrigin,
    );

    if (mergeUpdateCommits && this.project.git.stagedFiles.length > 0) {
      //#region merge update commits
      Helpers.logInfo(
        `Pushing detailed changes to project: ${this.project.genericName}`,
      );
      Helpers.logInfo(`Modified files... `);
      Helpers.logInfo(
        [...this.project.git.stagedFiles]
          .map(f => ` - ${chalk.underline(f)}`)
          .join('\n'),
      );
      while (true) {
        const mergeAction = {
          useUpdateCommit: {
            name:
              `Use temporary update commit ` +
              `"${Helpers.git.ACTION_MSG_RESET_GIT_HARD_COMMIT}" and force push`,
          },
          provideCommitMessage: {
            name: 'Provide commit message and force push',
          },
          resetRemoveChanges: {
            name: 'Reset/remove changes and force push',
          },
          openInVscode: {
            name: 'Open project in vscode',
          },
        };

        const action = force
          ? ('useUpdateCommit' as keyof typeof mergeAction)
          : await UtilsTerminal.select<keyof typeof mergeAction>({
              choices: mergeAction,
              question: 'What to do ?',
            });

        if (action === 'openInVscode') {
          Helpers.run(`code .`, { cwd: this.project.location }).sync();
          continue;
        }

        if (action === 'resetRemoveChanges') {
          force = true;
          forcePushNoQuestion = true;
          this.project.git.resetHard();
          break;
        }

        if (action === 'useUpdateCommit') {
          force = true;
          forcePushNoQuestion = true;
          overrideCommitMessage = Helpers.git.ACTION_MSG_RESET_GIT_HARD_COMMIT;
        }

        if (action === 'provideCommitMessage') {
          force = true;
          forcePushNoQuestion = true;
          try {
            overrideCommitMessage = await Helpers.input({
              question: `Please provide commit message for current changes:`,
              defaultValue: 'update',
            });
          } catch (error) {}
        }

        if (overrideCommitMessage) {
          break;
        }
        //#endregion
      }
    }

    // #region warning about missing sub-issue
    if (
      commitData.typeOfCommit === 'feature' &&
      commitData.jiraNumbers?.length === 1 &&
      commitData.issuesFromOtherProjects?.length === 0
    ) {
      Helpers.info(`

        You current feature branch "${this.project.git.currentBranchName}"
        doesn't have ${chalk.bold('main-issue')} and ${chalk.bold('sub-issue')} inlcueded.

        Proper example: feature/JIRANUM-<number-of-sub-issue>-JIRANUM-<number-of-main-issue>-commit-name

          `);
      if (!(await Helpers.questionYesNo('Continue without sub-issue?'))) {
        process.exit(0);
      }
    }
    //#endregion

    //#region automatic push to git
    if (!this.automaticallyAddAllChangesWhenPushingToGit()) {
      if (
        commitData.commitMessage
          ?.split(':')
          .map(p => p.trim())
          .every(p => p === this.project.git.currentBranchName)
      ) {
        // QUICK_FIX
        Helpers.error(
          `

        Please provide more specific commit message than branch name
        or maybe you forgot ?
        - TEAM ID? (example TEAM2# <= hash at the end)
        - JIRA ISSUE? (example JIRA-1234)

        `,
          false,
          true,
        );
      }
    }
    //#endregion

    //#region lint
    if (commitData.typeOfCommit === 'release') {
      skipLint = true;
    }
    // console.log({ skipLint, typeofCommit });
    const numberOfStagedFiles = this.project.git.stagedFiles.length;
    if (numberOfStagedFiles === 0) {
      Helpers.warn(`No staged files...`);
      skipLint = true;
    }
    if (!skipLint) {
      while (true) {
        try {
          await this.project.lint();
          break;
        } catch (error) {
          Helpers.warn('Fix your code...');
          if (
            !(await Helpers.consoleGui.question.yesNo(
              'Try again lint before commit ?',
            ))
          ) {
            break;
          }
        }
      }
    }
    //#endregion

    if (
      this.project.useFeatureInBranchNameForTests() &&
      commitData.typeOfCommit === 'test'
    ) {
      commitData.useFeatureBranchForTestBranch = true;
    }

    if (!commitData.isActionCommit) {
      const commitMessageFromBranch = (
        await CommitData.getFromBranch(commitData.branchName, {
          currentOrigin,
          jiraIssuesAreOutsideBrackets:
            this.project.git.jiraIssuesAreOutsideBrackets(),
        })
      ).commitMessage;

      Helpers.info(`

      PROJECT: ${this.project.genericName}

      Current commit:
      - message to include {${overrideCommitMessage ? overrideCommitMessage : commitData.commitMessage}}
      ${
        this.useGitBranchesAsMetadataForCommits() && !overrideCommitMessage
          ? `- branch to checkout {${commitData.branchName}}`
          : `- using ${chalk.bold('current')} branch {${this.project.git.currentBranchName}} \n
          (generated would be: ${commitData.branchName})
          `
      }`);

      if (
        !overrideCommitMessage &&
        commitMessageFromBranch !== commitData.commitMessage
      ) {
        Helpers.logWarn(`Commit from args and commit from branch are different
        commit message from args: ${commitData.commitMessage}
        commit message from branch: ${commitMessageFromBranch}

        ADVICE: Is is better to use words instead characters to describe multiple
        commit changes in one commit message

        `);
      } else {
        Helpers.logInfo(
          chalk.gray(`Commit from args and commit from branch are the same...`),
        );
      }

      const lastCommitMessage = this.project.git.lastCommitMessage();
      if (
        lastCommitMessage &&
        [commitData.commitMessage, overrideCommitMessage]
          .filter(f => !!f)
          .some(m => m === lastCommitMessage)
      ) {
        if (
          await Helpers.questionYesNo(
            'Soft reset last commit with same message ?',
          )
        ) {
          this.project.git.resetSoftHEAD(1);
        }
      }

      if (!(await Helpers.questionYesNo('Commit and push this ?'))) {
        exitCallBack();
      }
    }

    if (this.automaticallyAddAllChangesWhenPushingToGit()) {
      // my project
      this.project.git.stageAllFiles();
    }

    if (this.useGitBranchesAsMetadataForCommits() && !overrideCommitMessage) {
      Helpers.info('Checkingout branches (if needed)...');
      if (
        this.project.git.currentBranchName?.trim() !== commitData.branchName
      ) {
        if (askToConfirmBranchChange) {
          Helpers.info(`Changing branch to: ${commitData.branchName}`);
          if (!(await Helpers.questionYesNo('Confirm branch change ?'))) {
            exitCallBack();
          }
        }
        try {
          this.project.git.checkout(commitData.branchName, {
            createBranchIfNotExists: true,
          });
        } catch (error) {
          Helpers.error('Please modyfiy you commit message or delete branch,');
        }
      }
    }

    if (askToConfirmCommit) {
      Helpers.info(
        `Commit message: ${
          overrideCommitMessage
            ? overrideCommitMessage
            : commitData.commitMessage
        }`,
      );
      if (!(await Helpers.questionYesNo('Confirm commit ?'))) {
        exitCallBack();
      }
    }
    try {
      this.project.git.commit(
        overrideCommitMessage
          ? overrideCommitMessage
          : commitData.commitMessage,
      );
    } catch (error) {
      Helpers.warn(`Not commiting anything... `);
    }

    if (askToConfirmPush) {
      if (!(await Helpers.questionYesNo('Confirm push ?'))) {
        exitCallBack();
      }
    }

    await this.project.git.pushCurrentBranch({
      force,
      origin,
      forcePushNoQuestion,
      askToRetry: true,
    });

    if (this.automaticallyAddAllChangesWhenPushingToGit() && !skipChildren) {
      if (
        this.project.linkedProjects.getLinkedProjectsConfig().skipRecrusivePush
      ) {
        Helpers.warn(
          `Skipping recrusive (children) push for ${this.project.genericName}`,
        );
        return;
      }

      for (const child of this.gitChildren) {
        if (mergeUpdateCommits) {
          await child.git.meltActionCommits();
        }
        await child.git.pushProcess(options);
      }
    }
    await this.project.linkedProjects.saveAllLinkedProjectsToDB();
    //#endregion
  }
  //#endregion

  //#region methods & getters / before any action on git root
  public _beforeAnyActionOnGitRoot() {
    //#region @backendFunc
    if (!this.project.git.isInsideGitRepo) {
      Helpers.error(
        `Project ${chalk.bold(this.project.name)} is not a git repository
      locaiton: ${this.project.location}`,
        false,
        true,
      );
    }
    if (!this.project.git.isGitRoot) {
      Helpers.error(
        `Project ${chalk.bold(this.project.name)} is not a git root
      locaiton: ${this.project.location}`,
        false,
        true,
      );
    }
    //#endregion
  }
  //#endregion

  //#region methods & getters / before push action
  protected async _beforePushProcessAction(setOrigin: 'ssh' | 'http') {
    //#region @backendFunc
    this._beforeAnyActionOnGitRoot();

    // for first projects
    if (
      this.project.git.isInsideGitRepo &&
      this.project.git.isGitRoot &&
      !this.project.git.currentBranchName?.trim()
    ) {
      if (
        await Helpers.consoleGui.question.yesNo(
          'Repository is empty...Commit "master" branch and commit all as "first commit" ?',
        )
      ) {
        this.project.git.checkout('master');
        this.project.git.stageAllFiles();
        this.project.git.commit('first commit ');
      }
    }

    await this.project.linkedProjects.cloneUnexistedLinkedProjects(
      'push',
      setOrigin,
    );
    await this.validateEmailDomain(this.allowedGitEmailDomains());
    //#endregion
  }
  //#endregion

  //#region methods & getters / before push action
  protected async _beforePullProcessAction(
    setOrigin: 'ssh' | 'http',
    cloneChildren = false,
  ) {
    //#region @backendFunc
    this._beforeAnyActionOnGitRoot();
    await this.project.linkedProjects.cloneUnexistedLinkedProjects(
      'pull',
      setOrigin,
      cloneChildren,
    );
    //#endregion
  }
  //#endregion

  //#region methods & getters / resovle commit message
  protected async _getCommitMessage(
    typeOfCommit: TypeOfCommit,
    args: string[],
    commitMessageRequired?: boolean,
    /**
     * only needed when push github
     * and I forgot to add my username before issue
     * taon pfix proper input my-repo#344
     * that should be
     * taon pfix proper input my-username/my-repo#344
     */
    currentOrigin?: string,
  ): Promise<CommitData> {
    //#region @backendFunc
    let commitData: CommitData;
    if (this.useGitBranchesWhenCommitingAndPushing()) {
      let argsCommitData = await CommitData.getFromArgs(args, {
        typeOfCommit,
        currentOrigin,
        jiraIssuesAreOutsideBrackets:
          this.project.git.jiraIssuesAreOutsideBrackets(),
      });
      // console.log({ argsCommitData })
      if (argsCommitData.message) {
        commitData = argsCommitData;
      } else {
        const commitDataBranch = await CommitData.getFromBranch(
          this.project.git.currentBranchName,
          {
            releaseWords: this.project.releaseProcess.getReleaseWords(),
            currentOrigin,
            jiraIssuesAreOutsideBrackets:
              this.project.git.jiraIssuesAreOutsideBrackets(),
          },
        );
        commitData = commitDataBranch;
        // console.log({ commitDataBranch })
      }
    } else {
      let argsCommitData = await CommitData.getFromArgs(args, {
        typeOfCommit,
        currentOrigin,
        jiraIssuesAreOutsideBrackets:
          this.project.git.jiraIssuesAreOutsideBrackets(),
      });
      // console.log({ argsCommitData })
      // console.log(argsCommitData)
      if (!argsCommitData.message && commitMessageRequired) {
        Helpers.error('Please provide message in argument', false, true);
      }

      if (!argsCommitData.message) {
        argsCommitData.message = Helpers.git.ACTION_MSG_RESET_GIT_HARD_COMMIT;
      }
      commitData = argsCommitData;
    }

    if (commitData.message !== Helpers.git.ACTION_MSG_RESET_GIT_HARD_COMMIT) {
      const { from, to } = this.transalteGitCommitFromArgs();
      if (from && to) {
        commitData.message = _.kebabCase(
          await translate(commitData.message, { from, to } as any),
        );
      }
    }

    return commitData;
    //#endregion
  }
  //#endregion

  //#region methods & getters / prevent accidental branch change for taon projects
  /**
   * This will prevent accidental branch change for taon projects
   * @returns branch name
   */
  duringPushWarnIfProjectNotOnSpecyficDevBranch(): string {
    return void 0;
  }
  //#endregion

  //#region methods & getters / get changed files in commit by hash
  async getChangedFilesInCommitByHash(hash: string) {
    //#region @backendFunc
    return Helpers.git.getChangedFilesInCommitByHash(
      this.project.location,
      hash,
    );
    //#endregion
  }
  //#endregion

  //#region methods & getters / get changed files in commit
  /**
   * @param index 0 - means last commit
   */
  async getChangedFilesInCommitByIndex(index: number) {
    //#region @backendFunc
    return Helpers.git.getChangedFilesInCommitByIndex(
      this.project.location,
      index,
    );
    //#endregion
  }
  //#endregion

  //#region methods & getters / get changes summary
  async changesSummary() {
    //#region @backendFunc
    const fillStringWithSpaceUpTo = (
      str: string,
      length: number,
      specialCharacter = ' ',
    ) => {
      return str + specialCharacter.repeat(length - str.length);
    };
    return await Helpers.git.changesSummary(
      this.project.location,
      `${fillStringWithSpaceUpTo(`[${this.project.name}]`, 40, '.')} `,
    );
    //#endregion
  }
  //#endregion

  //#region methods & getters / reset is resting also children
  /**
   * If true command navi reset will reset project
   * and its children.
   *
   * If false command navi reset will reset only project.
   */
  resetIsRestingAlsoChildren(): boolean {
    return true;
  }
  //#endregion
}
