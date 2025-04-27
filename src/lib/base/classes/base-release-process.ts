//#region imports
import { config } from 'tnp-config/src';
import { CoreModels, chalk, dateformat, _, UtilsTerminal } from 'tnp-core/src';

import { Helpers } from '../../index';
import type { ChangelogData } from '../../models';
import { CommitData } from '../commit-data';

import { BaseFeatureForProject } from './base-feature-for-project';
import type { BaseProject } from './base-project';
//#endregion

export class BaseReleaseProcess<
  PROJECT extends BaseProject<any, any> = any,
> extends BaseFeatureForProject<PROJECT> {
  //#region fields

  /**
   * Automatic release process of patch plus one version
   */
  automaticRelease: boolean = false;
  versionType: CoreModels.ReleaseVersionType;
  preReleaseVersionTag: CoreModels.PreReleaseVersionTag;
  lastChangesSummary: string;
  newVersion: string;
  commitsForChangelog: {
    commitMessages: string;
    index: number;
  }[] = [];
  //#endregion

  //#region methods & getters / start release
  startRelease(options?: Partial<BaseReleaseProcess<PROJECT>>): Promise<void> {
    throw new Error('Method not implemented.');
  }
  //#endregion

  //#region methods & getters / get release words
  getReleaseWords(): string[] {
    return ['release'];
  }
  //#endregion

  //#region methods & getters / select changelog commits
  async selectChangelogCommits(): Promise<
    {
      commitMessages: string;
      index: number;
    }[]
  > {
    //#region @backendFunc
    const data = await this.getCommitsUpToReleaseCommit();
    Helpers.info(
      `Last commits up to release commiut:\n` +
        data.map(d => `- ${d.commitMessages}`).join('\n'),
    );
    const useAllCommitsForChangelog = await Helpers.questionYesNo(
      'Use all commits for changelog ?',
    );

    if (useAllCommitsForChangelog) {
      return data;
    }
    const choices = await Helpers.consoleGui.multiselect(
      'Select commits to add to changelog',
      data.map(d => {
        return {
          name: d.commitMessages,
          value: d.index?.toString(),
        };
      }),
    );
    return choices.map(v => {
      return data.find(d => d.index.toString() === v);
    });
    //#endregion
  }
  //#endregion

  //#region methods & getters / get commits up to release commit
  private async getCommitsUpToReleaseCommit(): Promise<
    {
      commitMessages: string;
      index: number;
    }[]
  > {
    //#region @backendFunc
    const lastReleaseCommitData = await this.getLastReleaseCommitData();
    // console.log({ lastReleaseCommitData });
    if (lastReleaseCommitData.index !== -1) {
      const commits = [];
      for (let index = 0; index < lastReleaseCommitData.index; index++) {
        const commitMessages =
          await this.project.git.getCommitMessageByIndex(index);
        commits.push({ commitMessages, index });
      }
      return commits;
    }
    return [];
    //#endregion
  }
  //#endregion

  public async checkBundleQuestion(
    cwdForCode: string,
    checkMessage = `Select action before publishing ?`,
  ): Promise<boolean> {
    //#region @backendFunc
    const choices = {
      yes: {
        name: 'Open in VSCode',
      },
      continue: {
        name: 'Continue process..',
      },
      exit: {
        name: 'Exit',
      },
    };
    const selected = await UtilsTerminal.select<keyof typeof choices>({
      question: checkMessage,
      choices,
    });
    if (selected === 'exit') {
      process.exit(0);
    }
    if (selected === 'yes') {
      const editor = await this.project.ins.configDb.getCodeEditor();
      Helpers.run(`${editor} .`, {
        output: true,
        cwd: cwdForCode,
      }).sync();
      if (
        !(await UtilsTerminal.confirm({
          message: `Is everything ok with code ?`,
          defaultValue: true,
        }))
      ) {
        process.exit(0);
      }
      return true;
    }
    if (selected === 'continue') {
      return true;
    }
    //#endregion
  }

  //#region methods & getters / publish to npm
  /**
   * @returns true if publish , faslse if just version bump
   */
  public async publishToNpm(
    cwdForCode = this.project.pathFor('dist'),
    automaticRelease = this.automaticRelease,
  ): Promise<boolean> {
    //#region   @backendFunc

    if (!automaticRelease) {
      await this.checkBundleQuestion(cwdForCode);

      while (true) {
        const publishOpt = {
          select: {
            name: '< select option below >',
          },
          bump: {
            name: 'Just bump version',
          },
          publish: {
            name: 'Publish to npm',
          },
        };

        const selected = await UtilsTerminal.select<keyof typeof publishOpt>({
          question: `Select publish option`,
          choices: publishOpt,
        });

        if (selected === 'bump') {
          return true;
        }
        if (selected === 'publish') {
          break;
        }
      }
    }

    await this.project.publish();
    return true;
    //#endregion
  }
  //#endregion

  //#region methods & getters / test after publish
  protected async testAfterPublish(): Promise<boolean> {
    //#region @backendFunc
    if (!this.automaticRelease) {
      if (
        await Helpers.questionYesNo(
          `Do you want to run test after fresh install (and before release commit ?) ?`,
        )
      ) {
        if (!(await this.testLibraries())) {
          Helpers.pressKeyOrWait(
            `Test failed.. starting release again.. press any key to continue`,
          );
          return false;
        }
      }
    }
    return true;
    //#endregion
  }
  //#endregion

  //#region methods & getters / test before publish
  protected async testBeforePublish(): Promise<boolean> {
    //#region @backendFunc
    if (!this.automaticRelease) {
      if (
        await Helpers.questionYesNo(
          `Do you want to run test before npm publish ?`,
        )
      ) {
        if (!(await this.testLibraries())) {
          Helpers.pressKeyOrWait(
            `Test failed.. starting release again.. press any key to continue`,
          );
          return false;
        }
      }
    }
    return true;
    //#endregion
  }
  //#endregion

  //#region methods & getters / commit and push
  protected async commitAndPush(): Promise<void> {
    //#region @backendFunc
    const releaseCommitMessage = this.releaseCommitTemplate();
    const lastCommitMessage = await this.project.git.penultimateCommitMessage();
    const jiraNumbers =
      CommitData.extractAndOrderJiraNumbers(lastCommitMessage);
    const args = [jiraNumbers.join(' ') + ' ' + releaseCommitMessage];
    // console.log({ jiraNumbers, args, lastCommitMessage });
    await this.project.git.pushProcess({
      typeofCommit: 'release',
      askToConfirmPush: true,
      askToConfirmBranchChange: true,
      askToConfirmCommit: true,
      skipLint: true,
      args,
      exitCallBack: () => {
        process.exit(1);
      },
    });
    //#endregion
  }
  //#endregion

  //#region methods & getters / release commit template
  protected releaseCommitTemplate(): string {
    return `Release v${this.newVersion} + changelog.md update`;
  }
  //#endregion

  //#region methods & getters / test libraries
  private async testLibraries(): Promise<boolean> {
    try {
      this.project.run('npm run test', { output: true }).sync();
      return true;
    } catch (error) {
      Helpers.info(`Test failed, you can run test manually`);
      return false;
    }
  }
  //#endregion

  //#region methods & getters / build all libraries
  async buildAllLibraries() {
    await this.project.libraryBuild.buildLibraries({
      watch: false,
      releaseBuild: true,
    });
  }
  //#endregion

  //#region methods & getters / reset release files
  async resetReleaseFiles() {
    //#region @backendFunc
    this.project.git.restoreLastVersion(this.changeLogPath);
    for (const projToBump of this.toBumpProjects) {
      projToBump.git.restoreLastVersion(config.file.package_json);
      projToBump.git.restoreLastVersion(config.file.package_lock_json);
    }
    //#endregion
  }
  //#endregion

  //#region methods & getters / to bump projects
  get toBumpProjects() {
    const toBumpProjects = [
      this.project,
      ...this.project.libraryBuild.libraries,
    ] as PROJECT[];

    return toBumpProjects;
  }
  //#endregion

  //#region methods & getters / bump new version everywhere
  async bumpNewVersionEverywhere() {
    //#region @backendFunc
    const allLibrariesNames = this.project.libraryBuild.libraries.map(
      l => l.name,
    );

    for (const projToBump of this.toBumpProjects) {
      projToBump.packageJson.setVersion(this.newVersion);
      for (const libName of allLibrariesNames) {
        projToBump.packageJson.updateDependency({
          packageName: libName,
          version:
            (this.project.location === projToBump.location ? '' : '^') +
            this.newVersion,
        });
      }
    }
    //#endregion
  }
  //#endregion

  //#region methods & getters / confirm release type
  async confirmNewVersion(): Promise<void> {
    //#region @backendFunc
    if (this.automaticRelease) {
      return;
    }
    let newVersion = this.newVersion;
    if (!this.newVersion) {
      newVersion = this.project.packageJson.versionWithPatchPlusOne;
      if (this.versionType === 'minor') {
        newVersion =
          this.project.packageJson.versionWithMinorPlusOneAndPatchZero;
      }
      if (this.versionType === 'major') {
        newVersion =
          this.project.packageJson
            .versionWithMajorPlusOneAndMinorZeroAndPatchZero;
      }
    }

    const originalNewVersion = newVersion;

    while (true) {
      Helpers.info(`New version will be: ${newVersion}`);
      const confirm = await Helpers.questionYesNo(
        'Do you want to continue? (no -> edit version manually) ',
      );
      if (confirm) {
        break;
      } else {
        newVersion = await Helpers.consoleGui.input({
          question: 'Provide proper new version and press enter',
          defaultValue: originalNewVersion,
          validate(value: string) {
            const regexForValidationNpmVersionWithPossiblePreRelease =
              /^(\d+\.\d+\.\d+)(\-[a-zA-Z0-9]+)?$/;
            return regexForValidationNpmVersionWithPossiblePreRelease.test(
              value,
            );
          },
        });
      }
    }
    this.newVersion = newVersion;
    //#endregion
  }
  //#endregion

  //#region methods & getters / select release type
  protected async selectReleaseType(
    versionToUseResolveFn?: (
      releaseVersionBumpType: CoreModels.ReleaseVersionType,
    ) => string,
  ): Promise<CoreModels.ReleaseVersionType> {
    //#region @backendFunc
    if (this.automaticRelease) {
      return 'patch';
    }
    const options = [
      {
        name: `Patch release (v${
          versionToUseResolveFn
            ? versionToUseResolveFn('patch')
            : this.project.packageJson.versionWithPatchPlusOne
        })`,
        value: 'patch' as CoreModels.ReleaseVersionType,
      },
      {
        name: `Minor release (v${
          versionToUseResolveFn
            ? versionToUseResolveFn('minor')
            : this.project.packageJson.versionWithMinorPlusOneAndPatchZero
        })`,
        value: 'minor' as CoreModels.ReleaseVersionType,
      },
      {
        name: `Major release (v${
          versionToUseResolveFn
            ? versionToUseResolveFn('major')
            : this.project.packageJson
                .versionWithMajorPlusOneAndMinorZeroAndPatchZero
        })`,
        value: 'major' as CoreModels.ReleaseVersionType,
      },
    ];
    const selected =
      await Helpers.consoleGui.select<CoreModels.ReleaseVersionType>(
        'Select release type',
        options,
      );
    return selected;
    //#endregion
  }
  //#endregion

  //#region methods & getters / commit message in changelog transform fn
  protected async commitMessageInChangelogTransformFn(
    message: string,
  ): Promise<string> {
    return message;
  }
  //#endregion

  //#region methods & getters / calculate item
  async getChangelogContentToAppend(askForEveryItem: boolean): Promise<string> {
    //#region @backendFunc
    let newChangeLogContentToAdd = '';
    for (const commit of this.commitsForChangelog) {
      const template =
        (await this.changelogItemTemplate(commit.index, askForEveryItem)) +
        '\n';
      newChangeLogContentToAdd += template;
    }

    const thingsToAddToChangeLog = `${
      newChangeLogContentToAdd
        ? `${this.changeLogKeyWord()} ${this.newVersion} ` +
          `(${dateformat(new Date(), 'yyyy-mm-dd')})\n` +
          `----------------------------------\n` +
          `${newChangeLogContentToAdd.trim() + '\n'}\n`
        : ''
    }`;
    return thingsToAddToChangeLog;
    //#endregion
  }
  //#endregion

  //#region methods & getters / update changelog.md from commits
  /**
   * TODO extend this to all commits from last release
   */
  async updateChangeLogFromCommits(): Promise<void> {
    //#region @backendFunc
    let askForEveryItem = false;
    while (true) {
      let thingsToAddToChangeLog =
        await this.getChangelogContentToAppend(askForEveryItem);

      console.log(
        `New things for changelog.md:\n${chalk.gray.bold(
          thingsToAddToChangeLog,
        )}`,
      );

      if (
        !(await Helpers.questionYesNo(
          'Accept this new things in changelog (if no -> edit mode) ?',
        ))
      ) {
        askForEveryItem = true;
        continue;
      }

      const changeLogNewContent =
        thingsToAddToChangeLog + `${this.changelogContent.trim()}\n`;

      this.project.writeFile(this.changeLogPath, changeLogNewContent);
      break;
    }
    //#endregion
  }
  //#endregion

  //#region methods & getters / extract changed libraries in last commit
  async extractChangedLibrariesInCommit(
    hashOrIndex: string | number,
  ): Promise<string> {
    //#region @backendFunc
    const hash = _.isString(hashOrIndex) ? hashOrIndex : void 0;
    const index = _.isNumber(hashOrIndex) ? hashOrIndex : void 0;
    const useHash = !!hash;
    const lastChanges = useHash
      ? await this.project.git.getChangedFilesInCommitByHash(hash)
      : await this.project.git.getChangedFilesInCommitByIndex(index);

    const libraries = this.project.libraryBuild.libraries.filter(l => {
      const libraryRelativePath = l.location.replace(
        this.project.location + '/',
        '',
      );
      return lastChanges.some(c => c.includes(libraryRelativePath));
    });
    return libraries.map(l => l.name).join(', ');
    //#endregion
  }
  //#endregion

  //#region methods & getters / change log item template
  async changelogItemTemplate(
    hashOrIndex: string | number,
    confirmEveryItem: boolean = false,
  ): Promise<string> {
    //#region @backendFunc
    const hash = _.isString(hashOrIndex) ? hashOrIndex : void 0;
    const index = _.isNumber(hashOrIndex) ? hashOrIndex : void 0;
    const useHash = !!hash;
    const commitMessage = useHash
      ? await this.project.git.getCommitMessageByHash(hash)
      : await this.project.git.getCommitMessageByIndex(index);
    const jiraNumbers = CommitData.extractAndOrderJiraNumbers(commitMessage);
    const message = CommitData.cleanMessageFromJiraNumTeamIdEtc(commitMessage);
    // console.log({ data, commit });
    const extractedLibraries =
      await this.extractChangedLibrariesInCommit(hashOrIndex);
    const translatedMessage = _.upperFirst(
      await this.commitMessageInChangelogTransformFn(
        message.replace(/\-/g, '').replace(/\:/g, ''),
      ),
    );

    let result = (
      `* [${_.last(jiraNumbers)}] - ` +
      `${extractedLibraries ? extractedLibraries + ' - ' : ''}` +
      ` ${translatedMessage}`
    )
      .replace(/\-  \-/g, ' - ')
      .replace(/\ \ /g, ' ');

    if (confirmEveryItem) {
      console.log(
        `Confirm changelog new item ${chalk.gray(
          `(from "${commitMessage}")`,
        )}:\n` + `\n${chalk.italic(result)}\n`,
      );
      const itemIsOK = await Helpers.questionYesNo('Is this item OK ?');
      if (!itemIsOK) {
        const confirm = await Helpers.consoleGui.input({
          question: 'Provide proper changelog item or press enter to confirm',
          defaultValue: result,
          // required: false,
        });
        result = confirm;
      }
    }

    // replace double spaces
    result = result.replace(/\ \ /g, ' ');
    result = result.replace(/\ \ /g, ' ');
    result = result.replace(/\ \ /g, ' ');
    return result;
    //#endregion
  }
  //#endregion

  //#region methods & getters / generate last changes summary
  async generateLastChangesSummary(): Promise<string> {
    const lastReleaseCommitData = await this.getLastReleaseCommitData();
    const hasLastReleaseCommit = lastReleaseCommitData.index !== -1;
    const lastReleaseCommitMsg = !hasLastReleaseCommit
      ? '< nothing release yet >'
      : lastReleaseCommitData.lastReleaseCommitMsg;

    return `${chalk.bold.gray('Last changelog.md notes summary')}:
${await this.getLastPackageVersionChangesFromChnagelog()}

${chalk.bold.gray(
  hasLastReleaseCommit ? 'Last commits up to release commit' : 'Last 3 commits',
)}:
${await this.getLastChangesFromCommits({
  maxMessagesToCheck: hasLastReleaseCommit ? Number.POSITIVE_INFINITY : 3,
  stopOnCommitMessage: hasLastReleaseCommit
    ? lastReleaseCommitData.lastReleaseCommitMsg
    : '',
})}
    `;
  }
  //#endregion

  //#region methods & getters / get last changes from commits
  async getLastChangesFromCommits({
    maxMessagesToCheck = 3,
    stopOnCommitMessage = '',
  }: {
    /**
     * default 3
     */
    maxMessagesToCheck?: number;
    /**
     * stop serching on commit message
     */
    stopOnCommitMessage?: string;
  } = {}): Promise<string> {
    //#region @backendFunc
    let index = 0;
    const commits = [] as string[];
    while (true) {
      const commitMessage =
        await this.project.git.getCommitMessageByIndex(index);
      commits.push(commitMessage);
      ++index;
      if (
        !!(stopOnCommitMessage || '').trim() &&
        commitMessage.includes(stopOnCommitMessage)
      ) {
        break;
      }
      if (index > maxMessagesToCheck) {
        break;
      }
    }
    return commits
      .map(c => chalk.italic(c))
      .map((c, index) => `${index + 1}. ${c}`)
      .join('\n');
    //#endregion
  }
  //#endregion

  //#region methods & getters / get last release commit data
  async getLastReleaseCommitData(): Promise<{
    lastReleaseCommitMsg: string;
    /**
     * -1 if not found
     */
    index: number;
  }> {
    //#region @backendFunc
    let index = 0;
    const maxMessages = 50;
    while (true) {
      const commitMessage =
        await this.project.git.getCommitMessageByIndex(index);

      const npmVersionRegex = /\d+\.\d+\.\d+/;
      // console.log('commitMessage', { index, commitMessage });
      if (
        this.getReleaseWords().some(r =>
          commitMessage.toLowerCase().includes(r),
        )
      ) {
        // console.log('FOUNDED', { commitMessage });
        const match = commitMessage.match(npmVersionRegex);
        if (match) {
          2;
          return { lastReleaseCommitMsg: commitMessage, index };
        }
      }
      ++index;
      if (index > maxMessages) {
        break;
      }
    }
    return { lastReleaseCommitMsg: '', index: -1 };
    //#endregion
  }
  //#endregion

  //#region methods & getters / get last changes from changelog
  async getLastPackageVersionChangesFromChnagelog(): Promise<string> {
    //#region @backendFunc
    if (!this.project.hasFile(this.changeLogPath)) {
      return `< project doesn't use CHANGELOG.md yet >`;
    }
    const changelogData = this.getChnagelogData();
    if (changelogData.length === 0) {
      return `< no changelog data >`;
    }
    const validToShow: ChangelogData[] = [];
    while (true) {
      const lastRelease = changelogData.shift();
      if (lastRelease.version === this.project.packageJson.version) {
        validToShow.push(lastRelease);
      } else {
        break;
      }
    }
    return validToShow
      .map(cd => {
        return (
          `${this.changeLogKeyWord()} ${cd.version} (${cd.date}):` +
          `\n${cd.changes.join('\n')}`
        );
      })
      .join('\n');
    // const changelogData = this.getChnagelogData();
    // return changelogData.slice(0, 3).map(cd => {
    //   return `${chalk.bold(cd.version)} (${cd.date}):`
    //   // return `${chalk.bold(cd.version)} (${cd.date}):
    // }).join('\n');
    // const changelog = this.project.readFile(this.changeLogPath) || '';
    // const splited = changelog
    //   .split('\n')
    //   .slice(0, 5)
    //   .filter(l => !!l.trim())
    //   .map(l => chalk.italic(l));
    // return splited.join('\n').trim();
    //#endregion
  }
  //#endregion

  //#region methods & getters / get changelog path
  private get changeLogPath() {
    //#region @backendFunc
    return this.project.hasFile('changelog.md')
      ? 'changelog.md'
      : 'CHANGELOG.md';
    //#endregion
  }
  //#endregion

  //#region methods & getters / get changelog content
  get changelogContent() {
    return this.project.readFile(this.changeLogPath) || '';
  }
  //#endregion

  //#region methods & getters / change log key word
  changeLogKeyWord() {
    return 'Changes in version';
  }
  //#endregion

  //#region methods & getters / get changelog data
  getChnagelogData(): ChangelogData[] {
    //#region @backendFunc
    const changelogData: ChangelogData[] = [];
    const keyword = this.changeLogKeyWord();
    const regex = new RegExp(
      `${keyword} (\\d+\\.\\d+\\.\\d+) \\((\\d{4}-\\d{2}-\\d{2})\\)\\s*[-]+\\s*([\\s\\S]*?)(?=${keyword} \\d+\\.\\d+\\.\\d+ \\(|$)`,
      'g',
    );

    let match;
    while ((match = regex.exec(this.changelogContent)) !== null) {
      const version = match[1];
      const date = match[2];
      const changesText = match[3].trim();
      const changes = changesText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);

      changelogData.push({
        changes,
        version,
        date,
      });
    }

    return changelogData;
    //#endregion
  }
  //#endregion
}
