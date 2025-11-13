//#region imports
import * as readline from 'readline'; // @backend

import { Subject } from 'rxjs';
import { config, fileName, folderName } from 'tnp-config/src';
import {
  chalk,
  _,
  path,
  os,
  UtilsOs,
  fse,
  isElevated,
  Utils,
  UtilsJson,
  CoreModels,
  UtilsProcess,
} from 'tnp-core/src';
import { crossPlatformPath } from 'tnp-core/src';
import { UtilsTerminal } from 'tnp-core/src';
import { UtilsNetwork, UtilsDotFile } from 'tnp-core/src';
import { child_process } from 'tnp-core/src'; //@backend
import { UtilsCliClassMethod } from 'tnp-core/src';

import {
  BaseCLiWorkerStartMode,
  Helpers,
  LinkedProject,
  PushProcessOptions,
  UtilsJava,
  UtilsVSCode,
  UtilsZip,
} from '../../index';
import { TypeOfCommit, CommitData } from '../commit-data';
import { GhTempCode } from '../gh-temp-code';

import { BaseCommandLineFeature } from './base-command-line-feature';
import { BaseProject } from './base-project';
import type { BaseProjectResolver } from './base-project-resolver';
//#endregion

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
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region commands / hosts
  hosts() {
    //#region @backendFunc
    Helpers.run(
      `code ${crossPlatformPath(UtilsNetwork.getEtcHostsPath())}`,
    ).sync();
    process.exit(0);
    //#endregion
  }
  //#endregion

  //#region commands / count commits
  countCommits() {
    //#region @backendFunc
    console.log(Helpers.git.countCommits(this.cwd));
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / remove submodules
  removeSubmodules() {
    //#region @backendFunc
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
    //#endregion
  }

  removeSubmodule() {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region commands / set editor
  async setEditor() {
    //#region @backendFunc
    await this.ins.configDb.selectCodeEditor();
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / api update
  async upapi() {
    //#region @backendFunc
    await this.apiUpdate();
    //#endregion
  }

  async apiup() {
    //#region @backendFunc
    await this.apiUpdate();
    //#endregion
  }

  async apiUpdate() {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    Helpers.info('Updating & push project...');
    try {
      this.project.git.addAndCommit(
        `chore: api ${!!this.firstArg ? this.firstArg : 'update'}`,
      );
    } catch (error) {}
    await this.project.git.pushCurrentBranch({
      askToRetry: true,
      forcePushNoQuestion: true,
    });
    Helpers.info('Done');
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / chore update
  async cu() {
    //#region @backendFunc
    await this.update();
    //#endregion
  }

  async choreUpdate() {
    //#region @backendFunc
    await this.update();
    //#endregion
  }
  //#endregion

  //#region commands / color vscode
  colorvscode() {
    //#region @backendFunc
    this.settingsVscode();
    //#endregion
  }
  //#endregion

  //#region commands / settings vscode
  /**
   * Generate or update .vscode/settings.json file color settings
   */
  settingsVscode() {
    //#region @backendFunc
    this.refreshVscodeColors();
    //#endregion
  }

  refreshVscodeColors() {
    //#region @backendFunc
    this._regenerateVscodeSettingsColors();
    this._exit();
    //#endregion
  }

  protected _regenerateVscodeSettingsColors(overideBottomColor?: string): void {
    //#region @backendFunc
    UtilsVSCode.regenerateVsCodeSettingsColors(this.cwd, overideBottomColor);
    //#endregion
  }
  //#endregion

  //#region commands / quick git update
  /**
   * quick git update push
   */
  async update() {
    //#region @backendFunc
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
    //#endregion
  }

  private async updateProject(project: PROJECT, force = false): Promise<void> {
    //#region @backendFunc
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
    //#endregion
  }

  async deepUp(noExit = false) {
    //#region @backendFunc
    await this.deepUpdate(noExit);
    //#endregion
  }

  async deepUpForce(noExit = false) {
    //#region @backendFunc
    await this.deepUpdateForce(noExit);
    //#endregion
  }

  async deepUpdateForce(noExit = false) {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    Helpers.info(
      '(force) Deep updating & force pushing project with children...',
    );

    await this.updateProject(this.project, true);

    Helpers.info('Done');
    this._exit();
    //#endregion
  }

  async deepUpdate(noExit = false) {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    Helpers.info('Deep updating & pushing project with children...');

    await this.updateProject(this.project);

    Helpers.info('Done');
    this._exit();
    //#endregion
  }

  /**
   * Push update
   */
  async up() {
    //#region @backendFunc
    await this.update();
    //#endregion
  }

  /**
   * Push update
   */
  async pu() {
    //#region @backendFunc
    await this.update();
    //#endregion
  }
  //#endregion

  //#region commands / develop
  async develop() {
    //#region @backendFunc
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
    //#endregion
  }

  async dev() {
    //#region @backendFunc
    return await this.develop();
    //#endregion
  }
  //#endregion

  //#region commands / repulll
  async repul() {
    //#region @backendFunc
    await this.repull();
    //#endregion
  }

  async repull() {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this.project.git.resetHard({ HEAD: 10 });
    await this.pull();
    //#endregion
  }
  //#endregion

  //#region commands / pull
  async pul() {
    //#region @backendFunc
    await this.pull();
    //#endregion
  }

  async pull() {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this.project.git.pullProcess({
      setOrigin: this.params['setOrigin'],
    });
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / pull all
  async pullAll() {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this.project.git.pullProcess({
      setOrigin: this.params['setOrigin'],
    });
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / push and pull
  async pp() {
    //#region @backendFunc
    const currentBranch = this.project.git.currentBranchName;
    this.project
      .run(
        `git push origin ${currentBranch} && git pull origin ${currentBranch}`,
      )
      .sync();
    console.log('Done push and pull');
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / reset
  private __resetInfo(branchToReset: string, withChildren: boolean) {
    //#region @backendFunc
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
    //#endregion
  }

  async fetch() {
    //#region @backendFunc
    try {
      this.project?.git?.fetch();
    } catch (error) {}
    this._exit();
    //#endregion
  }

  async reset() {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region commands / soft
  async soft() {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region commands / rebase
  async rebase() {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region commands / stash
  /**
   * stash only staged files
   */
  async stash() {
    //#region @backendFunc
    Helpers.info(`Stashing only staged files...`);
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    this.project.git.stash({ onlyStaged: true });
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / stash all
  /**
   * stash all files
   */
  async stashAll() {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    this.project.git.stageAllFiles();
    this.project.git.stash();
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / push all origins

  /**
   * push force to all origins
   */
  async pushAllForce(): Promise<void> {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this.pushAll(true);
    //#endregion
  }

  async pAllForce(): Promise<void> {
    //#region @backendFunc
    await this.pushAllForce();
    //#endregion
  }

  async pAllf(): Promise<void> {
    //#region @backendFunc
    await this.pushAllForce();
    //#endregion
  }

  async pAll(): Promise<void> {
    //#region @backendFunc
    await this.pushAll();
    //#endregion
  }

  /**
   * push to all origins
   */
  async pushAll(force = false): Promise<void> {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region commands / push force
  async forcePush(): Promise<void> {
    //#region @backendFunc
    await this.push({ force: true, typeofCommit: 'feature' });
    //#endregion
  }

  async pushForce(): Promise<void> {
    //#region @backendFunc
    await this.push({ force: true, typeofCommit: 'feature' });
    //#endregion
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
  ): Promise<void> {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region commands / push
  async _preventPushPullFromNotCorrectBranch(): Promise<void> {
    //#region @backendFunc
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
    //#endregion
  }

  async qPush(): Promise<void> {
    //#region @backendFunc
    await this.quickPush();
    //#endregion
  }

  async quickPush(): Promise<void> {
    //#region @backendFunc
    await this.push({ skipLint: true });
    //#endregion
  }

  async repushauto(): Promise<void> {
    //#region @backendFunc
    await this.rePush(true);
    //#endregion
  }

  async rePush(skipQuesion = false): Promise<void> {
    //#region @backendFunc
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
    //#endregion
  }

  async push(options: PushProcessOptions = {}): Promise<void> {
    //#region @backendFunc
    // console.log('args', this.args);
    // console.log(`argsWithParams "${this.argsWithParams}"` );
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this._preventPushPullFromNotCorrectBranch();

    if (
      !options.overrideCommitMessage &&
      this.project.git.useBranchNameDirectlyAsCommitMessage()
    ) {
      options.overrideCommitMessage = (this.project.git.currentBranchName || '')
        .split('-')
        .join(' ');

      const jiraNumbers =
        CommitData.extractAndOrderJiraNumbers(
          this.project.git.currentBranchName,
        ) || [];

      for (const jiraNum of jiraNumbers) {
        options.overrideCommitMessage = options.overrideCommitMessage.replace(
          jiraNum.replace('-', ' '),
          jiraNum,
        );
      }
    }

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
    //#endregion
  }
  //#endregion

  //#region commands / melt
  public async melt(): Promise<void> {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this.meltUpdateCommits({ hideInfo: true });
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / melt
  public async meltUp() {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }

    const alreadyProcessedOrigins: string[] = [];

    const processProject = async (proj: BaseProject): Promise<void> => {
      if (alreadyProcessedOrigins.includes(proj.git.originURL)) {
        return;
      }
      alreadyProcessedOrigins.push(proj.git.originURL);
      Helpers.clearConsole();
      await proj.git.resolveLastChanges({
        tryAutomaticActionFirst: false,
        projectNameAsOutputPrefix:
          this.project.location !== proj.location ? proj.name : void 0,
      });

      for (const child of proj.children) {
        await processProject(child);
      }
    };

    await processProject(this.project);
    Helpers.info('All projects are up to date with remote');
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / melt
  public async meltAll() {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this.meltUpdateCommits({ hideInfo: true });
    for (const child of this.project.children) {
      await this.__meltCommitsFunc(child, { hideInfo: true });
    }
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / melt updat ecommits
  private async __meltCommitsFunc(
    project: BaseProject,
    options?: { hideInfo?: boolean },
  ) {
    //#region @backendFunc
    options = options || {};
    const meltedCommits = project.git.meltActionCommits();
    if (meltedCommits > 0) {
      Helpers.logInfo(
        `${meltedCommits} has been soft reset (melted) in ${project.genericName}`,
      );
    } else {
      Helpers.logInfo(`No commits to melt for project ${project.genericName}`);
    }
    //#endregion
  }

  private async meltUpdateCommits(options?: { hideInfo?: boolean }) {
    //#region @backendFunc
    await this.__meltCommitsFunc(this.project, options);
    //#endregion
  }
  //#endregion

  //#region commands / push feature
  async pf() {
    //#region @backendFunc
    await this.pushFeature();
    //#endregion
  }

  async pRel() {
    //#region @backendFunc
    await this.pushRelease();
    //#endregion
  }

  async pRelease() {
    //#region @backendFunc
    await this.pushRelease();
    //#endregion
  }

  async pushRelease() {
    //#region @backendFunc
    await this.meltUpdateCommits();
    await this.push({
      typeofCommit: 'release',
      commitMessageRequired: true,
      overrideCommitMessage:
        `${_.first(this.project.releaseProcess.getReleaseWords())} ` +
        `version ${this.project.packageJson.version}`,
    });
    //#endregion
  }

  async mPush() {
    //#region @backendFunc
    await this.meltPush();
    //#endregion
  }

  async fmPush() {
    //#region @backendFunc
    await this.forceMeltPush();
    //#endregion
  }

  async mfPush() {
    //#region @backendFunc
    await this.forceMeltPush();
    //#endregion
  }

  async mforcePush() {
    //#region @backendFunc
    await this.forceMeltPush();
    //#endregion
  }

  async meltforcePush() {
    //#region @backendFunc
    await this.forceMeltPush();
    //#endregion
  }

  async forceMeltPush() {
    //#region @backendFunc
    await this.meltPush(true);
    //#endregion
  }

  async meltPush(force = false) {
    //#region @backendFunc
    await this.meltUpdateCommits();
    await this.push({
      mergeUpdateCommits: true,
      force,
    });
    //#endregion
  }

  async pushFeature() {
    //#region @backendFunc
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'feature', commitMessageRequired: true });
    //#endregion
  }
  //#endregion

  //#region commands / push fix
  async pushFix() {
    //#region @backendFunc
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'bugfix', commitMessageRequired: true });
    //#endregion
  }
  pfix() {
    //#region @backendFunc
    this.pushFix();
    //#endregion
  }
  //#endregion

  //#region commands / push chore
  async pushChore() {
    //#region @backendFunc
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'chore', commitMessageRequired: true });
    //#endregion
  }

  async pc() {
    //#region @backendFunc
    await this.pushChore();
    //#endregion
  }
  //#endregion

  //#region commands / push refactor
  async pushRefactor() {
    //#region @backendFunc
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'refactor', commitMessageRequired: true });
    //#endregion
  }

  async pushref() {
    //#region @backendFunc
    await this.pushRefactor();
    //#endregion
  }

  async pref() {
    //#region @backendFunc
    await this.pushRefactor();
    //#endregion
  }
  //#endregion

  //#region commands / push style
  async pushStyle() {
    //#region @backendFunc
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'style', commitMessageRequired: true });
    //#endregion
  }
  async pstyl() {
    //#region @backendFunc
    await this.pushStyle();
    //#endregion
  }

  async pstyle() {
    //#region @backendFunc
    await this.pushStyle();
    //#endregion
  }
  //#endregion

  //#region commands / push docs
  async pushDocs() {
    //#region @backendFunc
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'docs', commitMessageRequired: true });
    //#endregion
  }

  async pd() {
    //#region @backendFunc
    await this.pushDocs();
    //#endregion
  }

  async pdocs() {
    //#region @backendFunc
    await this.pushDocs();
    //#endregion
  }
  //#endregion

  //#region commands / push test
  async pushTest() {
    //#region @backendFunc
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'test', commitMessageRequired: true });
    //#endregion
  }

  async pTest() {
    //#region @backendFunc
    await this.pushTest();
    //#endregion
  }
  async pTests() {
    //#region @backendFunc
    await this.pushTest();
    //#endregion
  }
  //#endregion

  //#region commands / push perf
  async pushPerf() {
    //#region @backendFunc
    await this.meltUpdateCommits();
    await this.push({
      typeofCommit: 'performance',
      commitMessageRequired: true,
    });
    //#endregion
  }
  //#endregion

  //#region commands / push ci
  async pushCi() {
    //#region @backendFunc
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'ci', commitMessageRequired: true });
    //#endregion
  }
  //#endregion

  //#region commands / select branch
  async branch() {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region commands / push build
  async pushBuild() {
    //#region @backendFunc
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'build', commitMessageRequired: true });
    //#endregion
  }
  //#endregion

  //#region commands / set origin
  async SET_ORIGIN() {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region commands / rename origin
  async RENAME_ORIGIN() {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region commands / last hash tag
  async LAST_TAG_HASH() {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    Helpers.info(this.project.git.lastTagHash());
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / last tag
  async LAST_TAG() {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    const proj = this.project;
    Helpers.info(`

    last tag: ${proj.git.lastTagVersionName}
    last tag hash: ${proj.git.lastTagHash()}

`);
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / check tag exists
  CHECK_TAG_EXISTS() {
    //#region @backendFunc
    Helpers.info(
      `tag "${this.firstArg}"  exits = ${Helpers.git.checkTagExists(this.firstArg)} `,
    );
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / lint
  /**
   * TODO move somewhere
   */
  async lint() {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    await this.project.lint();
    //#endregion
  }
  //#endregion

  //#region commands / version
  /**
   * TODO move somewhere
   */
  async version() {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: false }))) {
      return;
    }
    console.log('Current project verison: ' + this.project.packageJson.version);
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / init
  /**
   * TODO move somewhere
   */
  async init() {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: false }))) {
      return;
    }
    await this.project.init();
    this._exit();
    //#endregion
  }

  /**
   * init parent and first level children
   */
  async initAll() {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: false }))) {
      return;
    }
    await this.project.init();
    for (const child of this.project.children) {
      await child.init();
    }
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / struct
  /**
   * TODO move somewhere
   */
  async struct() {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: false }))) {
      return;
    }
    await this.project.struct();
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / info
  /**
   * TODO move somewhere
   */
  async info() {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region commands / info
  async modified() {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region commands / update
  async refresh(): Promise<void> {
    //#region @backendFunc
    await this.project.refreshChildrenProjects({
      askUserAboutUpdate: true,
    });
    this._exit(0);
    //#endregion
  }
  //#endregion

  //#region commands / changes
  async changes() {
    //#region @backendFunc
    Helpers.info(await this.project.git.changesSummary());
    Helpers.terminalLine();
    for (const chil of this.project.children) {
      Helpers.info(await chil.git.changesSummary());
    }
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / all tags
  async allTags() {
    //#region @backendFunc
    if (!(await this.cwdIsProject({ requireProjectWithGitRoot: true }))) {
      return;
    }
    const allTags = await Helpers.git.getAllTags(this.cwd);
    console.log(allTags);
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / remove tag
  async removeTag() {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region commands / branch name
  BRANCH_NAME() {
    //#region @backendFunc
    console.log(
      `current branch name: "${Helpers.git.currentBranchName(process.cwd())}"`,
    );
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / remotes
  REMOTES() {
    //#region @backendFunc
    console.log(Helpers.git.allOrigins(this.cwd));
    this._exit();
    //#endregion
  }

  async SET_REMOTE_SSH() {
    //#region @backendFunc
    await Helpers.git.changeRemoteFromHttpsToSSh(this.cwd);
    this._exit();
    //#endregion
  }

  async SET_REMOTE_http() {
    //#region @backendFunc
    await Helpers.git.changeRemoveFromSshToHttps(this.cwd);
    this._exit();
    //#endregion
  }

  async SET_REMOTE_https() {
    //#region @backendFunc
    await this.SET_REMOTE_http();
    //#endregion
  }

  protected _resolveChildFromArg() {
    //#region @backendFunc
    const { resolved: projFromArg, clearedCommand } =
      Helpers.cliTool.resolveItemFromArgsBegin<PROJECT>(this.args, arg =>
        this.ins.From([this.cwd, arg]),
      );
    if (!!projFromArg) {
      this.args = clearedCommand.split(' ');
      this.cwd = projFromArg.location;
      this.project = projFromArg;
    }
    //#endregion
  }

  origin() {
    //#region @backendFunc
    this._resolveChildFromArg();
    console.log(Helpers.git.getOriginURL(this.cwd));
    this._exit();
    //#endregion
  }

  remote() {
    //#region @backendFunc
    console.log(Helpers.git.getOriginURL(this.cwd));
    this._exit();
    //#endregion
  }

  originHttp() {
    //#region @backendFunc
    console.log(
      Helpers.git.originSshToHttp(Helpers.git.getOriginURL(this.cwd)),
    );
    this._exit();
    //#endregion
  }

  originHttps() {
    //#region @backendFunc
    console.log(
      Helpers.git.originSshToHttp(Helpers.git.getOriginURL(this.cwd)),
    );
    this._exit();
    //#endregion
  }

  originssh() {
    //#region @backendFunc
    console.log(
      Helpers.git.originHttpToSsh(Helpers.git.getOriginURL(this.cwd)),
    );
    this._exit();
    //#endregion
  }

  origins() {
    //#region @backendFunc
    this.REMOTES();
    //#endregion
  }
  //#endregion

  //#region commands / git config
  gitConfig() {
    //#region @backendFunc
    const root = Helpers.git.findGitRoot(this.cwd);
    Helpers.run(`code ${crossPlatformPath([root, '.git', 'config'])}`).sync();
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / lastCommitHash
  LAST_COMMIT_HASH() {
    //#region @backendFunc
    console.log(Helpers.git.lastCommitHash(this.cwd));
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / commit message by hash
  async COMMIT_MESSAGE_BY_HASH() {
    //#region @backendFunc
    const hash = this.firstArg;
    console.log(await this.project.git.getCommitMessageByHash(hash));
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / last 5 commit hashes

  async LAST_5_COMMITS() {
    //#region @backendFunc
    for (let index = 0; index < 5; index++) {
      const hash = await this.project.git.getCommitHashByIndex(index);
      console.log(hash);
    }
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / update deps from
  async updateDepsFrom() {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region is terminal supported
  isSupportedTaonTerminal() {
    //#region @backendFunc
    console.log(`Terminal is supported: ${Helpers.isSupportedTaonTerminal}`);
    this._exit();
    //#endregion
  }
  //#endregion

  //#region is terminal running inside cmd
  isRunningInWindowsCmd() {
    //#region @backendFunc
    console.log(
      `Is terminal running insdie cmd.exe: ${UtilsOs.isRunningInWindowsCmd()}`,
    );
    this._exit();
    //#endregion
  }
  //#endregion

  //#region is running inside powershell
  isRunningInWindowsPowerShell() {
    //#region @backendFunc
    console.log(
      `Is terminal running insdie powershell: ${UtilsOs.isRunningInWindowsPowerShell()}`,
    );
    this._exit();
    //#endregion
  }
  //#endregion

  //#region prox ext
  async INSTALL_PROJECT_EXTENSIONS(): Promise<void> {
    //#region @backendFunc
    await this.INSTALL_PROJ_EXT();
    //#endregion
  }
  async INSTALL_PROJECT_EXT(): Promise<void> {
    //#region @backendFunc
    await this.INSTALL_PROJ_EXT();
    //#endregion
  }
  async INS_PROJ_EXT(): Promise<void> {
    //#region @backendFunc
    await this.INSTALL_PROJ_EXT();
    //#endregion
  }
  async INSTALL_PROJ_EXT(): Promise<void> {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region proj db
  async projdb() {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region filter all project branches by pattern
  private __filterBranchesByPattern(
    branchPatternOrBranchName: string,
  ): string[] {
    //#region @backendFunc
    const branches = Helpers.arrays.uniqArray(
      this.project.git.getBranchesNamesBy(branchPatternOrBranchName) ||
        this.project.getMainBranches(),
    );
    // console.log('branches', branches);
    return branches;
    //#endregion
  }
  //#endregion

  //#region select branch from list of branches
  private async __selectBrach(
    branches: string[],
    task: 'rebase' | 'reset' | 'checkout',
  ) {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region commands / clone
  async clone() {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region commands / gh temp
  async ghSave() {
    //#region @backendFunc
    await new GhTempCode(this.cwd, this.project).init().save();
    this._exit();
    //#endregion
  }
  async ghRestore() {
    //#region @backendFunc
    await new GhTempCode(this.cwd, this.project).init().restore();
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / start cli service ports worker

  async ports() {
    //#region @backendFunc
    await this.ins.portsWorker.terminalUI.infoScreen();
    //#endregion
  }

  /**
   * tnp startCliServicePortsWorker --restart
   */
  async startCliServicePortsWorker(): Promise<void> {
    //#region @backendFunc
    await this.ins.portsWorker.cliStartProcedure({
      methodOptions: {
        calledFrom: 'terminal command',
        cliParams: {
          ...this.params,
          mode: BaseCLiWorkerStartMode.IN_CURRENT_PROCESS,
        },
      },
    });
    //#endregion
  }
  //#endregion

  //#region commands / wait for any key
  async waitForUserAnyKey() {
    //#region @backendFunc
    console.log('Press any key to exit...');
    await UtilsTerminal.waitForUserAnyKey(async () => {
      console.log('Exiting...');
      this._exit();
    });
    //#endregion
  }
  //#endregion

  //#region commands / pause terminal
  pauseTerminal() {
    //#region @backendFunc
    Helpers.pressKeyAndContinue();
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / sleep terminal
  sleepTerminal() {
    //#region @backendFunc
    Helpers.info(`Sleeping terminal for 1 second... before exit`);
    Helpers.sleep(1);
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / gh pages init
  async ghPagesInit() {
    //#region @backendFunc
    await this.project.init();
    await this.project.staticPages.init(
      this.params['provider'] || 'github',
      !!this.params['full'],
    );
    Helpers.run('code .', {
      cwd: this.project.staticPages.mainFolderAbsPath,
    }).sync();
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / is port in use
  async isPortInUse() {
    //#region @backendFunc
    const port = parseInt(this.firstArg);
    console.log(`Port ${port} is in use: ${await UtilsOs.isPortInUse(port)}`);
    this._exit();
    //#endregion
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
    //#region @backendFunc
    this.processInfo();
    //#endregion
  }

  processInfo() {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region commands / last git tag
  lastGitTag() {
    //#region @backendFunc
    console.log('Latest tag');
    console.log(this.project?.git.lastTagVersionName);
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / check ports
  async checkPort() {
    //#region @backendFunc
    await this.checkPorts();
    //#endregion
  }

  async checkPorts() {
    //#region @backendFunc
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
    //#endregion
  }
  //#endregion

  //#region commands / remove symlinks
  removeSymlinksDryRun() {
    //#region @backendFunc
    Helpers.removeSymlinks(this.project.nodeModules.path, {
      dryRun: true,
    });
    //#endregion
  }
  //#endregion

  //#region commands / select java
  async selectJava() {
    //#region @backendFunc
    const selectedJava = await UtilsJava.selectJdkVersion();
    UtilsJava.updateJavaHomePath(selectedJava);
    //#endregion
  }
  //#endregion

  //#region commands / select tomcat
  async selectTomcat() {
    //#region @backendFunc
    const selectedTomcat = await UtilsJava.selectTomcatVersion();
    UtilsJava.updateTomcatHomePath(selectedTomcat);
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / ln
  LN() {
    //#region @backendFunc
    const [source, dest] = this.args;
    Helpers.createSymLink(source, dest);
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / copy
  copy() {
    //#region @backendFunc
    let [from, to] = this.args;
    from = path.isAbsolute(from)
      ? crossPlatformPath(from)
      : crossPlatformPath([this.cwd, from]);
    to = path.isAbsolute(to)
      ? crossPlatformPath(to)
      : crossPlatformPath([this.cwd, to]);

    if (path.basename(to) !== path.basename(from)) {
      to = crossPlatformPath([to, path.basename(from)]);
    }
    Helpers.taskStarted(`Copying from ${from} to ${to}`);
    if (!Helpers.exists(from)) {
      Helpers.error(
        `Source file or folder "${from}" does not exist`,
        false,
        true,
      );
    }
    if (Helpers.isFolder(from)) {
      Helpers.copy(from, to);
    } else {
      Helpers.copyFile(from, to);
    }

    Helpers.taskDone(`Copied`);
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / simulate domain
  async simulateDomain() {
    //#region @backendFunc
    // UtilsTerminal.clearConsole();
    await UtilsNetwork.simulateDomain(this.args);
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / preview
  async preview(): Promise<void> {
    //#region @backendFunc
    //#region handle preview of docker compose
    if (
      [fileName.docker_compose_yml, fileName.compose_yml].includes(
        path.basename(this.firstArg),
      )
    ) {
      const simulateDomain = this.params['domain'] || this.params['domains'];

      const firstArg = path.isAbsolute(this.firstArg)
        ? this.firstArg
        : crossPlatformPath([this.cwd, this.firstArg]);

      const cwd = crossPlatformPath(path.dirname(firstArg));
      const composeFileName = path.basename(firstArg);
      //   import { spawn } from 'child_process';
      //   import { readFileSync } from 'fs';
      //   import { resolve } from 'path';
      const envPath = crossPlatformPath([cwd, '.env']);

      const COMPOSE_PROJECT_NAME = UtilsDotFile.getValueFromDotFile(
        envPath,
        'COMPOSE_PROJECT_NAME',
      );

      const envContent = UtilsDotFile.getValuesKeysAsJsonObject(envPath) || {};
      const allDomains = Utils.uniqArray(
        Object.keys(envContent)
          .filter(key => {
            return key.startsWith('FRONTEND_HOST_URL_');
          })
          .map(domainKey => envContent[domainKey] as string),
      );

      if (simulateDomain && allDomains.length === 0) {
        Helpers.error(
          `No domains to simulate found in .env file.

          Before release build update your

          env.ts or env.angular-node-app.ENVIRONTMENT_NAME.ts with

          ${chalk.bold(`website.useDomain = true;`)}

          `,
          false,
          true,
        );
      }
      const project = this.ins.From(cwd);

      await project.docker.updateDockerComposePorts();

      let closing = false;

      const triggerRevertChangesToEtcHosts = new Subject<void>();
      if (simulateDomain) {
        await UtilsNetwork.simulateDomain(allDomains, {
          triggerRevertChangesToEtcHosts,
        });
      }

      const child = project.docker.getDockerComposeUpExecChildProcess('up');

      console.log(
        `


     ${chalk.bold('PRESS ANY KEY TO STOP')} RUNNING CONTAINER(S) ` +
          `FOR ${chalk.bold.underline(COMPOSE_PROJECT_NAME as string)}
  ${simulateDomain ? `AND SIMULATING DOMAINS: ${allDomains.join(', ')} IN ETC/HOST` : ''}


  `,
      );

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', () => {
        if (closing) {
          return;
        }
        // If we are already closing, ignore further input

        closing = true;
        triggerRevertChangesToEtcHosts.next();
        console.log('Stopping container...');

        // TODO probably UtilsProcess.killProcess() better
        child.kill('SIGINT');

        console.log('Exiting...');
        const downProcess =
          project.docker.getDockerComposeUpExecChildProcess('down');

        downProcess.on('close', code => {
          console.log(`docker compose down exited with code ${code}`);
          process.exit(0);
        });
      });
    } else {
      Helpers.error(
        `You can preview only docker-compose.yml or compose.yml files`,
        false,
        true,
      );
    }
    //#endregion
    //#endregion
  }
  //#endregion

  //#region commands / shorten
  /**
   * read huge file and display only lines with specyfic words
   */
  async shorten() {
    //#region @backendFunc
    const rl = readline.createInterface({
      input: fse.createReadStream(
        path.isAbsolute(this.firstArg)
          ? crossPlatformPath(this.firstArg)
          : crossPlatformPath([this.cwd, this.firstArg]),
        { encoding: 'utf8' },
      ),
      crlfDelay: Infinity,
    });

    const keywords = this.args.splice(1);
    console.log(`Searching for keywords: ${keywords.join(', ')}`);
    for await (const line of rl) {
      if (keywords.some(word => line.includes(word))) {
        console.log(line);
      }
    }
    Helpers.info(`File processed`);
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / dump packages versions
  dumpPackagesVersions(): void {
    //#region @backendFunc
    const getData = (location: string) => {
      const version = Helpers.readValueFromJson(
        crossPlatformPath([location, fileName.package_json]),
        'version',
      );
      const name = Helpers.readValueFromJson(
        crossPlatformPath([location, fileName.package_json]),
        'name',
      );
      return { version, name };
    };

    const pkgs = Helpers.foldersFrom([this.cwd, folderName.node_modules], {
      recursive: false,
    })
      .reduce((arr, c) => {
        if (path.basename(c).startsWith('@')) {
          const newData = Helpers.foldersFrom([
            this.cwd,
            folderName.node_modules,
            path.basename(c),
          ]).map(c2 => getData(c2));
          return arr.concat(newData);
        }
        return arr.concat(getData(c));
      }, [])
      .reduce((arr, c) => {
        return _.merge(arr, { [c.name]: c.version });
      }, {});
    Helpers.writeJson([this.cwd, 'packages-versions.json'], pkgs);
    Helpers.info(`packages-versions.json created with ${pkgs.length} packages`);
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / zip
  async zip() {
    //#region @backendFunc
    let folderPath = crossPlatformPath(this.firstArg);
    if (!path.isAbsolute(folderPath)) {
      folderPath = crossPlatformPath([this.cwd, this.firstArg]);
    }
    if (!Helpers.exists(folderPath)) {
      Helpers.error(
        `File or folder to zip does not exist: ${folderPath}`,
        false,
        true,
      );
    }
    if (!Helpers.isFolder(folderPath)) {
      Helpers.error(
        `You can zip only folders. Provided path is not a folder: ${folderPath}`,
        false,
        true,
      );
    }
    const zipFilePath = await UtilsZip.zipDir(folderPath, {
      overrideIfZipFileExists: true,
    });
    Helpers.info(`Created zip file: ${zipFilePath}`);
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / unzip
  async unzip() {
    //#region @backendFunc
    let folderPath = crossPlatformPath(this.firstArg);
    if (!path.isAbsolute(folderPath)) {
      folderPath = crossPlatformPath([this.cwd, this.firstArg]);
    }
    if (!Helpers.exists(folderPath)) {
      Helpers.error(
        `File or folder to zip does not exist: ${folderPath}`,
        false,
        true,
      );
    }
    await UtilsZip.unzipArchive(folderPath);
    Helpers.info(`Created zip file: ${folderPath.replace('.zip', '')}`);
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / start transmission
  async startTransmission() {
    //#region @backendFunc
    await this._removeTransmission();
    const userProfile = process.env.USERPROFILE || os.homedir();
    const downloadsDir = path.join(userProfile, 'Downloads');
    const configDir = path.join(userProfile, 'transmission-config');

    await UtilsProcess.killProcessOnPort(9091);
    const ctrl = await this.ins.portsWorker.getRemoteControllerFor({
      methodOptions: {
        calledFrom: `${config.frameworkName} startTransmission`,
      },
    });

    const data = await ctrl
      .registerAndAssignPort('transmission service for whole system')
      .request();
    const mainPort = data.body.json.port;

    Helpers.info(`Transmission will use port: ${mainPort}`);

    const args = [
      'run',
      '-d',
      '--name',
      'transmission',
      '-p',
      '9091:9091',
      '-p',
      `${mainPort}:${mainPort}`,
      '-p',
      `${mainPort}:${mainPort}/udp`,
      '-e',
      'TZ=Europe/Warsaw',
      '-e',
      `TRANSMISSION_PEER_PORT=${mainPort}`,
      '-v',
      `${downloadsDir}:/downloads`,
      '-v',
      `${configDir}:/config`,
      '--restart',
      'unless-stopped',
      'linuxserver/transmission:latest',
    ];

    console.log('Running:', 'docker', args.join(' '));

    const child = child_process.spawn('docker', args, { stdio: 'inherit' });

    child.on('exit', code => {
      if (code === 0) {
        console.log('✅ Transmission container started');
        console.log('➡ Open http://localhost:9091 in your browser');
      } else {
        console.error('❌ Docker exited with code', code);
      }
      this._exit();
    });
    //#endregion
  }

  async _removeTransmission() {
    //#region @backendFunc
    return new Promise<void>(resolve => {
      const args = ['rm', '-f', 'transmission'];

      console.log('Running:', 'docker', args.join(' '));

      const child = child_process.spawn('docker', args, { stdio: 'inherit' });

      child.on('exit', code => {
        if (code === 0) {
          console.log('🗑️  Transmission container removed');
        } else {
          // In bash `2>$null` would silence errors; here we just log a note
          console.warn(
            '⚠️ Could not remove container (maybe it doesn’t exist)',
          );
        }
        resolve();
      });
    });
    //#endregion
  }
  //#endregion

  //#region commands  / backup branch
  async backupBranch() {
    //#region @backendFunc
    await this.project.git.backupBranch(this.firstArg);
    this._exit();
    //#endregion
  }

  async bb() {
    //#region @backendFunc
    await this.backupBranch();
    //#endregion
  }
  //#endregion

  //#region commands / count code lines
  async countCodeLines() {
    //#region @backendFunc
    await this.countLines();
    //#endregion
  }

  async countCode() {
    //#region @backendFunc
    await this.countLines();
    //#endregion
  }

  async countLines() {
    //#region @backendFunc
    let extensions = (this.args || []).filter(f => !!f).map(ext => `.${ext}`);
    extensions = extensions.length ? extensions : ['.ts', '.tsx'];

    console.log('Counting SLOC for extensions: ', extensions.join(', '));
    const sloc = require('sloc');
    let total = {
      source: 0,
      comment: 0,
      single: 0,
      block: 0,
      empty: 0,
      total: 0,
    };

    const skip = [
      'node_modules',
      '.',
      'tmp-',
      'environments',
      'dist',
      'browser',
    ];

    const walk = (folder: string) => {
      const entries = fse.readdirSync(folder, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(folder, entry.name);

        if (skip.some(s => entry.name.startsWith(s))) {
          continue;
        }

        if (entry.isDirectory()) {
          // console.log('Processing: ', path.basename(fullPath));
          walk(fullPath);
        } else if (extensions.includes(path.extname(entry.name))) {
          const code = fse.readFileSync(fullPath, 'utf8');
          const stats = sloc(code, path.extname(entry.name).slice(1)); // e.g., "ts" or "js"
          for (const key in total) {
            total[key] += stats[key] ?? 0;
          }
        }
      }
    };

    walk(
      crossPlatformPath([
        this.cwd,
        // 'src'
      ]),
    );

    console.log('📊 SLOC Results:');
    console.table(total);

    this._exit?.(); // your existing exit hook
    return total;
    //#endregion
  }
  //#endregion

  //#region commands / is node version ok
  isNodeVersionOk() {
    //#region @backendFunc
    try {
      UtilsOs.isNodeVersionOk({
        throwErrorIfNotOk: true,
      });
      console.info(`Node.js version is OK: ${process.version}`);
      this._exit();
    } catch (error) {
      console.error(error);
      this._exit(1);
    }
    //#endregion
  }
  //#endregion

  //#region commands / pwd
  pwd(): void {
    config.frameworkName = 'taon';
    console.log(crossPlatformPath(this.cwd));
    this._exit();
  }
  //#endregion

  //#region commands / less-more big text files preview
  async more() {
    //#region @backendFunc
    const pathToFile = path.isAbsolute(this.firstArg)
      ? crossPlatformPath(this.firstArg)
      : crossPlatformPath([this.cwd, this.firstArg]);
    console.log(`Displaying file: ${pathToFile}`);
    await UtilsTerminal.previewLongListGitLogLike(
      Helpers.readFile(pathToFile) || '< empty log file >',
    );
    this._exit();
    //#endregion
  }

  async less() {
    //#region @backendFunc
    await this.more();
    //#endregion
  }
  //#endregion

  //#region commands / mp3
  /**
   *  npm install --global bin-version-check-cli
   *  npm i -g yt-dlp
   *  choco install ffmpeg
   */
  MP3(args) {
    //#region @backendFunc
    const downloadPath = crossPlatformPath([
      UtilsOs.getRealHomeDir(),
      'Downloads',
      'mp3-from-websites',
    ]);
    if (!Helpers.exists(downloadPath)) {
      Helpers.mkdirp(downloadPath);
    }

    Helpers.run(
      `cd ${downloadPath} && yt-dlp --verbose --extract-audio --audio-format mp3 ` +
        args,
      {
        output: true,
        cwd: downloadPath,
      },
    ).sync();
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / mp4
  MP4(args) {
    //#region @backendFunc
    const downloadPath = crossPlatformPath([
      UtilsOs.getRealHomeDir(),
      'Downloads',
      'mp4-from-websites',
    ]);
    // yt-dlp --print filename -o "%(uploader)s-%(upload_date)s-%(title)s.%(ext)s"
    Helpers.run(
      'yt-dlp --verbose  -S "res:1080,fps" -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" ' +
        args,
      {
        output: true,
        cwd: downloadPath,
      },
    ).sync();
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / gif from video
  gif(): void {
    //#region @backendFunc
    const cwdToProcess = path.isAbsolute(this.firstArg)
      ? path.dirname(this.firstArg)
      : this.cwd;
    const basenameToProcess = path.basename(this.firstArg);
    const gifDownloadPath = crossPlatformPath([
      UtilsOs.getRealHomeDir(),
      'Downloads',
      'gif-from-videos',
      basenameToProcess.replace(path.extname(basenameToProcess), '.gif'),
    ]);
    const palleteBasename = `${_.kebabCase(path.basename(gifDownloadPath))}-palette.png`;
    Helpers.removeFileIfExists([cwdToProcess, palleteBasename]);
    const quality = `fps=10,scale=960`;
    Helpers.info(`Preparing gif from video (creating palette)...`);
    Helpers.run(
      `ffmpeg -i ${basenameToProcess} -vf "${quality}:-1:flags=lanczos,palettegen"` +
        ` ${palleteBasename} `,
      {
        output: true,
        cwd: cwdToProcess,
      },
    ).sync();
    Helpers.info(`Preparing gif from video (creating video)...`);
    Helpers.run(
      `ffmpeg -i ${basenameToProcess} -i ` +
        ` ${palleteBasename}  -filter_complex ` +
        `"${quality}:-1:flags=lanczos[x];[x][1:v]paletteuse" ${path.basename(gifDownloadPath)}`,
      {
        output: true,
        cwd: cwdToProcess,
      },
    ).sync();

    Helpers.removeFileIfExists(gifDownloadPath);
    Helpers.move(
      crossPlatformPath([cwdToProcess, path.basename(gifDownloadPath)]),
      gifDownloadPath,
    );

    Helpers.taskDone(`Done creating gif from video:

      ${gifDownloadPath}

      `);
    Helpers.openFolderInFileExplorer(path.dirname(gifDownloadPath));
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / kill zscaller
  killZs() {
    //#region @backendFunc
    this.killZscaller();
    //#endregion
  }

  startZs() {
    //#region @backendFunc
    this.startZscaller();
    //#endregion
  }

  zsKill() {
    //#region @backendFunc
    this.killZscaller();
    //#endregion
  }

  zsStart() {
    //#region @backendFunc
    this.startZscaller();
    //#endregion
  }

  startZscaller() {
    //#region @backendFunc
    const commands = [
      // `open -a /Applications/Zscaler/Zscaler.app --hide`,
      `open -a /Applications/Zscaler/Zscaler.app`,
      `sudo find /Library/LaunchDaemons -name '*zscaler*' -exec launchctl load {} \\;`,
    ];
    for (const cmd of commands) {
      try {
        Helpers.run(cmd, {
          // stdio that will let me pass password in child process
          stdio: 'inherit',
        }).sync();
      } catch (error) {}
    }
    Helpers.info(`Zscaller started`);
    this._exit();
    //#endregion
  }

  killZscaller() {
    //#region @backendFunc
    const commands = [
      `find /Library/LaunchAgents -name '*zscaler*' -exec launchctl unload {} \\;`,
      `sudo find /Library/LaunchDaemons -name '*zscaler*' -exec launchctl unload {} \\;`,
      `sudo killall -9 Zscaler ZscalerTunnel ZscalerAppServices`,
    ];
    for (const cmd of commands) {
      try {
        Helpers.run(cmd, {
          // stdio that will let me pass password in child process
          stdio: 'inherit',
        }).sync();
      } catch (error) {}
    }
    Helpers.info(`Zscaller killed`);
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / has command
  async hasCommand(): Promise<void> {
    //#region @backendFunc
    if (!this.firstArg) {
      Helpers.error(`You need to provide command name to check`, false, true);
    }
    const hasSudo = await UtilsOs.commandExistsAsync(this.firstArg);
    console.log(`[ASYNC] Your os has "${this.firstArg}" command: ${hasSudo}`);
    this._exit();
    //#endregion
  }

  hasCommandSync(): void {
    //#region @backendFunc
    if (!this.firstArg) {
      Helpers.error(`You need to provide command name to check`, false, true);
    }
    const hasSudo = UtilsOs.commandExistsSync(this.firstArg);
    console.log(
      `[sync version] Your os has "${this.firstArg}" command: ${hasSudo}`,
    );
    this._exit();
    //#endregion
  }
  //#endregion

  //#region commands / public ip address
  async publicIpAddress(): Promise<void> {
    const ip = await UtilsNetwork.getCurrentPublicIpAddress();
    console.log(`Your public IP address is: ${ip}`);
    this._exit();
  }

  async publicIp(): Promise<void> {
    //#region @backendFunc
    await this.publicIpAddress();
    //#endregion
  }
  //#endregion

  //#region commands / open origins in vscode
  async localIps(): Promise<void> {
    const firstActiveLocalIp =
      await UtilsNetwork.getFirstIpV4LocalActiveIpAddress();

    console.log(
      `Your first active local IP address is: ${firstActiveLocalIp} `,
    );

    const ips = await UtilsNetwork.getLocalIpAddresses();
    for (let index = 0; index < ips.length; index++) {
      const ip = ips[index];
      // console.log(ip);
      console.log(
        `${index + 1}. Local IP address is: ` +
          `${ip.address}, type: ${ip.type}`,
      );
    }
    this._exit();
  }
  //#endregion

  //#region commands / is online
  async isOnline() {
    //#region @backendFunc
    console.log(
      `Is online: ${await UtilsNetwork.checkIfServerPings(this.firstArg)}`,
    );
    this._exit();
    //#endregion
  }
  //#endregion
}
