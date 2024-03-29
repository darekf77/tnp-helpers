import { Helpers } from "../index";
import { CommandLineFeature } from "./command-line-feature.backend";
import { BaseProject } from "./base-project";
import { chalk, _, path } from "tnp-core/src";
import { translate } from "./translate";
import { TypeOfCommit, CommitData } from './commit-data';

export class BaseCommandLine<PARAMS = any, PROJECT extends BaseProject<any, any> = BaseProject> extends CommandLineFeature<PARAMS, PROJECT> {
  public _() {
    Helpers.error('Please select git command');
  }

  //#region commands / pull
  async pull() {
    await this.project.pullProcess();
    this._exit();
  }
  //#endregion

  //#region commands / reset
  async reset() {
    const branchPatternOrBranchName = this.firstArg || this.project.getDefaultDevelopmentBranch();
    let overrideBranchToReset: string;

    const branches = this.__filterBranchesByPattern(branchPatternOrBranchName);
    if (branches.length > 0) {
      overrideBranchToReset = await this.__selectBrach(branches);
    } else {
      Helpers.error(`No branch found by name "${overrideBranchToReset}"`, false, true);
    }

    const childrentMsg = (_.isArray(this.project.children) && this.project.children.length > 0) ?
      `- external modules:\n${this.project.children.map(c => `${c.basename} (${chalk.yellow(c.name)})`).join('\n')
      }` : ''

    if (this.project.children?.length > 0) {
      Helpers.info(`

    YOU ARE RESETING EVERYTHING TO BRANCH: ${chalk.bold(overrideBranchToReset ? overrideBranchToReset
        : this.project.getDefaultDevelopmentBranch())}

    `)
      const res = await Helpers.questionYesNo(
        `Are you sure you wanna reset hard and pull latest changes for:
- curret project (${this.project.name})
${childrentMsg}
`);
      if (res) {
        await this.project.resetProcess(overrideBranchToReset);
        for (const child of this.project.children) {
          await child.resetProcess(overrideBranchToReset);
        }
      }
    } else {
      await this.project.resetProcess(overrideBranchToReset);
    }
  }
  //#endregion

  //#region commands / soft
  soft() {
    // TODO when aciton commit
    const proj = this.project;
    proj.run('git reset --soft HEAD~1').sync();
    Helpers.info('RESET SOFT DONE');
    this._exit()
  }
  //#endregion

  //#region commands / rebase
  async rebase() {
    const currentBranch = this.project.git.currentBranchName;
    let safeReset = 10;
    let rebaseBranch = this.firstArg || this.project.getDefaultDevelopmentBranch();

    const branches = this.__filterBranchesByPattern(rebaseBranch);
    if (branches.length > 0) {
      rebaseBranch = await this.__selectBrach(branches);
    } else {
      Helpers.error(`No branch found by name "${rebaseBranch}"`, false, true);
    }

    try {
      this.project.run(`git reset --hard && git checkout ${rebaseBranch} && git reset --hard HEAD~${safeReset} && git pull origin ${rebaseBranch} `
        + `&& git checkout ${currentBranch} && git reset --soft HEAD~1 && git stash && git reset --hard HEAD~${safeReset} && git rebase ${rebaseBranch} && git stash apply`,
        { output: false, silence: true }).sync();
      await this.project.init()
      Helpers.info('REBASE DONE')
    } catch (error) {
      await this.project.init()
      Helpers.warn('PLEASE MERGE YOUR CHANGES')
    }
    this._exit();
  }
  //#endregion

  //#region commands / stash
  /**
   * stash only staged files
   */
  stash() {
    this.project.git.stash({ onlyStaged: true })
  }
  //#endregion

  //#region commands / stash all
  /**
   * stash all files
   */
  stashAll() {
    this.project.git.stash({ onlyStaged: false })
  }
  //#endregion

  //#region commands / push all origins
  /**
   * push force to all orgins
   */
  async pushAllForce() {
    await this.pushALl(true);
  }

  /**
   * push to all origins
   */
  async pushALl(force = false) {
    const remotes = this.project.git.allOrigins;
    Helpers.info(`
    Remotes for repo:
    ${remotes.map((r, i) => `${i + 1}. ${r.origin} ${r.url}`).join('\n')}

        `)

    for (let index = 0; index < remotes.length; index++) {
      const { origin, url } = remotes[index];
      await this.push({ force, origin });
    }
    this._exit();
  }
  //#endregion

