import { execSync } from 'child_process'; // @backend

import { config } from 'tnp-config/src';
import { chalk, _, path, os, UtilsOs, fse, isElevated } from 'tnp-core/src';
import { crossPlatformPath } from 'tnp-core/src';
import { UtilsTerminal } from 'tnp-core/src';
import { UtilsNetwork } from 'tnp-core/src';

import {
  Helpers,
  LinkedProject,
  PushProcessOptions,
  UtilsVSCode,
} from '../../index';
import { TypeOfCommit, CommitData } from '../commit-data';
import { GhTempCode } from '../gh-temp-code';

import { BaseCommandLineFeature } from './base-command-line-feature';
import { BaseProject } from './base-project';
import type { BaseProjectResolver } from './base-project-resolver';

export class BaseGlobalCommandLine<
  PARAMS = any,
  PROJECT extends BaseProject<any, any> = BaseProject<any, any>,
  PROJECT_RESOLVER extends
    BaseProjectResolver<PROJECT> = BaseProjectResolver<PROJECT>,
> extends BaseCommandLineFeature<PARAMS, PROJECT, PROJECT_RESOLVER> {
  public _(): void {
    Helpers.error('Please select git command');
  }

  //#region commands / prevent cwd is not project
  /**
   * TODO return argument not need for now
   */
  async cwdIsProject(options?: {
    requireProjectWithGitRoot?: boolean;
  }): Promise<boolean> {
    const { requireProjectWithGitRoot } = options || {};

    if (!!this.project && !requireProjectWithGitRoot) {
      return true;
    }

    if (
      requireProjectWithGitRoot &&
      (!this.project || !this.project.git.isGitRoot)
    ) {
      const proj = this.ins.nearestTo(this.cwd, { findGitRoot: true });
      if (proj) {
        Helpers.info(`
              Current folder (${this.cwd})
              is not a git root folder, but nearest project with
              git root has been found in: ${chalk.bold(proj.genericName)}

              `);
        const useRoot = await Helpers.questionYesNo(
          'Would you like to use this project ?',
        );
        if (useRoot) {
          this.project = proj;
          this.cwd = proj.location;
          return true;
        } else {
          Helpers.error(
            `[${config.frameworkName}] This is not git root project folder`,
            true,
            true,
          );
        }
      } else {
        Helpers.error(
          `[${config.frameworkName}] This folder is not project folder`,
          false,
          true,
        );
      }
    }
    return true;
  }
  //#endregion

  //#region commands / hosts
  hosts() {
    Helpers.run(
      `code ${crossPlatformPath(UtilsNetwork.getEtcHostsPath())}`,
    ).sync();
    process.exit(0);
  }
  //#endregion

  //#region commands / count commits
  countCommits() {
    console.log(Helpers.git.countCommits(this.cwd));
    this._exit();
  }
  //#endregion

  //#region commands / remove submodules
  removeSubmodules() {
    Helpers.taskStarted('Removing submodules...');
    for (const folderAbsPath of Helpers.foldersFrom(this.cwd, {
      recursive: false,
    })) {
      if (Helpers.exists(crossPlatformPath([folderAbsPath, '.git']))) {
        try {
          Helpers.run(`git rm --cached ${path.basename(folderAbsPath)}`).sync();
        } catch (error) {}
      }
    }
    Helpers.taskDone('Done');
    this._exit();
  }

  removeSubmodule() {
    Helpers.taskStarted(`Removing submodules.. ${this.firstArg}`);
    if (
      Helpers.exists(crossPlatformPath([this.cwd, this.firstArg || '', '.git']))
    ) {
      try {
        Helpers.run(`git rm --cached ${this.firstArg}`).sync();
      } catch (error) {}
    }
    Helpers.taskDone('Done');
    this._exit();
  }
  //#endregion

  //#region commands / set editor
  async setEditor() {
    await this.ins.configDb.selectCodeEditor();
    this._exit();
  }
  //#endregion

  async cu() {
    await this.update();
  }

  async choreUpdate() {
    await this.update();
  }

  colorvscode() {
    this.settingsVscode();
  }

  /**
   * Generate or update .vscode/settings.json file color settings
   */
  settingsVscode() {
    const vscodePath = crossPlatformPath([this.cwd, '.vscode']);
    const settingsAbsPath = crossPlatformPath([vscodePath, 'settings.json']);
    if (!Helpers.exists(settingsAbsPath)) {
      Helpers.writeFile(settingsAbsPath, '{}');
    }
    const currentSettingsValue = Helpers.readJson(settingsAbsPath);

    currentSettingsValue['workbench.colorCustomizations'] = {
      'activityBar.background': `${UtilsVSCode.generateFancyColor()}`,
    };

    currentSettingsValue['workbench.colorCustomizations'][
      'statusBar.background'
    ] = UtilsVSCode.generateFancyColor();

    currentSettingsValue['workbench.colorCustomizations'][
      'statusBar.debuggingBackground'
    ] = `#15d8ff`; // nice blue for debugging

    Helpers.writeJson(settingsAbsPath, currentSettingsValue);

    this._exit();
  }

  //#region commands / quick git update
  /**
   * quick git update push
   */
  async update() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    Helpers.info('Updating & push project...');
    try {
      this.project.git.addAndCommit(
        `chore: ${!!this.firstArg ? this.firstArg : 'update'}`,
      );
    } catch (error) {}
    await this.project.git.pushCurrentBranch({
      askToRetry: true,
      forcePushNoQuestion: true,
    });
    Helpers.info('Done');
    this._exit();
  }

  private async updateProject(project: PROJECT, force = false): Promise<void> {
    try {
      await project.packageJson.bumpPatchVersion();
    } catch (error) {}
    try {
      project.git.addAndCommit(
        `chore: ${!!this.firstArg ? this.args.join(' ') : 'update'}`,
      );
    } catch (error) {}
    await project.git.pushCurrentBranch({
      askToRetry: true,
      forcePushNoQuestion: true,
      force,
    });

    if (!project.isMonorepo) {
      for (const child of project.children) {
        if (child.git.isGitRoot) {
          await this.updateProject(child, force);
        }
      }
    }
  }

  async deepUp(noExit = false) {
    await this.deepUpdate(noExit);
  }

  async deepUpForce(noExit = false) {
    await this.deepUpdateForce(noExit);
  }

  async deepUpdateForce(noExit = false) {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    Helpers.info(
      '(force) Deep updating & force pushing project with children...',
    );

    await this.updateProject(this.project, true);

    Helpers.info('Done');
    this._exit();
  }

  async deepUpdate(noExit = false) {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    Helpers.info('Deep updating & pushing project with children...');

    await this.updateProject(this.project);

    Helpers.info('Done');
    this._exit();
  }

  /**
   * Push update
   */
  async up() {
    await this.update();
  }

  /**
   * Push update
   */
  async pu() {
    await this.update();
  }
  //#endregion

  //#region commands / develop
  async develop() {
    // Helpers.clearConsole();
    Helpers.taskStarted(`getting all projects...`);
    const founded: BaseProject[] = (
      (await this.ins.projectsDb.getAllProjectsFromDB()) || []
    )
      .filter(p => Helpers.exists(p.location))
      .map(p => {
        const proj = this.ins.From(p.location);
        // console.log(`Proj for ${p.location} `, !!proj)
        if (proj) {
          return proj;
          // return proj.embeddedProject ? proj.embeddedProject : proj;
        }
        // const nereset = this.ins.nearestTo(p.location);
        // if (nereset) {

        //   const embeded = nereset.linkedProjects.find(l => crossPlatformPath([nereset.location, l.relativeClonePath]) === p.location);
        //   if (embeded) {
        //     return this.ins.From([nereset.location, embeded.relativeClonePath]);
        //   }
        // }
      })
      .filter(p => !!p);
    Helpers.taskDone(`found ${founded.length} projects...`);

    Helpers.taskStarted(`searching for project...`);
    // @ts-ignore
    const results = Helpers.uniqArray<BaseProject>(
      [
        ...Helpers.arrays.fuzzy(this.args.join(' '), founded, p => p.name)
          .results,
        ...Helpers.arrays.fuzzy(this.args.join(' '), founded, p => p.basename)
          .results,
        ...Helpers.arrays.fuzzy(this.args.join(' '), founded, p => p.location)
          .results,
      ],
      'location',
    );
    Helpers.taskDone(`found ${results.length} projects...`);

    const openInEditor = async (proj: BaseProject) => {
      Helpers.taskStarted(`Getting code editor info...`);
      const editor = await this.ins.configDb.getCodeEditor();
      Helpers.taskDone(`Got code editor info...`);
      const embededProject = proj.linkedProjects.embeddedProject as BaseProject;
      const porjToOpen = embededProject || proj;
      const locaitonFolderToOpen = porjToOpen.location;
      Helpers.info('Initing and opening project...');
      try {
        await porjToOpen?.struct();
      } catch (error) {}
      Helpers.run(`${editor} ${locaitonFolderToOpen}`).sync();
    };

    if (results.length === 1) {
      await openInEditor(_.first(results));
    } else if (results.length === 0) {
      Helpers.error(
        `No project found by name: "${this.args.join(' ')}"`,
        false,
        true,
      );
    } else {
      Helpers.info(`Opening console gui to select project...`);
      const res = await Helpers.consoleGui.select(
        'Select project to open',
        results.map(p => {
          return {
            name: p.genericName,
            value: p.location,
          };
        }),
        true,
      );
      await openInEditor(this.ins.From(res));
    }
    this._exit();
  }

  async dev() {
    return await this.develop();
  }
  //#endregion

  //#region commands / repulll
  async repul() {
    await this.repull();
  }

  async repull() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this.project.git.resetHard({ HEAD: 10 });
    await this.pull();
  }
  //#endregion

  //#region commands / pull
  async pul() {
    await this.pull();
  }

  async pull() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this.project.git.pullProcess({
      setOrigin: this.params['setOrigin'],
    });
    this._exit();
  }
  //#endregion

  //#region commands / pull all
  async pullAll() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this.project.git.pullProcess({
      setOrigin: this.params['setOrigin'],
    });
    this._exit();
  }
  //#endregion

  //#region commands / push and pull
  async pp() {
    const currentBranch = this.project.git.currentBranchName;
    this.project
      .run(
        `git push origin ${currentBranch} && git pull origin ${currentBranch}`,
      )
      .sync();
    console.log('Done push and pull');
    this._exit();
  }
  //#endregion

  //#region commands / reset
  private __resetInfo(branchToReset: string, withChildren: boolean) {
    Helpers.info(
      `

    YOU ARE RESETING ${withChildren ? 'EVERYTHING' : 'PROJECT'} ` +
        `TO BRANCH: ${chalk.bold(branchToReset)}

- curret project (${this.project.name})
${
  withChildren &&
  _.isArray(this.project.children) &&
  this.project.children.length > 0
    ? `- modules:\n${this.project.children
        .map(c => `\t${c.basename} (${chalk.yellow(c.name)})`)
        .join('\n')}`
    : ''
}
      `,
    );
  }

  async fetch() {
    try {
      this.project?.git?.fetch();
    } catch (error) {}
    this._exit();
  }

  async reset() {
    // Helpers.clearConsole();
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    const parent = this.project.parent as BaseProject;

    const branchFromLinkedProjectConfig =
      parent?.linkedProjects?.linkedProjects.find(l => {
        return (
          crossPlatformPath([parent.location, l.relativeClonePath]) ===
          this.project.location
        );
      })?.defaultBranch;

    let overrideBranchToReset =
      this.firstArg ||
      branchFromLinkedProjectConfig ||
      this.project.core?.branch ||
      this.project.git.getDefaultDevelopmentBranch() ||
      this.project.git.currentBranchName;

    if (this.project.core?.branch) {
      Helpers.info(`

        Core branch for project: ${this.project.core?.branch}

        `);
    }

    const resetOnlyChildren =
      !!this.project.linkedProjects.getLinkedProjectsConfig().resetOnlyChildren;

    const branches = Helpers.uniqArray([
      ...this.__filterBranchesByPattern(overrideBranchToReset),
      ...this.__filterBranchesByPattern(''),
    ]);

    const resetChildren = this.project.git.resetIsRestingAlsoChildren();

    if (resetChildren && resetOnlyChildren) {
      Helpers.info(`Reseting only children...for defualt branches.`);
    } else {
      if (branches.length > 0) {
        overrideBranchToReset = await this.__selectBrach(branches, 'reset');
      } else {
        Helpers.error(
          `No branch found by name "${overrideBranchToReset || this.firstArg}"`,
          false,
          true,
        );
      }
    }

    overrideBranchToReset = overrideBranchToReset || '';
    this.__resetInfo(
      overrideBranchToReset
        ? overrideBranchToReset
        : this.project.git.getDefaultDevelopmentBranch(),
      resetChildren,
    );

    let resetProject = this.project;

    if (this.project.git.isInsideGitRepo && !this.project.git.isGitRoot) {
      Helpers.warn(`You are not in root of git repo...`, false);
      resetProject = this.ins.nearestTo(
        crossPlatformPath([this.project.location, '..']),
        {
          findGitRoot: true,
        },
      );
      if (
        !(await Helpers.questionYesNo(
          `Would you like to reset root repo instead (project=${chalk.bold.red(resetProject.genericName)}) ?`,
        ))
      ) {
        Helpers.error(`Aborted`, false, true);
      }
    }

    const res = await Helpers.questionYesNo(
      `Reset hard and pull current project ` +
        `${resetChildren && resetProject.linkedProjects.linkedProjects.length > 0 ? '(and children)' : ''} ?`,
    );
    if (res) {
      await resetProject.resetProcess(overrideBranchToReset);
    }

    this._exit();
  }
  //#endregion

  //#region commands / soft
  async soft() {
    // TODO when aciton commit
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    const howManyCommits = Number(this.firstArg) || 1;

    _.times(howManyCommits, n => {
      console.log(
        `Resetting soft ${n + 1} commit "${this.project.git.lastCommitMessage()}"`,
      );
      this.project.git.resetSoftHEAD(1);
    });

    this._exit();
  }
  //#endregion

  //#region commands / rebase
  async rebase() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    const currentBranch = this.project.git.currentBranchName;
    let safeReset = 10;
    let rebaseBranch =
      this.firstArg || this.project.git.getDefaultDevelopmentBranch();

    const branches = this.__filterBranchesByPattern(rebaseBranch);

    if (branches.length > 1) {
      rebaseBranch = await this.__selectBrach(branches, 'rebase');
    } else if (branches.length === 1) {
      rebaseBranch = _.first(branches);
    } else {
      Helpers.error(
        `No rebase branch found by name "${rebaseBranch}"`,
        false,
        true,
      );
    }

    Helpers.info(`
      You are rebasing current branch (${currentBranch}) to ${rebaseBranch}

      Files from last commit:

      "${chalk.gray(
        await this.project.git.getCommitMessageByHash(
          this.project.git.lastCommitHash(),
        ),
      )}"
      (hash: ${chalk.gray(this.project.git.lastCommitHash())})

      are going to be applied after rebase.


      `);
    if (
      !(await UtilsTerminal.confirm({
        message: `Do you want to continue ?`,
        defaultValue: true,
      }))
    ) {
      this._exit();
    }

    try {
      this.project.git.resetHard();
      this.project.git.checkout(rebaseBranch);
      this.project.git.resetHard({ HEAD: safeReset });
      await this.project.git.pullCurrentBranch();
      this.project.git.checkout(currentBranch);
      this.project.git.resetSoftHEAD(1);
      this.project.git.stageAllFiles();
      this.project.git.stash();
      this.project.git.resetHard({ HEAD: safeReset });
      this.project.git.rebase(rebaseBranch);
      this.project.git.stashApply();
      await this.project.struct();
      Helpers.info('REBASE DONE');
    } catch (error) {
      Helpers.renderError(error);
      try {
        // dummy init to get back to previous vscode settings
        await this.project.init();
      } catch (error) {}

      Helpers.error('Not able to rebase', true, true);
    }
    this._exit();
  }
  //#endregion

  //#region commands / stash
  /**
   * stash only staged files
   */
  async stash() {
    Helpers.info(`Stashing only staged files...`);
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    this.project.git.stash({ onlyStaged: true });
    this._exit();
  }
  //#endregion

  //#region commands / stash all
  /**
   * stash all files
   */
  async stashAll() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    this.project.git.stageAllFiles();
    this.project.git.stash();
    this._exit();
  }
  //#endregion

  //#region commands / push all origins

  /**
   * push force to all orgins
   */
  async pushAllForce() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this.pushAll(true);
  }

  async pAllForce() {
    await this.pushAllForce();
  }

  async pAllf() {
    await this.pushAllForce();
  }

  async pAll() {
    await this.pushAll();
  }

  /**
   * push to all origins
   */
  async pushAll(force = false) {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    const remotes = this.project.git.allOrigins;
    Helpers.info(`

    Remotes for repo:

${remotes.map((r, i) => `${i + 1}. ${r.origin} ${r.url}`).join('\n')}

`);

    for (let index = 0; index < remotes.length; index++) {
      const { origin, url } = remotes[index];
      Helpers.taskStarted(`Pushing to ${chalk.bold(origin)} (${url})...`);
      await this.push({ force, origin, noExit: true });
      Helpers.taskDone(`Pushed to ${origin}`);
    }
    this._exit();
  }
  //#endregion

  //#region commands / push force
  async forcePush() {
    await this.push({ force: true, typeofCommit: 'feature' });
  }

  async pushForce() {
    await this.push({ force: true, typeofCommit: 'feature' });
  }
  //#endregion

  //#region commands / commit
  /**
   * Commit and push this for single repo
   */
  async commit(
    options: {
      force?: boolean;
      typeofCommit?: TypeOfCommit;
      origin?: string;
      commitMessageRequired?: boolean;
      noExit?: boolean;
    } = {},
  ) {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this.project.git.meltActionCommits();
    await this.project.git.pushProcess({
      ...options,
      forcePushNoQuestion: options.force,
      args: this.args,
      exitCallBack: () => {
        this._exit();
      },
      skipChildren: true,
      overrideCommitMessage: this.args.join(' '),
      setOrigin: this.params['setOrigin'],
      currentOrigin: this.project.git.originURL,
    });
    if (options.noExit) {
      return;
    }
    this._exit();
  }
  //#endregion

  //#region commands / push
  async _preventPushPullFromNotCorrectBranch() {
    while (true) {
      const devBranch =
        this.project.git.duringPushWarnIfProjectNotOnSpecyficDevBranch();
      if (!!devBranch && devBranch !== this.project.git.currentBranchName) {
        Helpers.warn(
          `

        ${this.project.genericName}

        You are not on ${devBranch} branch. Please switch to this branch and try again



        `,
          false,
        );
        const options = {
          open: { name: 'Open in vscode' },
          continue: { name: 'Continue (check again)' },
          continueForce: { name: 'Continue (without checking)' },
          exit: { name: 'Exit process' },
        };
        const res = await Helpers.selectChoicesAsk(
          'What you want to do ?',
          Object.keys(options).map(k => {
            return { name: options[k].name, value: k };
          }),
        );
        if (res === 'continue') {
          continue;
        }
        if (res === 'exit') {
          this._exit();
        }
        if (res === 'open') {
          this.project.run('code . ').sync();
          continue;
        }
        if (res === 'continueForce') {
          return;
        }
      }
      return;
    }
  }

  async qPush() {
    await this.quickPush();
  }

  async quickPush() {
    await this.push({ skipLint: true });
  }

  async repushauto() {
    await this.rePush(true);
  }

  async rePush(skipQuesion = false) {
    const lastCommitMessage = this.project.git.lastCommitMessage();

    this.project.git.resetSoftHEAD();
    this.project.git.stageAllFiles();

    this.project.git.commit(lastCommitMessage);
    if (!skipQuesion) {
      Helpers.info(`Last fixed commit:
${lastCommitMessage}

      ...`);
      await UtilsTerminal.pressAnyKeyToContinueAsync({
        message: `Press any key to force push`,
      });
    }

    await this.project.git.pushCurrentBranch({
      forcePushNoQuestion: true,
      force: true,
    });
    this._exit();
  }

  async push(options: PushProcessOptions = {}): Promise<void> {
    // console.log('args', this.args);
    // console.log(`argsWithParams "${this.argsWithParams}"` );
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this._preventPushPullFromNotCorrectBranch();

    await this.project.git.pushProcess({
      ...options,
      forcePushNoQuestion: options.force,
      args: options?.overrideCommitMessage
        ? (options?.overrideCommitMessage || '').split(' ')
        : this.args,
      exitCallBack: () => {
        this._exit();
      },
      setOrigin: this.params['setOrigin'],
      currentOrigin: this.project.git.originURL,
    });
    if (options.noExit) {
      return;
    }
    this._exit();
  }
  //#endregion

  //#region commands / melt
  public async melt() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this.meltUpdateCommits({ hideInfo: true });
    this._exit();
  }
  //#endregion

  //#region commands / melt
  public async meltAll() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this.meltUpdateCommits({ hideInfo: true });
    for (const child of this.project.children) {
      await this.__meltCommitsFunc(child, { hideInfo: true });
    }
    this._exit();
  }
  //#endregion

  //#region commands / melt updat ecommits
  private async __meltCommitsFunc(
    project: BaseProject,
    options?: { hideInfo?: boolean },
  ) {
    options = options || {};
    const meltedCommits = project.git.meltActionCommits();
    if (meltedCommits > 0) {
      Helpers.logInfo(
        `${meltedCommits} has been soft reset (melted) in ${project.genericName}`,
      );
    } else {
      Helpers.logInfo(`No commits to melt for project ${project.genericName}`);
    }
  }

  private async meltUpdateCommits(options?: { hideInfo?: boolean }) {
    await this.__meltCommitsFunc(this.project, options);
  }
  //#endregion

  //#region commands / push feature
  async pf() {
    await this.pushFeature();
  }

  async pRel() {
    await this.pushRelease();
  }

  async pRelease() {
    await this.pushRelease();
  }

  async pushRelease() {
    await this.meltUpdateCommits();
    await this.push({
      typeofCommit: 'release',
      commitMessageRequired: true,
      overrideCommitMessage:
        `${_.first(this.project.releaseProcess.getReleaseWords())} ` +
        `version ${this.project.packageJson.version}`,
    });
  }

  async mPush() {
    await this.meltPush();
  }

  async fmPush() {
    await this.forceMeltPush();
  }

  async mfPush() {
    await this.forceMeltPush();
  }

  async mforcePush() {
    await this.forceMeltPush();
  }

  async meltforcePush() {
    await this.forceMeltPush();
  }

  async forceMeltPush() {
    await this.meltPush(true);
  }

  async meltPush(force = false) {
    await this.meltUpdateCommits();
    await this.push({
      mergeUpdateCommits: true,
      force,
    });
  }

  async pushFeature() {
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'feature', commitMessageRequired: true });
  }
  //#endregion

  //#region commands / push fix
  async pushFix() {
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'bugfix', commitMessageRequired: true });
  }
  pfix() {
    this.pushFix();
  }
  //#endregion

  //#region commands / push chore
  async pushChore() {
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'chore', commitMessageRequired: true });
  }

  async pc() {
    await this.pushChore();
  }
  //#endregion

  //#region commands / push refactor
  async pushRefactor() {
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'refactor', commitMessageRequired: true });
  }

  async pushref() {
    await this.pushRefactor();
  }

  async pref() {
    await this.pushRefactor();
  }
  //#endregion

  //#region commands / push style
  async pushStyle() {
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'style', commitMessageRequired: true });
  }
  async pstyl() {
    await this.pushStyle();
  }

  async pstyle() {
    await this.pushStyle();
  }
  //#endregion

  //#region commands / push docs
  async pushDocs() {
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'docs', commitMessageRequired: true });
  }

  async pd() {
    await this.pushDocs();
  }

  async pdocs() {
    await this.pushDocs();
  }
  //#endregion

  //#region commands / push test
  async pushTest() {
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'test', commitMessageRequired: true });
  }

  async pTest() {
    await this.pushTest();
  }
  async pTests() {
    await this.pushTest();
  }
  //#endregion

  //#region commands / push perf
  async pushPerf() {
    await this.meltUpdateCommits();
    await this.push({
      typeofCommit: 'performance',
      commitMessageRequired: true,
    });
  }
  //#endregion

  //#region commands / push ci
  async pushCi() {
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'ci', commitMessageRequired: true });
  }
  //#endregion

  //#region commands / select branch
  async branch() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this.project.struct();
    try {
      this.project.git.fetch();
    } catch (error) {}
    let branchName = this.firstArg;
    const branches = this.__filterBranchesByPattern(branchName);

    if (branches.length > 0) {
      branchName = await this.__selectBrach(branches, 'checkout');
    } else {
      Helpers.error(`No branch found by name "${branchName}"`, false, true);
    }
    try {
      this.project.git.stageAllFiles();
      this.project.git.stash();
    } catch (error) {}
    this.project.git.checkout(branchName);
    this._exit();
  }
  //#endregion

  //#region commands / push build
  async pushBuild() {
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'build', commitMessageRequired: true });
  }
  //#endregion

  //#region commands / set origin
  async SET_ORIGIN() {
    let newOriginNameOrUrl: string = this.firstArg;
    if (newOriginNameOrUrl === 'ssh') {
      newOriginNameOrUrl = Helpers.git.originHttpToSsh(
        Helpers.git.getOriginURL(this.cwd),
      );
    }
    if (newOriginNameOrUrl === 'http') {
      newOriginNameOrUrl = Helpers.git.originSshToHttp(
        Helpers.git.getOriginURL(this.cwd),
      );
    }

    if (Helpers.git.isInsideGitRepo(this.cwd)) {
      Helpers.run(`git remote rm origin`, { cwd: this.cwd }).sync();
      Helpers.run(`git remote add origin ${newOriginNameOrUrl} `, {
        cwd: this.cwd,
      }).sync();
      Helpers.info(`Done`);
    } else {
      Helpers.error(`This folder is not a git repo... `, false, true);
    }

    this._exit();
  }
  //#endregion

  //#region commands / rename origin
  async RENAME_ORIGIN() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    const newOriginNameOrUrl: string = this.firstArg;
    const proj = this.project;
    if (proj && proj.git.isInsideGitRepo) {
      proj.git.renameOrigin(newOriginNameOrUrl);
    } else {
      Helpers.error(`This folder is not a git repo... `, false, true);
    }
    this._exit();
  }
  //#endregion

  //#region commands / last hash tag
  async LAST_TAG_HASH() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    Helpers.info(this.project.git.lastTagHash());
    this._exit();
  }
  //#endregion

  //#region commands / last tag
  async LAST_TAG() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    const proj = this.project;
    Helpers.info(`

    last tag: ${proj.git.lastTagVersionName}
    last tag hash: ${proj.git.lastTagHash()}

`);
    this._exit();
  }
  //#endregion

  //#region commands / check tag exists
  CHECK_TAG_EXISTS() {
    Helpers.info(
      `tag "${this.firstArg}"  exits = ${Helpers.git.checkTagExists(this.firstArg)} `,
    );
    this._exit();
  }
  //#endregion

  //#region commands / lint
  /**
   * TODO move somewhere
   */
  async lint() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this.project.lint();
  }
  //#endregion

  //#region commands / version
  /**
   * TODO move somewhere
   */
  async version() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: false }))) {
      return;
    }
    console.log('Current project verison: ' + this.project.packageJson.version);
    this._exit();
  }
  //#endregion

  //#region commands / init
  /**
   * TODO move somewhere
   */
  async init() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: false }))) {
      return;
    }
    await this.project.init();
    this._exit();
  }

  /**
   * init parent and first level children
   */
  async initAll() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: false }))) {
      return;
    }
    await this.project.init();
    for (const child of this.project.children) {
      await child.init();
    }
    this._exit();
  }
  //#endregion

  //#region commands / struct
  /**
   * TODO move somewhere
   */
  async struct() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: false }))) {
      return;
    }
    await this.project.struct();
    this._exit();
  }
  //#endregion

  //#region commands / info
  /**
   * TODO move somewhere
   */
  async info() {
    if (
      !(await this.cwdIsProject({
        requireProjectWithGitRoot: false,
      }))
    ) {
      return;
    }
    Helpers.clearConsole();
    Helpers.info(await this.project.info());
    await this.project.linkedProjects.saveAllLinkedProjectsToDB();
    this._exit();
  }
  //#endregion

  //#region commands / info
  async modified() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    const proj = this.project;
    const libs: BaseProject[] = proj.children.filter(child => {
      process.stdout.write('.');
      return (child as BaseProject).git.thereAreSomeUncommitedChangeExcept([
        config.file.package_json,
      ]);
    });
    console.log('\n' + Helpers.terminalLine());
    Helpers.info(
      libs.length
        ? libs
            .map(
              c =>
                `${chalk.bold(c.name)} (${c.git.uncommitedFiles.map(p => chalk.black(path.basename(p))).join(', ')})`,
            )
            .join('\n')
        : 'Nothing modifed',
    );
    this._exit();
  }
  //#endregion

  //#region commands / update
  async refresh() {
    const linkedProjects = LinkedProject.detect(this.project.location, {
      checkAlsoNonRepos: true,
    }).filter(linkedProj =>
      this.project.ins.From([
        this.project.location,
        linkedProj.relativeClonePath,
      ]),
    );

    if (
      await Helpers.questionYesNo(`

    Deteced project:
${linkedProjects.map(l => `- ${l.relativeClonePath}`).join('\n')}


Would you like to update current project configuration?`)
    ) {
      this.project.linkedProjects.addLinkedProjects(linkedProjects);
    }
    await this.project.init();
    Helpers.info(`Linked projects updated`);
    this._exit(0);
  }
  //#endregion

  //#region commands / changes
  async changes() {
    Helpers.info(await this.project.git.changesSummary());
    Helpers.terminalLine();
    for (const chil of this.project.children) {
      Helpers.info(await chil.git.changesSummary());
    }
    this._exit();
  }
  //#endregion

  //#region commands / all tags
  async allTags() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    const allTags = await Helpers.git.getAllTags(this.cwd);
    console.log(allTags);
    this._exit();
  }
  //#endregion

  //#region commands / remove tag
  async removeTag() {
    let tagToRemove = this.firstArg;
    if (!tagToRemove) {
      const allTags = await Helpers.git.getAllTags(this.cwd);
      tagToRemove = await UtilsTerminal.select({
        question: `Select tag to remove`,
        autocomplete: true,
        choices: allTags.map(t => {
          return { name: t, value: t };
        }),
      });
    }

    Helpers.git.removeTag(this.cwd, tagToRemove);
    this._exit();
  }
  //#endregion

  //#region commands / branch name
  BRANCH_NAME() {
    console.log(
      `current branch name: "${Helpers.git.currentBranchName(process.cwd())}"`,
    );
    this._exit();
  }
  //#endregion

  //#region commands / remotes
  REMOTES() {
    console.log(Helpers.git.allOrigins(this.cwd));
    this._exit();
  }

  async SET_REMOTE_SSH() {
    await Helpers.git.changeRemoteFromHttpsToSSh(this.cwd);
    this._exit();
  }

  async SET_REMOTE_http() {
    await Helpers.git.changeRemoveFromSshToHttps(this.cwd);
    this._exit();
  }

  async SET_REMOTE_https() {
    await this.SET_REMOTE_http();
  }

  protected _resolveChildFromArg() {
    const { resolved: projFromArg, clearedCommand } =
      Helpers.cliTool.resolveItemFromArgsBegin<PROJECT>(this.args, arg =>
        this.ins.From([this.cwd, arg]),
      );
    if (!!projFromArg) {
      this.args = clearedCommand.split(' ');
      this.cwd = projFromArg.location;
      this.project = projFromArg;
    }
  }

  origin() {
    this._resolveChildFromArg();
    console.log(Helpers.git.getOriginURL(this.cwd));
    this._exit();
  }

  remote() {
    console.log(Helpers.git.getOriginURL(this.cwd));
    this._exit();
  }

  originHttp() {
    console.log(
      Helpers.git.originSshToHttp(Helpers.git.getOriginURL(this.cwd)),
    );
    this._exit();
  }

  originHttps() {
    console.log(
      Helpers.git.originSshToHttp(Helpers.git.getOriginURL(this.cwd)),
    );
    this._exit();
  }

  originssh() {
    console.log(
      Helpers.git.originHttpToSsh(Helpers.git.getOriginURL(this.cwd)),
    );
    this._exit();
  }

  origins() {
    this.REMOTES();
  }
  //#endregion

  //#region commands / git config
  gitConfig() {
    const root = Helpers.git.findGitRoot(this.cwd);
    Helpers.run(`code ${crossPlatformPath([root, '.git', 'config'])}`).sync();
    this._exit();
  }
  //#endregion

  //#region commands / lastCommitHash
  LAST_COMMIT_HASH() {
    console.log(Helpers.git.lastCommitHash(this.cwd));
    this._exit();
  }
  //#endregion

  //#region commands / commit message by hash
  async COMMIT_MESSAGE_BY_HASH() {
    const hash = this.firstArg;
    console.log(await this.project.git.getCommitMessageByHash(hash));
    this._exit();
  }
  //#endregion

  //#region commands / last 5 commit hashes

  async LAST_5_COMMITS() {
    for (let index = 0; index < 5; index++) {
      const hash = await this.project.git.getCommitHashByIndex(index);
      console.log(hash);
    }
    this._exit();
  }
  //#endregion

  //#region commands / update deps from
  async updateDepsFrom() {
    let locations: string[] =
      this.args.join(' ').trim() === '' ? [] : this.args;

    if (_.isArray(locations)) {
      locations = locations.map(l => {
        if (path.isAbsolute(l)) {
          return path.resolve(l);
        }
        return path.resolve(path.join(this.cwd, l));
      });
    }
    this.project.packageJson.updateDepsFrom(locations);

    this._exit();
  }
  //#endregion

  //#region is terminal supported
  isSupportedTaonTerminal() {
    console.log(`Terminal is supported: ${Helpers.isSupportedTaonTerminal}`);
    this._exit();
  }
  //#endregion

  //#region is terminal running inside cmd
  isRunningInWindowsCmd() {
    console.log(
      `Is terminal running insdie cmd.exe: ${UtilsOs.isRunningInWindowsCmd()}`,
    );
    this._exit();
  }
  //#endregion

  //#region is running inside powershell
  isRunningInWindowsPowerShell() {
    console.log(
      `Is terminal running insdie powershell: ${UtilsOs.isRunningInWindowsPowerShell()}`,
    );
    this._exit();
  }
  //#endregion

  //#region prox ext
  async INSTALL_PROJECT_EXTENSIONS(): Promise<void> {
    await this.INSTALL_PROJ_EXT();
  }
  async INSTALL_PROJECT_EXT(): Promise<void> {
    await this.INSTALL_PROJ_EXT();
  }
  async INS_PROJ_EXT(): Promise<void> {
    await this.INSTALL_PROJ_EXT();
  }
  async INSTALL_PROJ_EXT(): Promise<void> {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: false }))) {
      return;
    }
    this.project.vsCodeHelpers.recreateExtensions();
    const p = this.project.pathFor('.vscode/extensions.json');
    const extensions: { recommendations: string[] } = Helpers.readJson(
      p,
      { recommendations: [] },
      true,
    );
    Helpers.clearConsole();
    await this.project.vsCodeHelpers.installExtensions(
      extensions.recommendations,
      true,
    );
    this._exit();
  }
  //#endregion

  //#region proj db
  async projdb() {
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: false }))) {
      return;
    }
    Helpers.info(`Projects db location:
    ${this.project.linkedProjects.projectsDbLocation}

    opening in vscode...

    `);
    Helpers.run(
      `code ${this.project.linkedProjects.projectsDbLocation}`,
    ).sync();
    this._exit();
  }
  //#endregion

  //#region filter all project branches by pattern
  private __filterBranchesByPattern(
    branchPatternOrBranchName: string,
  ): string[] {
    const branches = Helpers.arrays.uniqArray(
      this.project.git.getBranchesNamesBy(branchPatternOrBranchName) ||
        this.project.getMainBranches(),
    );
    // console.log('branches', branches);
    return branches;
  }
  //#endregion

  //#region select branch from list of branches
  private async __selectBrach(
    branches: string[],
    task: 'rebase' | 'reset' | 'checkout',
  ) {
    const actionWithoutChildren =
      task === 'reset' && !this.project.git.resetIsRestingAlsoChildren();
    const childrenMsg = actionWithoutChildren
      ? '(without children)'
      : this.project.children.length == 0
        ? '(no children in project)'
        : '(with children)';

    return await Helpers.autocompleteAsk(
      `Choose branch to ${task} in this project ${childrenMsg}: `,
      branches.map(b => {
        return { name: b, value: b };
      }),
    );
  }
  //#endregion

  //#region commands / clone
  async clone() {
    let url = this.firstArg;
    const originType: 'ssh' | 'http' = this.params['setOrigin'];

    if (originType) {
      if (originType === 'ssh') {
        url = Helpers.git.originHttpToSsh(url);
      }
      if (originType === 'http') {
        url = Helpers.git.originSshToHttp(url);
      }
    }
    await Helpers.git.clone({
      url,
      cwd: this.cwd,
    });
    this._exit();
  }
  //#endregion

  //#region commands / gh temp
  async ghSave() {
    await new GhTempCode(this.cwd, this.project).init().save();
    this._exit();
  }
  async ghRestore() {
    await new GhTempCode(this.cwd, this.project).init().restore();
    this._exit();
  }
  //#endregion

  //#region commands / start cli service ports worker

  async ports() {
    await this.ins.portsWorker.terminalUI.infoScreen();
  }

  /**
   * tnp startCliServicePortsWorker --restart
   */
  async startCliServicePortsWorker() {
    await this.ins.portsWorker.cliStartProcedure(this.params);
  }
  //#endregion

  //#region commands / pause terminal
  pauseTerminal() {
    Helpers.pressKeyAndContinue();
    this._exit();
  }
  //#endregion

  //#region commands / gh pages init
  async ghPagesInit() {
    await this.project.init();
    await this.project.staticPages.init(
      this.params['provider'] || 'github',
      !!this.params['full'],
    );
    Helpers.run('code .', {
      cwd: this.project.staticPages.mainFolderAbsPath,
    }).sync();
    this._exit();
  }
  //#endregion

  //#region commands / is port in use
  async isPortInUse() {
    const port = parseInt(this.firstArg);
    console.log(`Port ${port} is in use: ${await UtilsOs.isPortInUse(port)}`);
    this._exit();
  }
  //#endregion

  //#region commands / proc menu
  //#region @notForNpm
  async procMenu() {
    //#region @backendFunc
    const { BaseProcessManger, CommandConfig } = await import(
      './base-process-manager'
    );

    const ngBuildLibCommand = CommandConfig.from({
      name: 'TSC',
      cmd: 'node -e "let i = 0; setInterval(() => console.log(\'TSC lib Compiled success \' + (++i)), 1000)"',
      goToNextCommandWhenOutput: {
        stdoutContains: 'TSC lib Compiled success 5',
      },
    });

    const angularNormalNgServe = CommandConfig.from({
      shouldBeActiveOrAlreadyBuild: [ngBuildLibCommand],
      name: 'NG Normal',
      cmd: 'node -e "let i = 0; setInterval(() => console.log(\'NG NORMAL: Hello from ng --watch \' + (++i)), 1200)"',
      goToNextCommandWhenOutput: {
        stdoutContains: 'NG NORMAL: Hello from ng --watch 5',
      },
    });

    const angularWebsqlNgServe = CommandConfig.from({
      shouldBeActiveOrAlreadyBuild: [ngBuildLibCommand],
      name: 'NG websql',
      cmd: 'node -e "let i = 0; setInterval(() => console.log(\'NG WEBSQL: Hello from ng --watch \' + (++i)), 1200)"',
      goToNextCommandWhenOutput: {
        stdoutContains: 'NG WEBSQL: Hello from ng --watch 5',
      },
    });

    const electronNormalNgServe = CommandConfig.from({
      shouldBeActiveOrAlreadyBuild: [angularNormalNgServe],
      name: 'ELECTRON Normal',
      cmd: 'node -e "let i = 0; setInterval(() => console.log(\'ELECTRON Normal: Hello from electron \' + (++i)), 1500)"',
    });

    const updateAssets = CommandConfig.from({
      name: 'Update assets',
      cmd: 'node -e "let i = 0; setInterval(() => console.log(\'Updated assets \' + (++i)), 1000)"',
    });

    await new BaseProcessManger(this.project).init({
      title: 'What do you want to build?',
      header: 'Starting process selection...',
      watch: true,
      commands: [
        ngBuildLibCommand,
        angularNormalNgServe,
        angularWebsqlNgServe,
        electronNormalNgServe,
        updateAssets,
      ],
    });
    //#endregion
  }
  //#endregion
  //#endregion

  //#region commands / proc info
  procInfo() {
    this.processInfo();
  }

  processInfo() {
    Helpers.info(`

    Is running in CLI mode: ${UtilsOs.isRunningInCliMode()}
    Is running in Mocha test: ${UtilsOs.isRunningInMochaTest()}
    Is running in VSCode extension: ${UtilsOs.isRunningInVscodeExtension()}
    Is running in Electron: ${UtilsOs.isRunningInElectron()}
    Is running in Docker: ${UtilsOs.isRunningInDocker()}
    Is running in WebSQL: ${UtilsOs.isRunningInWebSQL()}
    Is running in WSL: ${UtilsOs.isRunningInWsl()}
    Is running in Linux graphics capable environment: ${UtilsOs.isRunningInLinuxGraphicsCapableEnvironment()}
    Is running in Node: ${UtilsOs.isRunningInNode()}
    Is running in Browser: ${UtilsOs.isRunningInBrowser()}

      `);
    this._exit();
  }
  //#endregion

  //#region commands / last git tag
  lastGitTag() {
    console.log('Latest tag');
    console.log(this.project?.git.lastTagVersionName);
    this._exit();
  }
  //#endregion

  //#region commands / check ports
  async checkPorts() {
    const ports = this.args
      .join(' ')
      .replace(/\,/, '')
      .split(' ')
      .map(p => {
        return parseInt(p);
      });

    console.log(`Checking ports: ${ports.join(', ')}`);

    if (ports.length === 0) {
      Helpers.error(`No ports provided`, false, true);
    }
    for (const port of ports) {
      const isPortInUse = await UtilsOs.isPortInUse(port);
      console.log(
        `Port ${port} is in use: ${isPortInUse ? chalk.red('YES') : chalk.green('NO')}`,
      );
    }
    this._exit();
  }
  //#endregion

  //#region commands / remove symlinks
  removeSymlinksDryRun() {
    Helpers.removeSymlinks(this.project.nodeModules.path, {
      dryRun: true,
    });
  }
  //#endregion

  //#region commands / select java
  async selectJava() {
    const selectedJava = await this.project.javaJdk.selectJdkVersion();
    this.project.javaJdk.updateJavaHomePath(selectedJava);
  }
  //#endregion

  //#region commands / select tomcat
  async selectTomcat() {
    const selectedTomcat = await this.project.javaJdk.selectTomcatVersion();
    this.project.javaJdk.updateTomcatHomePath(selectedTomcat);
    this._exit();
  }
  //#endregion

  async simulateDomain() {
    //#region @backendFunc
    UtilsTerminal.clearConsole();
    let domain = this.firstArg || '';
    if (!UtilsNetwork.isValidDomain(domain)) {
      Helpers.error(`Invalid domain: "${domain}"`, false, true);
    }
    if (!(await isElevated())) {
      Helpers.error(
        `You must run this command with elevated privileges (sudo or as administrator)`,
        false,
        true,
      );
    }

    const url = new URL(
      domain.startsWith('http') ? domain : `http://${domain}`,
    );
    domain = url.hostname;

    UtilsNetwork.setEtcHost(domain);
    Helpers.info(`

      You can access the domain at:

      ${chalk.underline(`http://${domain}`)}
      ${chalk.underline(`https://${domain}`)}

      (domain is now pointing to ${chalk.bold('localhost')}):

      PRESS ANY KEY TO STOP REMOVE DOMAIN FROM /etc/hosts
      AND STOP SIMULATION
      
      `);

    let closing = false;
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {
      if (closing) {
        return;
      }

      closing = true;
      console.log('Removing domain from /etc/hosts');
      UtilsNetwork.removeEtcHost(domain);
      process.exit(0);
    });
    //#endregion
  }
}
