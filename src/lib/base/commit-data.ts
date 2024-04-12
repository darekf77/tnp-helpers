import {
  _,
  //#region @backend
  chalk
  //#endregion
} from 'tnp-core';
import { Helpers } from '../index';

export type CommonCommitMsgBranch = | 'refactor' | 'chore' | 'style' | 'docs' | 'test' | 'ci' | 'build';
export type TypeOfCommit = 'feature' | 'bugfix' | 'performance' | CommonCommitMsgBranch;
export type TypeOfMsgPrefix = 'feat' | 'fix' | 'perf' | CommonCommitMsgBranch;

const regexCommitModuleInArgs: RegExp = /\[[a-z|\-]+\]/;
const regexCommitModuleInBranch: RegExp = /\-\-[a-z|\-]+\-\-/;

export class CommitData {

  private _message: string;
  //#region static

  //#region extract jira numbers
  /**
   *
   * @returns jiras (from oldest to newset)
   */
  private static extractAndOrderJiraNumbers(commitOrBranchName: string): string[] {
    //#region @backendFunc
    return (commitOrBranchName.match(/[A-Z]+\-[0-9]+/g) || [])
      .map(originalName => {
        return { originalName, num: Number(originalName.replace(/[A-Z]+/g, '').replace(/\-+/g, '')) }
      })
      .sort(({ num: a }, { num: b }) => b - a)
      .map(c => c.originalName)
      .reverse()
      ;
    //#endregion
  }
  //#endregion

  //#region clean http(s) from commit message
  private static cleanHttpFromCommitMessage(commitMsg): string {
    if (!commitMsg) {
      return commitMsg;
    }
    commitMsg = commitMsg.replace('https://', '');
    commitMsg = commitMsg.replace('http://', '');
    return commitMsg;
  }
  //#endregion

  //#region clean http(s) from commit message
  private static getModuleNameFrom(commitMsg: string) {
    let commitModuleName = _.first(commitMsg.match(regexCommitModuleInArgs));
    if (commitModuleName) {
      commitMsg = commitMsg.replace(commitModuleName, '');
    }
    return {
      commitMsg, commitModuleName: commitModuleName?.replace(/\[/g, '').replace(/\]/g, '')
    };
  }

  private static getModuleNameFromBranch(branchName: string) {
    let commitModuleName = _.first(branchName.match(regexCommitModuleInBranch));
    if (commitModuleName) {
      branchName = branchName.replace(commitModuleName, '-');
    }
    return { commitMsg: branchName, commitModuleName: commitModuleName?.replace(/\-/g, '') };
  }
  //#endregion

  //#region get from args
  static async getFromArgs(args: string[], typeOfCommit: TypeOfCommit) {
    //#region @backendFunc
    let messageFromArgs = args.join(' ');
    const data = this.getModuleNameFrom(messageFromArgs)
    messageFromArgs = data.commitMsg;

    const jiraNumbers = this.extractAndOrderJiraNumbers(messageFromArgs);
    // console.log(`

    // msg: '${message}'

    // jiras: ${jiraNumbers.join(',')}

    // `)
    messageFromArgs = this.cleanHttpFromCommitMessage(messageFromArgs);

    if (messageFromArgs.search(':') !== -1) {
      const split = messageFromArgs.split(':');
      messageFromArgs = split.join(':\n');
    }
    if (messageFromArgs.search(' - ') !== -1) {
      const split = messageFromArgs.split(' - ');
      messageFromArgs = split.join('\n- ');
    }


    // console.log({ messageFromArgs })

    return CommitData.from({
      message: messageFromArgs,
      typeOfCommit,
      jiraNumbers,
      commitModuleName: data.commitModuleName
    });
    //#endregion
  }
  //#endregion

  //#region get from bramch
  static async getFromBranch(currentBranchName: string) {
    //#region @backendFunc
    const typeOfCommit: TypeOfCommit = _.first(currentBranchName.split('/')) as any;

    const jiraNumbers = this.extractAndOrderJiraNumbers(currentBranchName);

    if (typeOfCommit === 'feature' && jiraNumbers.length === 1) {

      Helpers.info(`

        You current feature branch "${currentBranchName}"
        doesn't have ${chalk.bold('main-issue')} and ${chalk.bold('sub-issue')} inlcueded.

        Proper example: feature/EKREW-<number-of-sub-issue>-EKREW-<number-of-main-issue>-commit-name

          `)
      if (await Helpers.questionYesNo('Continue without sub-issue?')) {
        process.exit(0)
      }
    }

    let messageFromBranch = _.last(currentBranchName.split('/')).replace(/\-/g, ' ');

    const data = this.getModuleNameFromBranch(messageFromBranch)
    messageFromBranch = data.commitMsg;

    // console.log({ messageFromBranch })
    return CommitData.from({
      message: messageFromBranch,
      typeOfCommit,
      jiraNumbers,
      commitModuleName: data.commitModuleName,
    });
    //#endregion
  }
  //#endregion