  //#region commands / push force
  async forcePush() {
    await this.push({ force: true, typeofCommit: 'feature' })
  }

  async pushForce() {
    await this.push({ force: true, typeofCommit: 'feature' })
  }
  //#endregion

  //#region commands / push
  async push(options: { force?: boolean; typeofCommit?: TypeOfCommit; origin?: string; } = {}) {
    await this.project.pushProcess({
      ...options,
      forcePushNoQuestion: options.force,
      args: this.args,
      exitCallBack: () => {
        this._exit();
      }
    })
    this._exit()
  }
  //#endregion

  //#region commands / push feature
  async pf() {
    await this.pushFeature();
  }
  async pushFeature() {
    await this.push()
  }
  //#endregion

  //#region commands / push fix
  async pushFix() {
    await this.push({ typeofCommit: 'bugfix' });
  }
  pfix() {
    this.pushFix();
  }
  //#endregion

  //#region commands / push chore
  async pushChore() {
    await this.push({ typeofCommit: 'chore' });
  }
  //#endregion

  //#region commands / push refactor
  async pushRefactor() {
    await this.push({ typeofCommit: 'refactor' });
  }
  //#endregion

  //#region commands / set origin
  SET_ORIGIN() {
    const newOriginNameOrUrl: string = this.firstArg;
    const proj = this.project;
    if (proj && proj.git.isGitRepo) {
      proj.run(`git remote rm origin`).sync();
      proj.run(`git remote add origin ${newOriginNameOrUrl}`).sync();
      Helpers.info(`Done`);
    } else {
      Helpers.error(`This folder is not a git repo... `, false, true);
    }

    this._exit()
  }
  //#endregion

  //#region commands / rename origin
  RENAME_ORIGIN() {
    const newOriginNameOrUrl: string = this.firstArg;
    const proj = this.project;
    if (proj && proj.git.isGitRepo) {
      proj.git.renameOrigin(newOriginNameOrUrl);
    } else {
      Helpers.error(`This folder is not a git repo... `, false, true);
    }
    this._exit()
  }
  //#endregion

  //#region commands / last hash tag
  LAST_TAG_HASH() {
    Helpers.info(this.project.git.lastTagHash());
    this._exit();
  }
  //#endregion

  //#region commands / last tag
  LAST_TAG() {
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
    Helpers.info(`tag "${this.firstArg}"  exits = ${Helpers.git.checkTagExists(this.firstArg)}    `);
    this._exit()
  }
  //#endregion

  //#region commands / lint
  /**
   * TODO move somewhere
   */
  async lint() {
    await this.project.lint();
  }
  //#endregion

  //#region commands / version
  /**
   * TODO move somewhere
   */
  async version() {
    console.log(this.project.version);
  }
  //#endregion

  //#region commands / init
  /**
   * TODO move somewhere
   */
  async init() {
    await this.project.init();
  }
  //#endregion

  //#region commands / struct
  /**
   * TODO move somewhere
   */
  async struct() {
    await this.project.struct();
  }
  //#endregion

  //#region commands / info
  /**
   * TODO move somewhere
   */
  async info() {
    await this.project.info();
  }
  //#endregion

  //#region commands / branch name
  BRANCH_NAME() {
    console.log(`current branch name: "${Helpers.git.currentBranchName(process.cwd())}"`);
    this._exit()
  }
  //#endregion

  //#region commands / remotes
  REMOTES() {
    const folders = Helpers.foldersFrom(this.project.location);

    folders
      .filter(c => !path.basename(c).startsWith('.'))
      .forEach(cwd => {
        Helpers.run(`git config --get remote.origin.url`, { cwd }).sync()
      });
    this._exit();
  }
  //#endregion

  //#region filter all project branches by pattern
  private __filterBranchesByPattern(branchPatternOrBranchName: string) {
    return Helpers.arrays.uniqArray(this.project.git.getBranchesNamesBy(branchPatternOrBranchName).map(a => {
      return a.replace(`remotes/origin/`, '');
    }) || this.project.getMainBranches());
  }
  //#endregion

  //#region select branch from list of branches
  private async __selectBrach(branches: string[]) {
    const childrenMsg = this.project.children.length == 0 ? '(no children in project)' : '(with children)';
    return await Helpers.autocompleteAsk(`Choose branch to reset in this project ${childrenMsg}:`,
      branches.map(b => {
        return { name: b, value: b }
      }))
  }
  //#endregion



}
