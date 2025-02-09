//#region imports
import {
  _,
  //#region @backend
  chalk,
  //#endregion
} from 'tnp-core';
import { Helpers } from '../index';
import { path } from 'tnp-core/src';
//#endregion

//#region open source proviers
const openSourceProvidersIssuePrefix = [
  'GH',
  // 'GITHUB',
  // 'BB',
  // 'BITBUCKET',
  // 'GL',
  // 'GITLAB',
];
//#endregion

//#region common commit msg branch
export type CommonCommitMsgBranch =
  | 'refactor'
  | 'chore'
  | 'style'
  | 'docs'
  | 'test'
  | 'ci'
  | 'build'
  | 'release';
//#endregion

//#region type of commit
export type TypeOfCommit =
  | 'feature'
  | 'bugfix'
  | 'performance'
  | CommonCommitMsgBranch;
//#endregion

export type TypeOfMsgPrefix = 'feat' | 'fix' | 'perf' | CommonCommitMsgBranch;
const regexTeamsID: RegExp = /[A-Z0-9]+\#/;

const regexCommitModuleInArgs: RegExp = /\[[a-z|\-|\,]+\]/;
const regexCommitModuleInBranch: RegExp = /\-\-[a-z|\-|\_]+\-\-/;

export class CommitData {
  //#region static

  //#region static / methods & getters / clean http(s) from commit message
  private static cleanHttpFromCommitMessage(commitMsg: string): string {
    if (!commitMsg) {
      return commitMsg;
    }
    commitMsg = commitMsg.replace('https://', '');
    commitMsg = commitMsg.replace('http://', '');
    return commitMsg;
  }
  //#endregion

  //#region static / methods & getters / get temas id from
  private static getTeamsIdFrom(commitMsg: string) {
    let teamID = _.first(commitMsg.match(regexTeamsID));
    if (teamID) {
      commitMsg = commitMsg.replace(teamID, '');
    }
    return {
      commitMsgOrBranchName: commitMsg,
      teamID,
    };
  }
  //#endregion

  //#region static / methods & getters / get module name from
  private static getModuleNameFrom(commitMsg: string) {
    let commitModuleName = _.first(commitMsg.match(regexCommitModuleInArgs));
    if (commitModuleName) {
      commitMsg = commitMsg.replace(commitModuleName, '');
    }
    commitModuleName = commitModuleName?.replace(/\[/g, '').replace(/\]/g, '');
    return {
      commitMsg,
      commitModuleName,
    };
  }
  //#endregion

  //#region static / methods & getters / extract jira numbers
  /**
   *
   * @returns jiras (from oldest to newset)
   */
  static extractAndOrderJiraNumbers(commitOrBranchName: string): string[] {
    //#region @backendFunc
    return Helpers.uniqArray(
      (
        _.first(commitOrBranchName.split('\n')).match(/[A-Z0-9]+\-[0-9]+/g) ||
        []
      )
        .map(originalName => {
          return {
            originalName,
            num: Number(
              originalName.replace(/[A-Z]+/g, '').replace(/\-+/g, ''),
            ),
          };
        })
        .sort(({ num: a }, { num: b }) => b - a)
        .map(c => c.originalName)
        .reverse()
        .filter(c => {
          // is there is not letter in jira number skip it
          const regexONlyNumbers = /^[0-9]+$/;
          if (regexONlyNumbers.test(c.replace(/\-/g, ''))) {
            return false;
          }
          return true;
        }),
    );
    //#endregion
  }
  //#endregion

