//#region imports
import { Helpers } from 'tnp-helpers/src';
import { BaseFeatureForProject } from './base-feature-for-project';
import type { BaseProject } from './base-project';
import { CoreModels, chalk } from 'tnp-core/src';
import type { ChangelogData } from '.././models';
//#endregion

export class BaseReleaseProcess<
  PROJCET extends BaseProject = any,
> extends BaseFeatureForProject {
  //#region fields
  project: PROJCET;
  /**
   * Automatic release process of patch plus one version
   */
  automaticRelease: boolean = false;
  type: CoreModels.ReleaseType;
  lastChangesSummary: string;
  //#endregion

  //#region methods & getters / start release
  public async startRelease(
    options?: Partial<
      Pick<BaseReleaseProcess<PROJCET>, 'automaticRelease' | 'type'>
    >,
  ): Promise<void> {
    //#region @backendFunc
    Helpers.clearConsole();
    this.lastChangesSummary = await this.generateLastChangesSummary();
    console.log(`${chalk.bold.underline(`Release process for ${this.project.name}`)}:

${await this.lastChangesSummary}
    `);
    this.type = await this.selectReleaseType();

    //#endregion
  }
  //#endregion

  //#region methods & getters / select release type
  private async selectReleaseType(): Promise<CoreModels.ReleaseType> {
    //#region @backendFunc
    if (this.automaticRelease) {
      return 'patch';
    }
    const options = [
      {
        name: `Patch release (v${this.project.npmHelpers.versionWithPatchPlusOne})`,
        value: 'patch' as CoreModels.ReleaseType,
      },
      {
        name: `Minor release (v${this.project.npmHelpers.versionWithMinorPlusOneAndPatchZero})`,
        value: 'minor' as CoreModels.ReleaseType,
      },
      {
        name: `Major release (v${this.project.npmHelpers.versionWithMajorPlusOneAndMinorZeroAndPatchZero})`,
        value: 'major' as CoreModels.ReleaseType,
      },
    ];
    const selected = await Helpers.consoleGui.select<CoreModels.ReleaseType>(
      'Select release type',
      options,
    );
    return selected;
    //#endregion
  }
  //#endregion

  generateChangesForChangelog() {}

  //#region methods & getters / generate last changes summary
  async generateLastChangesSummary(): Promise<string> {
    const lastReleaseCommitData = await this.getLastReleaseCommitData();
    const hasLastReleaseCommit = lastReleaseCommitData.index !== -1;
    const lastReleaseCommitMsg = !hasLastReleaseCommit
      ? '< nothing release yet >'
      : lastReleaseCommitData.lastRelaseCommitMsg;

    return `${chalk.bold.gray('Last changelog notest summary')}:
${await this.getLastPackageVersionChangesFromChnagelog()}

${chalk.bold.gray(
  hasLastReleaseCommit ? 'Last commits up to relase commit' : 'Last 3 commits',
)}:
${await this.getLastChangesFromCommits({
  maxMessagesToCheck: hasLastReleaseCommit ? Number.POSITIVE_INFINITY : 3,
  stopOnCommitMessage: hasLastReleaseCommit
    ? lastReleaseCommitData.lastRelaseCommitMsg
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

  //#region methods & getters / get last relase commit data
  async getLastReleaseCommitData(): Promise<{
    lastRelaseCommitMsg: string;
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
      const releaseWorlds = ['release', 'wydanie'];
      const npmVersionRegex = /\d+\.\d+\.\d+/;
      // console.log('commitMessage', { index, commitMessage });
      if (releaseWorlds.some(r => commitMessage.toLowerCase().includes(r))) {
        // console.log('FOUNDED', { commitMessage });
        const match = commitMessage.match(npmVersionRegex);
        if (match) {
          2;
          return { lastRelaseCommitMsg: commitMessage, index };
        }
      }
      ++index;
      if (index > maxMessages) {
        break;
      }
    }
    return { lastRelaseCommitMsg: '', index: -1 };
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
      if (lastRelease.version === this.project.npmHelpers.version) {
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
