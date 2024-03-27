import { Helpers } from "../index";
import { CommandLineFeature } from "./command-line-feature.backend";
import { BaseProject } from "./base-project";
import { chalk, _ } from "tnp-core";
import { translate } from "./translate";
import { TypeOfCommit, CommitData } from './commit-data';

export class BaseCommandLine<PARAMS = any, PROJECT extends BaseProject<any, any> = BaseProject> extends CommandLineFeature<PARAMS, PROJECT> {
  public _() {
    Helpers.error('Please select git command');
  }

  //#region commands / commit
  async commit() {
    const proj = this.project;
    const commitMessage = this.args.join(' ').trim();

    while (true) {
      try {
        await proj.lint();
        break;
      } catch (error) {
        Helpers.pressKeyAndContinue('Fix your code and press any key')
      }
    }


    Helpers.info(`Commit message
"${commitMessage}"
`)

    if (!(await Helpers.questionYesNo('Commit and push this ?'))) {
      this._exit()
    }

    proj.tryRunSync(`git commit -m "${commitMessage}" --no-verify`);

    let oneFail = false;
    while (true) {
      try {
        if (oneFail) {
          const push = await Helpers.questionYesNo('Do you want to force push ?');
          await proj.git.pushCurrentBranch({ force: push });
          break;
        }
        await proj.git.pushCurrentBranch({ force: true });
        break;
      } catch (error) {
        oneFail = true;
      }
    }
    this._exit()
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

  //#region commands / push feature
  async pushFeature() {
    let commitMsg: string = CommitData.getFromArgs(this.args, "feature") as any;
    // console.log({
    //   issueData
    // })
    const containerJiraNum = /[A-Z]+\-[0-9]+/.test(commitMsg);
    Helpers.info('containerJiraNum: ' + containerJiraNum);
    let issueNumberParent: string;
    let issueNumberChild: string;
    if (containerJiraNum) {
      const issuesNumbers = commitMsg.match(/[A-Z]+\-[0-9]+/g) || [];
      for (const issueNum of issuesNumbers) {
        commitMsg = commitMsg.replace(issueNum, '');
      }
      issueNumberParent = _.first(issuesNumbers);
      issueNumberChild = _.last(issuesNumbers);
      if (Number(issueNumberParent.replace(/([A-Z]|\-)+/g, '')) > Number(issueNumberChild.replace(/([A-Z]|\-)+/g, ''))) {
        issueNumberChild = _.first(issuesNumbers);
        issueNumberParent = _.last(issuesNumbers);
      }

      // TODO @LAST translate only for cez
      commitMsg = _.kebabCase(await translate(commitMsg, {
        from: 'pl',
        to: 'en'
      }))
      // Helpers.info('REPLACED/TRANSLATED: ' + issueData)
    }
    // Helpers.info('PUSH done' + args.join(','))
    this.project.run(`git checkout -b feature/${issueNumberParent}-${issueNumberChild}-${commitMsg}`).sync();
    // await this.push(); // TODO @UNCOMMENT
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

  //#region commands / push (default temp commit)
  // TODO @UNCOMMENT
  //   async push() {
  //     const proj = this.project;

  //     const commitMessage = this._getCommitMessageFromBranch(proj);

  //     while (true) {
  //       try {
  //         await proj.lint();
  //         break;
  //       } catch (error) {
  //         Helpers.pressKeyAndContinue('Fix your code and press any key')
  //       }
  //     }

  //     Helpers.info(`Commit message
  // "${commitMessage}"
  // `)

  //     if (!(await Helpers.questionYesNo('Commit and push this ?'))) {
  //       this._exit()
  //     }

  //     try {
  //       if (process.platform === 'win32') {
  //         const lines = commitMessage.split('\n').filter(f => !!f.trim()).map(l => ` -m "${l}" `).join(' ');
  //         this.project.git.commit(lines);
  //       } else {
  //         this.project.git.commit(commitMessage);
  //       }
  //     } catch (error) {
  //       Helpers.warn(`Not commiting anything... `)
  //     }

  //     let oneFail = false;
  //     while (true) {
  //       try {
  //         if (oneFail) {
  //           const push = await Helpers.questionYesNo('Do you want to force push ?');
  //           proj.git.pushCurrentBranch({ force: push });
  //           break;
  //         }
  //         proj.git.pushCurrentBranch({ force: true });
  //         break;
  //       } catch (error) {
  //         oneFail = true;
  //       }
  //     }
  //     this._exit()
  //   }
  //#endregion

  //#region commands / push fix
  async pushFix() {
    const proj = this.project;
    let issueData = this.args.join(' ');
    // console.log({
    //   issueData
    // })
    const containerJiraNum = /[A-Z]+\-[0-9]+/.test(issueData);
    Helpers.info('containerJiraNum: ' + containerJiraNum);
    let issueNumber: string;
    if (containerJiraNum) {
      const issuesNumbers = issueData.match(/[A-Z]+\-[0-9]+/g) || [];
      for (const issueNum of issuesNumbers) {
        issueData = issueData.replace(issueNum, '');
      }
      issueNumber = _.first(issuesNumbers);

      issueData = _.kebabCase(await translate(issueData, {
        from: 'pl',
        to: 'en'
      }))
      // Helpers.info('REPLACED/TRANSLATED: ' + issueData)
    }
    // Helpers.info('PUSH done' + args.join(','))
    proj.run(`git checkout -b bugfix/${issueNumber}-${issueData}`).sync();
    // await this.push(); // TODO @UNCOMMENT
  }
  pfix() {
    this.pushFix();
  }
  //#endregion

  //#region commands / push chore
  pushChore() {

  }
  //#endregion

  //#region commands / push refactor
  pushRefactor() {

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

  //#region resovle commit message
  private _getCommitMessageFromBranch(proj: BaseProject): string {

    const currentBranchName = proj.git.currentBranchName || '';
    let prefix: 'feat' | 'fix' | 'refactor' | 'chore';
    const typeOfCommit: 'feature' | 'bugfix' | 'refactor' | 'chore' = _.first(currentBranchName.split('/')) as any;
    const containerJiraNum = /[A-Z]+\-[0-9]+\-/.test(currentBranchName);
    const hasJiraWithParentIssue = (currentBranchName.match(/[A-Z]+\-[0-9]+\-/g)?.length === 2);


    let issueNumberFirst = _.last(currentBranchName.split('/'))?.split('-').slice(0, 2).join('-');
    let issueNumberSecond = _.last(currentBranchName.split('/'))?.split('-').slice(2, 4).join('-');

    const firstJiraNumValue = Number(issueNumberFirst?.replace(/([A-Z]|\-)+/g, ''));
    const secondJiraNumValue = Number(issueNumberSecond?.replace(/([A-Z]|\-)+/g, ''));

    if (secondJiraNumValue > firstJiraNumValue) {
      issueNumberFirst = _.last(currentBranchName.split('/'))?.split('-').slice(2, 4).join('-');
      issueNumberSecond = _.last(currentBranchName.split('/'))?.split('-').slice(0, 2).join('-');
    }

    let jiraNumOldest = containerJiraNum ? issueNumberFirst : '';

    if (hasJiraWithParentIssue) { // has jira with parent
      jiraNumOldest = issueNumberSecond;
    }

    if (typeOfCommit === 'feature') {
      if (currentBranchName.match(/EKREW\-[0-9]+/g)?.length !== 2) {
        Helpers.info(`

      You current feature branch "${currentBranchName}"
      doesn't have ${chalk.bold('main-issue')} and ${chalk.bold('sub-issue')} inlcueded.

      Proper example: feature/JIRANUM-<number-of-sub-issue>-JIRANUM-<number-of-main-issue>-commit-name

        `)
        if (!Helpers.questionYesNo('Continue ?')) {
          this._exit()
        }
      }
    }




    let message = _.last(currentBranchName.split('/'))?.split('-').slice(containerJiraNum ? 2 : 0).join('-').replace(/\-/g, ' ');
    if (hasJiraWithParentIssue) {
      message = _.last(currentBranchName.split('/'))?.split('-').slice(4).join('-').replace(/\-/g, ' ');
    }

    if (typeOfCommit === 'feature') {
      prefix = 'feat';
    } else if (typeOfCommit === 'bugfix') {
      prefix = 'fix';
    } else if (typeOfCommit === 'refactor') {
      prefix = 'refactor';
    } else if (typeOfCommit === 'chore') {
      prefix = 'chore';
    }
    return `${prefix}${jiraNumOldest ? '(' + jiraNumOldest + ')' : ''}: ${message}`;
  }
  //#endregion

}