  //#region static / methods & getters / extract jira numbers
  /**
   *
   * @returns jiras (from oldest to newset)
   */
  static extractAndOrderIssuesFromOtherProjects(
    /**
     * example:
     * commit: proper git commands tnp/GH-9 darekf77/tnp-helpers/GH-10
     * feature/__tnp-GH-9____darekf77_tnp-helpers-GH10__-proper-git-commands
     */
    commitOrBranchName: string,
    currentOrigin?: string,
  ): string[] {
    //#region @backendFunc
    if (commitOrBranchName.trim() === '') {
      // console.trace('commitOrBranchName is empty');
      return [];
    }
    const isBranch = !commitOrBranchName.trim().includes(' ');
    // console.log(`is branch: "${isBranch}" "${commitOrBranchName}"`);
    return Helpers.uniqArray(
      (
        _.first(commitOrBranchName.split('\n')).match(
          isBranch
            ? /\_\_(([a-zA-Z0-9\-])+\_)+[A-Z0-9]+\-[0-9]+\_\_/g
            : /(([a-zA-Z0-9\-])+\/)+[A-Z0-9]+\-[0-9]+/g,
        ) || []
      )
        .map(originalName =>
          isBranch
            ? originalName.replace(/\_\_/g, '').replace(/\_/g, '/')
            : originalName,
        )
        .map(originalName => {
          // replace all non numbers
          const issueNum = (originalName as string)
            .replace(/\D/g, ' ')
            .split(' ')
            .pop();

          // console.log({ originalName, issueNum });
          return {
            originalName,
            num: Number(issueNum),
          };
        })
        .sort(({ num: a }, { num: b }) => b - a)
        .map(c => c.originalName)
        .reverse()
        .filter(c => {
          // is there is not letter in jira number skip it
          const regexONlyNumbers = /^[0-9]+$/;
          if (regexONlyNumbers.test(c.replace(/\-/g, ''))) {
            return false;
          }
          return true;
        })
        .map(issue => {
          // console.log('MAPPING', issue);
          // console.log('project', project?.name);
          if (issue.split('/').length === 2 && !!currentOrigin) {
            // console.log('issue', issue);
            const origin = Helpers.git.originSshToHttp(currentOrigin);
            const provider = _.first(origin.replace('https://', '').split('/'));
            const cleanUserWithPath = origin
              .replace('https://', '')
              .replace(provider + '/', '')
              .replace(path.basename(origin).replace('.git', ''), '')
              .replace('.git', '');

            const issueFirstPart = _.first(issue.split('/'));
            const issueLastPart = _.last(issue.split('/'));

            const newPath =
              `${cleanUserWithPath}/${issueFirstPart}/${issueLastPart}`.replace(
                /\/\/+/g,
                '/',
              );
            // console.log({
            //   origin,
            //   provider,
            //   cleanUserWithPath,
            //   issueLastPart,
            //   issueFirstPart,
            //   newPath,
            // });
            return newPath;
          }
          return issue;
        }),
    );
    //#endregion
  }
  //#endregion

