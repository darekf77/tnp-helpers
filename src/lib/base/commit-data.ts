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
const regexTeamsID: RegExp = /[A-Z0-9]+\#/;

const regexCommitModuleInArgs: RegExp = /\[[a-z|\-|\,]+\]/;
const regexCommitModuleInBranch: RegExp = /\-\-[a-z|\-|\_]+\-\-/;

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
    return (commitOrBranchName.match(/[A-Z0-9]+\-[0-9]+/g) || [])
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


  private static getTeamsIdFrom(commitMsg: string) {
    let teamID = _.first(commitMsg.match(regexTeamsID));
    if (teamID) {
      commitMsg = commitMsg.replace(teamID, '');
    }
    return {
      commitMsgOrBranchName: commitMsg, teamID
    };
  }

  //#region clean http(s) from commit message
  private static getModuleNameFrom(commitMsg: string) {
    let commitModuleName = _.first(commitMsg.match(regexCommitModuleInArgs));
    if (commitModuleName) {
      commitMsg = commitMsg.replace(commitModuleName, '');
    }
    commitModuleName = commitModuleName?.replace(/\[/g, '').replace(/\]/g, '')
    return {
      commitMsg, commitModuleName,
    };
  }

  private static getModuleNameFromBranch(branchName: string) {
    let commitModuleName = _.first(branchName.match(regexCommitModuleInBranch));
    if (commitModuleName) {
      branchName = branchName.replace(commitModuleName, '');
      commitModuleName = commitModuleName?.replace(/^\-\-/, '')?.replace(/\-\-$/, '');
      if (commitModuleName.startsWith('-')) {
        commitModuleName = commitModuleName.replace(/^\-/, '');
      }
    }
    commitModuleName = commitModuleName?.replace(/^\-\-/, '')?.replace(/\-\-$/, '').replace(/\_/, ',')

    return { commitModuleName };
  }
  //#endregion

  //#region get from args
  static async getFromArgs(args: string[], typeOfCommit: TypeOfCommit) {
    //#region @backendFunc
    let messageFromArgs = args.join(' ');
    const teamIdData = this.getTeamsIdFrom(messageFromArgs);
    // console.log({ teamIdData })
    messageFromArgs = teamIdData.commitMsgOrBranchName;
    const moduleNameData = this.getModuleNameFrom(messageFromArgs);
    messageFromArgs = moduleNameData.commitMsg;

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
      commitModuleName: moduleNameData.commitModuleName,
      teamID: teamIdData.teamID
    });
    //#endregion
  }
  //#endregion

  //#region get from bramch
  static async getFromBranch(currentBranchName: string) {
    //#region @backendFunc
    const typeOfCommit: TypeOfCommit = _.first(currentBranchName.split('/')) as any;
    const teamIdData = this.getTeamsIdFrom(currentBranchName);
    currentBranchName = teamIdData.commitMsgOrBranchName;

    const jiraNumbers = this.extractAndOrderJiraNumbers(currentBranchName);

    let messageFromBranch = _.last(currentBranchName.split('/')).replace(/\-/g, ' ');

    const moduleNameData = this.getModuleNameFromBranch(currentBranchName);
    if (moduleNameData.commitModuleName) {
      messageFromBranch = messageFromBranch.replace(moduleNameData.commitModuleName.replace(/\,/g, '_'), '');
    }

    for (const jira of jiraNumbers) {
      messageFromBranch = messageFromBranch.replace(jira.replace(/\-/g, ' '), '');
    }

    messageFromBranch = messageFromBranch.trim();

    const result = CommitData.from({
      message: messageFromBranch,
      typeOfCommit,
      jiraNumbers,
      commitModuleName: moduleNameData.commitModuleName,
      teamID: teamIdData.teamID
    });


    if (typeOfCommit === 'feature' && jiraNumbers.length === 1) {

      Helpers.info(`

        You current feature branch "${currentBranchName}"
        doesn't have ${chalk.bold('main-issue')} and ${chalk.bold('sub-issue')} inlcueded.

        Proper example: feature/JIRANUM-<number-of-sub-issue>-JIRANUM-<number-of-main-issue>-commit-name

          `)
      if (!(await Helpers.questionYesNo('Continue without sub-issue?'))) {
        process.exit(0)
      }
    }


    return result;
    //#endregion
  }
  //#endregion

  //#region  from
  public static from(options: Pick<CommitData, 'message' | 'jiraNumbers' | 'typeOfCommit' | 'commitModuleName' | 'teamID'>): CommitData {
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
    if (this.teamID && _.isString(this.teamID)) {
      message = message.replace(this.teamID.toLowerCase().replace('-', ' '), ' ');
      message = message.replace(this.teamID.toUpperCase().replace('-', ' '), ' ');
    }

    for (const jira of (this.jiraNumbers || [])) {
      message = message.replace(jira.toLowerCase().replace('-', ' '), ' ');
      message = message.replace(jira.toUpperCase().replace('-', ' '), ' ');
      message = message.replace(jira, ' ');
      message = message.replace(jira.toLowerCase(), ' ');
      message = message.replace(regexCommitModuleInArgs, ' ');
      message = message.replace(regexCommitModuleInBranch, ' ');
      message = message.replace(/\ \ /g, ' ');
    }

    if (this.teamID && _.isString(this.teamID)) {
      message = message.replace(/\_/g, ' ');
    }
    if (this.commitModuleName) {
      message = message.replace(this.commitModuleName.replace(/\-/g, ' '), ' ');
      message = message.replace(this.commitModuleName.replace(/\,/g, ' '), ' ');
      message = message.replace(this.commitModuleName.replace(/\,/g, '_'), ' ');
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
  readonly teamID: string;
  //#endregion


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
    return this.typeOfCommit as any || 'feat';
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

    if (this.teamID) {
      commitMsg = `${jiras.join(' - ')} : ${(this.message || '').split('\n').map(c => c.replace(/\-/g, ' ')).join('\n-').trim()}`;
    } else {
      if (this.commitModuleName) {
        commitMsg = `${(jiras.length > 0) ? '[' + [_.first(jiras)].join(',') + '] ' : ''}${this.branchPrefix}${'(' + this.commitModuleName + ')'}:`
          + ` ${(this.message || '').split('\n').map(c => c.replace(/\-/g, ' ')).join('\n-').trim()}`;
      } else {
        commitMsg = `${this.branchPrefix}${(jiras.length > 0) ? '(' + [_.first(jiras)].join(',') + ')' : ''}:`
          + ` ${(this.message || '').split('\n').map(c => c.replace(/\-/g, ' ')).join('\n-').trim()}`;
      }
    }



    return commitMsg.replace(': :', ': ');

    //#endregion
  }
  //#endregion

  get branchName() {
    //#region @backendFunc
    const teamId = this.teamID ? `${this.teamID}` : '';
    if (teamId) {
      return `${this.typeOfCommit || 'feature'}/${teamId}${this.jiraNumbers.map(c => c.toUpperCase()).join('-')}`
        + `${this.jiraNumbers.length > 0 ? '-' : ''}${_.snakeCase(this.message)}`;
    }
    if (this.commitModuleName) {
      return `${this.typeOfCommit || 'feature'}/${this.jiraNumbers.map(c => c.toUpperCase()).join('-')}`
        + `${this.jiraNumbers.length > 0 ? '-' : ''}--${this.commitModuleName.replace(/\,/g, '_')}--${_.kebabCase(this.message)}`;
    }
    return `${this.typeOfCommit || 'feature'}/${this.jiraNumbers.map(c => c.toUpperCase()).join('-')}`
      + `${this.jiraNumbers.length > 0 ? '-' : ''}${_.kebabCase(this.message)}`;
    //#endregion
  }

  get isActionCommit() {
    //#region @backendFunc
    return this.message === Helpers.git.ACTION_MSG_RESET_GIT_HARD_COMMIT;
    //#endregion
  }


}