  //#region  from
  public static from(options: Pick<CommitData, 'message' | 'jiraNumbers' | 'typeOfCommit' | 'commitModuleName'>): CommitData {
    options = (options ? options : {}) as any;
    // console.log(options)
    const opt = _.merge(new CommitData(), _.cloneDeep(options));

    return opt;
  }
  //#endregion

  //#endregion

  //#region fields
  typeOfCommit: TypeOfCommit;

  private clearMessage(message: string) {
    for (const jira of (this.jiraNumbers || [])) {
      message = message.replace(jira.toLowerCase().replace('-', ' '), ' ');
      message = message.replace(jira.toUpperCase().replace('-', ' '), ' ');
      message = message.replace(jira, ' ');
      message = message.replace(jira.toLowerCase(), ' ');
      message = message.replace(regexCommitModuleInArgs, ' ');
      message = message.replace(regexCommitModuleInBranch, ' ');
      message = message.replace(/\ \ /g, ' ');
    }
    return message;
  }

  /**
   * pure message what was done (without jira or prefixes)
   * => is included in this.commitMessage
   */
  get message() {
    return this.clearMessage(this._message);
  }
  set message(message) {
    this._message = this.clearMessage(message);
  }
  /**
   * ex. JIRA-2132 or MYJIRAREFIX-234234
   */
  jiraNumbers: string[];

  readonly commitModuleName: string;
  //#endregion

  //#region methods & getters

  //#region methods & getters / branch prefix
  get branchPrefix(): TypeOfMsgPrefix {
    //#region @backendFunc
    const typeOfCommit = this.typeOfCommit;
    if (typeOfCommit === 'feature') {
      return 'feat';
    } else if (typeOfCommit === 'bugfix') {
      return 'fix';
    } else if (typeOfCommit === 'performance') {
      return 'perf';
    }
    return this.typeOfCommit as any;
    //#endregion
  }
  //#endregion

  //#region methods & getters / commit message git commit -m
  get commitMessage(): string {
    //#region @backendFunc
    if (this.message === Helpers.git.ACTION_MSG_RESET_GIT_HARD_COMMIT) {
      return this.message;
    }
    const jiras = this.jiraNumbers || [];
    let commitMsg = ''
    if (this.commitModuleName) {
      commitMsg = `${(jiras.length > 0) ? '[' + [_.first(jiras)].join(',') + '] ' : ''}${this.branchPrefix}${'(' + this.commitModuleName + ')'}:`
        + ` ${(this.message || '').split('\n').map(c => c.replace(/\-/g, ' ')).join('\n-').trim()}`;
    } else {
      commitMsg = `${this.branchPrefix}${(jiras.length > 0) ? '(' + [_.first(jiras)].join(',') + ')' : ''}:`
        + ` ${(this.message || '').split('\n').map(c => c.replace(/\-/g, ' ')).join('\n-').trim()}`;
    }

    return commitMsg.replace(': :', ': ');

    //#endregion
  }
  //#endregion



  get branchName() {
    //#region @backendFunc
    if (this.commitModuleName) {
      return `${this.typeOfCommit || 'feature'}/${this.jiraNumbers.map(c => c.toUpperCase()).join('-')}${this.jiraNumbers.length > 0 ? '-' : ''}--${this.commitModuleName}--${_.kebabCase(this.message)}`;
    }
    return `${this.typeOfCommit || 'feature'}/${this.jiraNumbers.map(c => c.toUpperCase()).join('-')}${this.jiraNumbers.length > 0 ? '-' : ''}${_.kebabCase(this.message)}`;
    //#endregion
  }

  //#region methods & getters / is action commit
  get isActionCommit() {
    //#region @backendFunc
    return this.message === Helpers.git.ACTION_MSG_RESET_GIT_HARD_COMMIT;
    //#endregion
  }
  //#endregion

  //#endregion


}