  //#region static / methods & getters / clean message from jira numbers, team id and stuff
  static cleanMessageFromJiraNumTeamIdEtc(
    message: string,
    optinos?: {
      teamID: string;
      commitModuleName: string;
      jiraNumbers: string[];
      issuesFromOtherProjects: string[];
    },
  ): string {
    message = message || '';
    let { teamID, commitModuleName, jiraNumbers, issuesFromOtherProjects } =
      optinos || {};
    teamID = teamID || this.getTeamsIdFrom(message).teamID || '';
    commitModuleName =
      commitModuleName ||
      this.getModuleNameFrom(message).commitModuleName ||
      '';
    jiraNumbers = jiraNumbers || this.extractAndOrderJiraNumbers(message) || [];
    issuesFromOtherProjects =
      issuesFromOtherProjects ||
      this.extractAndOrderIssuesFromOtherProjects(message) ||
      [];

    if (!!teamID.trim()) {
      message = message.replace(teamID.toLowerCase().replace('-', ' '), ' ');
      message = message.replace(teamID.toUpperCase().replace('-', ' '), ' ');
    }

    // console.log({ clere: 'CLEAR', issuesFromOtherProjects, message });

    for (const issueFromOtherProj of issuesFromOtherProjects || []) {
      // console.log('issueFromOtherProj', issueFromOtherProj);
      // console.log('message', message);
      message = message.replace(
        `__${issueFromOtherProj.replace(/\//g, '_').replace(/\-/g, ' ')}__`,
        ' ',
      );
      message = message.replace(issueFromOtherProj, ' ');
      message = message.replace(
        issueFromOtherProj.toLowerCase().replace('-', ' '),
        ' ',
      );
      message = message.replace(
        issueFromOtherProj.toUpperCase().replace('-', ' '),
        ' ',
      );
      message = message.replace(issueFromOtherProj.toLowerCase(), ' ');
      message = message.replace(regexCommitModuleInArgs, ' ');
      message = message.replace(regexCommitModuleInBranch, ' ');
      message = message.replace(/\ \ /g, ' ');
    }

    for (const jira of jiraNumbers || []) {
      message = message.replace(jira.toLowerCase().replace('-', ' '), ' ');
      message = message.replace(jira.toUpperCase().replace('-', ' '), ' ');
      message = message.replace(jira, ' ');
      message = message.replace(jira.toLowerCase(), ' ');
      message = message.replace(regexCommitModuleInArgs, ' ');
      message = message.replace(regexCommitModuleInBranch, ' ');
      message = message.replace(/\ \ /g, ' ');
    }

    if (!!teamID.trim()) {
      message = message.replace(/\_/g, ' ');
    }

    if (!!commitModuleName.trim()) {
      const cleanedModuleName = commitModuleName
        .replace(/\-/g, ' ')
        .replace(/\,/g, '_');

      message = message.replace(cleanedModuleName, ' ');
    }
    return message
      .replace(/\ \ /g, ' ')
      .replace(/\ \ /g, ' ')
      .replace(/\ \ /g, ' ');
  }

  //#endregion

  //#region static / methods & getters / get module name from branch
  private static getModuleNameFromBranch(branchName: string) {
    let commitModuleName = _.first(branchName.match(regexCommitModuleInBranch));
    if (commitModuleName) {
      branchName = branchName.replace(commitModuleName, '');
      commitModuleName = commitModuleName
        ?.replace(/^\-\-/, '')
        ?.replace(/\-\-$/, '');
      if (commitModuleName.startsWith('-')) {
        commitModuleName = commitModuleName.replace(/^\-/, '');
      }
    }
    commitModuleName = commitModuleName
      ?.replace(/^\-\-/, '')
      ?.replace(/\-\-$/, '')
      .replace(/\_/, ',');

    return { commitModuleName };
  }
  //#endregion

