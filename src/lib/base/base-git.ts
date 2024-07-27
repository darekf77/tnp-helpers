//#region imports
//#region @backend
import { chalk, fse } from 'tnp-core/src';
import { translate } from './translate';
//#endregion
import { BaseFeatureForProject } from './base-feature-for-project';
import { CommitData, Helpers, TypeOfCommit } from '../index';
import { crossPlatformPath, path, _ } from 'tnp-core/src';
import type { BaseProject } from './base-project';
//#endregion

export class BaseGit<
  PROJCET extends BaseProject = any,
> extends BaseFeatureForProject {
  project: PROJCET;
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
    const clondeFolderpath = Helpers.git.clone({
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
  restoreLastVersion(localFilePath: string) {
    //#region @backendFunc
    return Helpers.git.restoreLastVersion(this.project.location, localFilePath);
    //#endregion
  }
  //#endregion

  //#region methods & getters / stage all files
  stageAllFiles() {
    //#region @backendFunc
    Helpers.git.stageAllFiles(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / stash
  stash(optinos?: { onlyStaged?: boolean }) {
    //#region @backendFunc
    Helpers.git.stash(this.project.location, optinos);
    //#endregion
  }
  //#endregion

  //#region methods & getters / stash apply
  stashApply() {
    //#region @backendFunc
    Helpers.git.stashApply(this.project.location);
    //#endregion
  }
  //#endregion

  //#region methods & getters / fetch
  fetch() {
    //#region @backendFunc
    Helpers.git.fetch(this.project.location);
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
  commit(commitMessage?: string) {
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

  //#region methods & getters / melt action commits
  meltActionCommits(soft = false) {
    //#region @backend
    return Helpers.git.meltActionCommits(this.project.location, soft);
    //#endregion
  }
  //#endregion

  //#region methods & getters / pull current branch
  async pullCurrentBranch(options?: {
    askToRetry?: boolean;
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
  resetSoftHEAD(HEAD = 1) {
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
  lastCommitMessage() {
    //#region @backendFunc
    return Helpers.git.lastCommitMessage(this.project.location);
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
  ) {
    //#region @backendFunc
    return Helpers.git.checkout(this.project.location, branchName, options);
    //#endregion
  }
  //#endregion

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
  automaticallyAddAllChnagesWhenPushingToGit() {
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

    // @LAST copy instead cloning
    Helpers.git.clone({
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
    let childrenRepos: PROJCET[] = [];

    if (this.project.linkedProjects.linkedProjects.length > 0) {
      childrenRepos = this.project.linkedProjects.linkedProjects
        .map(c => {
          return this.project.ins.From([
            this.project.location,
            c.relativeClonePath,
          ]) as PROJCET;
        })
        .filter(f => !!f);
    } else {
      childrenRepos = this.project.children;
    }

    childrenRepos = childrenRepos.filter(
      f => f.git.isInsideGitRepo && f.git.isGitRoot,
    ) as PROJCET[];
    return childrenRepos;
  }
  //#endregion

  //#region methods & getters / push process
  async pullProcess(cloneChildren = false) {
    //#region @backendFunc
    await this._beforePullProcessAction(cloneChildren);
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
    const location = this.project.location;
    this.project.ins.unload(this as any);
    this.project.ins.add(this.project.ins.From(location) as any);
    await this.project.linkedProjects.saveLocationToDB();

    if (this.automaticallyAddAllChnagesWhenPushingToGit() || cloneChildren) {
      for (const child of this.gitChildren) {
        await child.git.pullProcess();
      }
    }
    await this.project.linkedProjects.saveAllLinkedProjectsToDB();
    //#endregion
  }
  //#endregion

  //#region methods & getters / push process
  async pushProcess(
    options: {
      force?: boolean;
      typeofCommit?: TypeOfCommit;
      origin?: string;
      args?: string[];
      setOrigin?: 'ssh' | 'http';
      exitCallBack?: () => void;
      forcePushNoQuestion?: boolean;
      commitMessageRequired?: boolean;
      skipChildren?: boolean;
    } = {},
  ) {
    //#region @backendFunc
    const {
      force = false,
      typeofCommit,
      forcePushNoQuestion,
      origin = 'origin',
      exitCallBack,
      args = [],
      commitMessageRequired,
      skipChildren,
      setOrigin,
    } = options;

    await this._beforePushProcessAction();
    if (setOrigin === 'ssh') {
      Helpers.git.changeRemoteFromHttpsToSSh(this.project.location);
    } else if (setOrigin === 'http') {
      Helpers.git.changeRemoveFromSshToHttps(this.project.location);
    }

    await this.project.linkedProjects.saveLocationToDB();
    const commitData = await this._getCommitMessage(
      typeofCommit,
      args,
      commitMessageRequired,
    );

    if (!this.automaticallyAddAllChnagesWhenPushingToGit()) {
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
        TEAM ID? (example TEAM2# <= hash at the end)

        `,
          false,
          true,
        );
      }
    }

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

    if (!commitData.isActionCommit) {
      Helpers.info(`

      PROJECT: ${this.project.genericName}

      Current commit:
      - message to include {${commitData.commitMessage}}
      ${
        this.useGitBranchesAsMetadataForCommits()
          ? `- branch to checkout ${commitData.branchName}`
          : '- using current branch'
      }
      `);

      if (this.project.git.lastCommitMessage() === commitData.commitMessage) {
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

    if (this.automaticallyAddAllChnagesWhenPushingToGit()) {
      // my project
      this.project.git.stageAllFiles();
    }

    if (this.useGitBranchesAsMetadataForCommits()) {
      Helpers.info('Checkingout branches (if needed)...');
      if (
        this.project.git.currentBranchName?.trim() !== commitData.branchName
      ) {
        try {
          this.project.git.checkout(commitData.branchName, {
            createBranchIfNotExists: true,
          });
        } catch (error) {
          Helpers.error('Please modyfiy you commit message or delete branch,');
        }
      }
    }

    try {
      this.project.git.commit(commitData.commitMessage);
    } catch (error) {
      Helpers.warn(`Not commiting anything... `);
    }

    await this.project.git.pushCurrentBranch({
      force,
      origin,
      forcePushNoQuestion,
      askToRetry: true,
    });

    if (this.automaticallyAddAllChnagesWhenPushingToGit() && !skipChildren) {
      if (
        this.project.linkedProjects.getLinkedProjectsConfig().skipRecrusivePush
      ) {
        Helpers.warn(
          `Skipping recrusive (children) push for ${this.project.genericName}`,
        );
        return;
      }

      for (const child of this.gitChildren) {
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
  protected async _beforePushProcessAction() {
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
    await this.project.linkedProjects.cloneUnexistedLinkedProjects('push');
    //#endregion
  }
  //#endregion

  //#region methods & getters / before push action
  protected async _beforePullProcessAction(cloneChildren = false) {
    //#region @backendFunc
    this._beforeAnyActionOnGitRoot();
    await this.project.linkedProjects.cloneUnexistedLinkedProjects(
      'pull',
      cloneChildren,
    );
    //#endregion
  }
  //#endregion

  //#region methods & getters / resovle commit message
  protected async _getCommitMessage(
    typeofCommit: TypeOfCommit,
    args: string[],
    commitMessageRequired?: boolean,
  ): Promise<CommitData> {
    //#region @backendFunc
    let commitData: CommitData;
    if (this.useGitBranchesWhenCommitingAndPushing()) {
      let argsCommitData = await CommitData.getFromArgs(args, typeofCommit);
      // console.log({ argsCommitData })
      if (argsCommitData.message) {
        commitData = argsCommitData;
      } else {
        const commitDataBranch = await CommitData.getFromBranch(
          this.project.git.currentBranchName,
        );
        commitData = commitDataBranch;
        // console.log({ commitDataBranch })
      }
    } else {
      let argsCommitData = await CommitData.getFromArgs(args, typeofCommit);
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
          await translate(commitData.message, { from, to }),
        );
      }
    }

    return commitData;
    //#endregion
  }
  //#endregion

  /**
   * This will prevent accidental branch change for firedev projects
   * @returns branch name
   */
  duringPushWarnIfProjectNotOnSpecyficDevBranch(): string {
    return void 0;
  }
}