  //#region static / methods & getters / get from args
  static async getFromArgs(
    args: string[],
    options: {
      typeOfCommit: TypeOfCommit;
      /**
       * only needed when push github
       * and I forgot to add my username before issue
       * taon pfix proper input my-repo#344
       * that should be
       * taon pfix proper input my-username/my-repo#344
       */
      currentOrigin?: string;
    },
  ): Promise<CommitData> {
    //#region @backendFunc
    options = options || ({} as any);
    const { typeOfCommit, currentOrigin } = options;
    args = args.map(arg => {
      const githubOtherIssueRegex = /[a-z0-9\-\/]+\#[0-9]+/g;
      const matches = arg.match(githubOtherIssueRegex);
      if (matches) {
        for (const match of matches) {
          const [repo, issue] = match.split('#');
          // TODO last handle other providers than github
          arg = arg.replace(match, `${repo}/GH-${issue}`);
          // console.log('fixing github issue', match, 'to', `${repo}/GH-${issue}`);
        }
      }
      return arg;
    });

    let messageFromArgs = args.join(' ');
    const teamIdData = this.getTeamsIdFrom(messageFromArgs);

    const issuesFromOtherProjects = this.extractAndOrderIssuesFromOtherProjects(
      messageFromArgs,
      currentOrigin,
    );

    // console.log({ issuesFromOtherProjects });

    for (const iterator of issuesFromOtherProjects) {
      messageFromArgs = messageFromArgs.replace(iterator, '');
    }

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
      issuesFromOtherProjects,
      commitModuleName: moduleNameData.commitModuleName,
      teamID: teamIdData.teamID,
    });
    //#endregion
  }
  //#endregion

  //#region static / methods & getters / get from bramch
  static async getFromBranch(
    currentBranchName: string,
    options?: {
      releaseWords?: string[];
      /**
       * only needed when push github
       * and I forgot to add my username before issue
       * taon pfix proper input my-repo#344
       * that should be
       * taon pfix proper input my-username/my-repo#344
       */
      currentOrigin?: string;
    },
  ): Promise<CommitData> {
    //#region @backendFunc
    options = options || { releaseWords: [] };
    options.releaseWords = options.releaseWords || [];
    const { releaseWords, currentOrigin } = options;

    const typeOfCommit: TypeOfCommit = _.first(
      currentBranchName.split('/'),
    ) as any;

    const issuesFromOtherProjects = this.extractAndOrderIssuesFromOtherProjects(
      currentBranchName,
      currentOrigin,
    );

    // console.log({
    //   BEFORE: 'BEFOER',
    //   currentBranchName,
    // });

    for (const iterator of issuesFromOtherProjects) {
      currentBranchName = currentBranchName.replace(
        `__${iterator.replace(/\//g, '_')}__`,
        '',
      );
    }

    // console.log({
    //   BRANCHOTHERISSUE: issuesFromOtherProjects,
    //   currentBranchName,
    // });

    const teamIdData = this.getTeamsIdFrom(currentBranchName);
    currentBranchName = teamIdData.commitMsgOrBranchName;

    const jiraNumbers = this.extractAndOrderJiraNumbers(currentBranchName);

    let messageFromBranch = _.last(currentBranchName.split('/')).replace(
      /\-/g,
      ' ',
    );

    const versionRegex = new RegExp(
      `(${releaseWords.join('|')})\\-\\d+\\-\\d+\\-\\d+\\-`,
    );
    const secondPartOfCurrentBranchName = _.last(currentBranchName.split('/'));
    let resolveReleseVersionPart = versionRegex.test(
      secondPartOfCurrentBranchName,
    )
      ? (
          _.first(secondPartOfCurrentBranchName.match(versionRegex) || []) || ''
        ).replace(/^[a-z]+\-/g, '')
      : '';

    let resolveReleseVersion = resolveReleseVersionPart
      .replace(/\-/g, '.')
      .replace(/\.$/g, '');

    const releaseWord = _.first(
      secondPartOfCurrentBranchName.split(resolveReleseVersionPart),
    ).replace(/\-/g, '');

    const moduleNameData = this.getModuleNameFromBranch(currentBranchName);
    if (moduleNameData.commitModuleName) {
      messageFromBranch = messageFromBranch.replace(
        moduleNameData.commitModuleName.replace(/\,/g, '_'),
        '',
      );
    }

    for (const jira of jiraNumbers) {
      messageFromBranch = messageFromBranch.replace(
        jira.replace(/\-/g, ' '),
        '',
      );
    }

    messageFromBranch = messageFromBranch.trim();

    // const orgMessageFromBranch = messageFromBranch;
    if (versionRegex.test(currentBranchName) && releaseWords.length > 0) {
      var toReplaceReleaseVer1 =
        `${releaseWord}-${resolveReleseVersionPart}`.replace(/\-/g, ' ');

      messageFromBranch = messageFromBranch.replace(
        toReplaceReleaseVer1.trim(),
        `${releaseWord} ${resolveReleseVersion}`,
      );
    }

    // console.log({
    //   secondPartOfCurrentBranchName,
    //   resolveReleseVersionPart,
    //   releaseWord,
    //   toReplaceReleaseVer1,
    //   orgMessageFromBranch,
    //   messageFromBranch,
    //   resolveReleseVersion,
    //   versionRegex: versionRegex.source,
    // });

    const result = CommitData.from({
      message: messageFromBranch,
      typeOfCommit,
      jiraNumbers,
      issuesFromOtherProjects,
      commitModuleName: moduleNameData.commitModuleName,
      teamID: teamIdData.teamID,
    });

    return result;
    //#endregion
  }
  //#endregion

  //#region static / methods & getters / from
  public static from(
    options: Pick<
      CommitData,
      | 'message'
      | 'jiraNumbers'
      | 'typeOfCommit'
      | 'commitModuleName'
      | 'teamID'
      | 'issuesFromOtherProjects'
    >,
  ): CommitData {
    options = (options ? options : {}) as any;
    // console.log(options)
    const opt = _.merge(new CommitData(), _.cloneDeep(options));
    return opt;
  }
  //#endregion

  //#endregion

  //#region fields
  private _message: string;
  typeOfCommit: TypeOfCommit;
  /**
   * ex. JIRA-2132 or MYJIRAREFIX-234234
   */
  jiraNumbers: string[];

  readonly commitModuleName: string;
  readonly teamID: string;
  //#endregion

  //#region methods & getters / clear message
  private clearMessage(message: string): string {
    return CommitData.cleanMessageFromJiraNumTeamIdEtc(message, {
      teamID: this.teamID,
      commitModuleName: this.commitModuleName,
      jiraNumbers: this.jiraNumbers,
      issuesFromOtherProjects: this.issuesFromOtherProjects,
    });
  }
  //#endregion

  //#region methods & getters / message
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
  //#endregion

  useFeatureBranchForTestBranch: boolean = false;

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
    return (this.typeOfCommit as any) || 'feat';
    //#endregion
  }
  //#endregion

  //#region methods & getters / issues from other projects
  /**
   * ex. taon/GH-12  darekf77/tnp-helpers/GH-4
   */
  get issuesFromOtherProjects(): string[] {
    return this.__issuesFromOtherProjects;
  }

  set issuesFromOtherProjects(value: string[]) {
    this.__issuesFromOtherProjects = value;
    // this.__issuesFromOtherProjects = value.map(issue => {
    //   console.log('MAPPING', issue);
    //   console.log('project', this.project?.name);
    //   if (issue.split('/').length === 1 && !!this.project) {
    //     console.log('issue', issue);
    //     const origin = Helpers.git.originSshToHttp(this.project.git.originURL);
    //     const provider = _.first(origin.replace('https://', '').split('/'));
    //     const cleanUserWithPath = origin
    //       .replace('https://', '')
    //       .replace(provider + '/', '')
    //       .replace(path.basename(origin).replace('.git', ''), '');

    //     const issueLastPart = _.last(issue.split('/'));
    //     return `tnp/${cleanUserWithPath}/${issueLastPart}`;
    //   }
    //   return issue;
    // });
  }

  private __issuesFromOtherProjects: string[];
  //#endregion

  //#region methods & getters / commit message git commit -m
  get commitMessage(): string {
    //#region @backendFunc
    if (this.message === Helpers.git.ACTION_MSG_RESET_GIT_HARD_COMMIT) {
      return this.message;
    }
    const otherIssues = this.issuesFromOtherProjects || [];

    const jiraNumbers = (this.jiraNumbers || []).filter(
      f => !otherIssues.some(o => o.endsWith(f)),
    );

    // console.log({ jiraNumbers, otherIssues });

    const jirasExists = jiraNumbers.length > 0 || otherIssues.length > 0;

    let issuesFromOtherProjectsConnected =
      (jiraNumbers.length > 0 ? ',' : '') +
      otherIssues
        .map(otherIssue => {
          const num = _.last(otherIssue.split('-'));
          let providerPrefix = _.last(otherIssue.split('/')).replace(
            `-${num}`,
            '',
          );
          // console.log({ jira, num, providerPrefix });
          return `${otherIssue.replace(`/${providerPrefix}-`, '#')}`;
        })
        .join(',');

    if (issuesFromOtherProjectsConnected === ',') {
      // QUICK_FIX
      issuesFromOtherProjectsConnected = '';
    }

    const jiras = (jiraNumbers || []).map(d => {
      if (
        // open source providers
        openSourceProvidersIssuePrefix
          .map(c => `${c}-`)
          .some(gh => d.startsWith(gh))
      ) {
        const [jira, num] = d.split('-');
        return `#${num}`;
      }
      return d;
    });

    let commitMsg = '';

    if (this.typeOfCommit === 'release') {
      commitMsg = `${(this.message || '')
        .split('\n')
        .map(c => c.replace(/\-/g, ' '))
        .join('\n-')
        .trim()}`;
    } else {
      if (this.teamID) {
        commitMsg = `${jiras.join(' - ') + issuesFromOtherProjectsConnected} - ${(
          this.message || ''
        )
          .split('\n')
          .map(c => c.replace(/\-/g, ' '))
          .join('\n-')
          .trim()}`;
      } else {
        if (this.commitModuleName) {
          commitMsg =
            `${this.branchPrefix}${'(' + this.commitModuleName + ')'}:` +
            ` ${(this.message || '')
              .split('\n')
              .map(c => c.replace(/\-/g, ' '))
              .join('\n-')
              .trim()} ` +
            `${
              jirasExists
                ? [_.first(jiras)].join(',') + issuesFromOtherProjectsConnected
                : ''
            }`;
        } else {
          commitMsg =
            `${this.branchPrefix}${
              jirasExists
                ? '(' +
                  [_.first(jiras)].join(',') +
                  issuesFromOtherProjectsConnected +
                  ')'
                : ''
            }:` +
            ` ${(this.message || '')
              .split('\n')
              .map(c => c.replace(/\-/g, ' '))
              .join('\n-')
              .trim()}`;
        }
      }
    }

    return commitMsg.replace(': :', ': ');

    //#endregion
  }
  //#endregion

  //#region methods & getters / branch name
  get branchName(): string {
    //#region @backendFunc
    let typeOfCommit = this.typeOfCommit;
    if (typeOfCommit === 'test' && this.useFeatureBranchForTestBranch) {
      typeOfCommit = 'feature';
    }

    const teamId = this.teamID ? `${this.teamID}` : '';
    const otherIssues =
      (typeOfCommit === 'release' ? [] : this.issuesFromOtherProjects) || [];

    const jiraNumbers = (
      (typeOfCommit === 'release' ? [] : this.jiraNumbers) || []
    ).filter(
      jiraNum => !otherIssues.some(otherIssue => otherIssue.endsWith(jiraNum)),
    );

    const jirasExists = jiraNumbers.length > 0;

    const jiraNumbsConneted = [
      ...jiraNumbers.map(c => c.toUpperCase()).join('-'),
      jirasExists ? '-' : '',
      ...otherIssues.map(c => `__${c.replace(/\//g, '_')}__`).join(''),
      otherIssues ? '-' : '',
    ].join('');

    let branchName = '';

    if (teamId) {
      branchName =
        `${typeOfCommit || 'feature'}/${teamId}${jiraNumbsConneted}` +
        `${_.snakeCase(this.message)}`;
    } else if (this.commitModuleName) {
      branchName =
        `${typeOfCommit || 'feature'}/${jiraNumbsConneted}` +
        `--${this.commitModuleName.replace(/\,/g, '_')}--${_.kebabCase(this.message)}`;
    } else {
      branchName =
        `${typeOfCommit || 'feature'}/${jiraNumbsConneted}` +
        `${_.kebabCase(this.message)}`;
    }

    return branchName
      .replace(/\/\-/g, '/') // QUICK_FIX
      .replace(/\_\_\-/g, '__') // QUICK_FIX
      .replace(/\-\-\-\-/g, '--'); // QUICK_FIX
    //#endregion
  }
  //#endregion

  //#region methods & getters / is action commit
  get isActionCommit() {
    //#region @backendFunc
    return this.message === Helpers.git.ACTION_MSG_RESET_GIT_HARD_COMMIT;
    //#endregion
  }
  //#endregion
}
