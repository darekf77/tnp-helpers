import { Helpers, LinkedProject } from '../index';
import { CommandLineFeature } from './command-line-feature.backend';
import { BaseProject } from './base-project';
import { chalk, _, path } from 'tnp-core/src';
import { TypeOfCommit, CommitData } from './commit-data';
import { config } from 'tnp-config/src';
import { crossPlatformPath } from 'tnp-core/src';

export class BaseCommandLine<
  PARAMS = any,
  PROJECT extends BaseProject<any, any> = BaseProject,
> extends CommandLineFeature<PARAMS, PROJECT> {
  public _() {
    Helpers.error('Please select git command');
  }

  prevennCwdIsNotProject() {
    if (!this.project) {
      Helpers.error('This is not a project folder', false, true);
    }
  }

  //#region commands / set editor
  async setEditor() {
    await this.ins.configDb.selectCodeEditor();
    this._exit();
  }
  //#endregion

  //#region commands / quick git update
  /**
   * quick git update push
   */
  async update() {
    this.prevennCwdIsNotProject();
    Helpers.info('Updating & push project...');
    try {
      this.project.git.addAndCommit('chore: update');
    } catch (error) {}
    await this.project.git.pushCurrentBranch({
      askToRetry: true,
      forcePushNoQuestion: true,
    });
    Helpers.info('Done');
    this._exit();
  }

  async up() {
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
    ).reverse();
    Helpers.taskDone(`found ${results.length} projects...`);

    const openInEditor = async (proj: BaseProject) => {
      Helpers.taskStarted(`Getting code editor info...`);
      const editor = await this.ins.configDb.getCodeEditor();
      Helpers.taskDone(`Got code editor info...`);
      const embededProject = proj.embeddedProject as BaseProject;
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

  //#region commands / pull
  async pull() {
    this.prevennCwdIsNotProject();
    await this.project.pullProcess();
    this._exit();
  }
  //#endregion

  //#region commands / reset
  private __resetInfo(branchToReset: string) {
    Helpers.info(`

    YOU ARE RESETING EVERYTHING TO BRANCH: ${chalk.bold(branchToReset)}

- curret project (${this.project.name})
${
  _.isArray(this.project.children) && this.project.children.length > 0
    ? `- modules:\n${this.project.children
        .map(c => `\t${c.basename} (${chalk.yellow(c.name)})`)
        .join('\n')}`
    : ''
}
      `);
  }

  async reset() {
    // Helpers.clearConsole();
    this.prevennCwdIsNotProject();
    const parent = this.project.parent as BaseProject;
    const branchFromLinkedProjectConfig = parent?.linkedProjects?.find(l => {
      return (
        crossPlatformPath([parent.location, l.relativeClonePath]) ===
        this.project.location
      );
    })?.deafultBranch;

    let overrideBranchToReset =
      this.firstArg ||
      branchFromLinkedProjectConfig ||
      this.project.core?.branch ||
      this.project.getDefaultDevelopmentBranch() ||
      this.project.git.currentBranchName;

    if (this.project.core?.branch) {
      Helpers.info(`

        Core branch for project: ${this.project.core?.branch}

        `);
    }

    const resetOnlyChildren =
      !!this.project.getLinkedProjectsConfig().resetOnlyChildren;

    const branches = Helpers.uniqArray([
      ...this.__filterBranchesByPattern(overrideBranchToReset),
      ...this.__filterBranchesByPattern(''),
    ]);

    if (resetOnlyChildren) {
      Helpers.info(`Reseting only children...for defualt branches.`);
    } else {
      if (branches.length > 0) {
        overrideBranchToReset = await this.__selectBrach(branches);
      } else {
        Helpers.error(
          `No branch found by name "${overrideBranchToReset || this.firstArg}"`,
          false,
          true,
        );
      }
    }

    overrideBranchToReset =
      (overrideBranchToReset || '').split('/').pop() || '';
    this.__resetInfo(
      overrideBranchToReset
        ? overrideBranchToReset
        : this.project.getDefaultDevelopmentBranch(),
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
        `${resetProject.linkedProjects.length > 0 ? '(and children)' : ''} ?`,
    );
    if (res) {
      await resetProject.resetProcess(overrideBranchToReset);
    }

    this._exit();
  }
  //#endregion

  //#region commands / soft
  soft() {
    // TODO when aciton commit
    this.prevennCwdIsNotProject();
    this.project.git.resetSoftHEAD(1);
    this._exit();
  }
  //#endregion

  //#region commands / rebase
  async rebase() {
    this.prevennCwdIsNotProject();
    const currentBranch = this.project.git.currentBranchName;
    let safeReset = 10;
    let rebaseBranch =
      this.firstArg || this.project.getDefaultDevelopmentBranch();

    const branches = this.__filterBranchesByPattern(rebaseBranch);
    if (branches.length > 0) {
      rebaseBranch = await this.__selectBrach(branches);
    } else {
      Helpers.error(`No branch found by name "${rebaseBranch}"`, false, true);
    }

    try {
      this.project
        .run(
          `git reset--hard && git checkout ${rebaseBranch} && git reset--hard HEAD~${safeReset} && git pull origin ${rebaseBranch} ` +
            `&& git checkout ${currentBranch} && git reset--soft HEAD~1 && git stash && git reset--hard HEAD~${safeReset} && git rebase ${rebaseBranch} && git stash apply`,
          { output: false, silence: true },
        )
        .sync();
      await this.project.init();
      Helpers.info('REBASE DONE');
    } catch (error) {
      await this.project.init();
      Helpers.warn('PLEASE MERGE YOUR CHANGES');
    }
    this._exit();
  }
  //#endregion

  //#region commands / stash
  /**
   * stash only staged files
   */
  stash() {
    this.prevennCwdIsNotProject();
    this.project.git.stash({ onlyStaged: true });
    this._exit();
  }
  //#endregion

  //#region commands / stash all
  /**
   * stash all files
   */
  stashAll() {
    this.prevennCwdIsNotProject();
    this.project.git.stageAllFiles();
    this.project.git.stash({ onlyStaged: false });
    this._exit();
  }
  //#endregion

  //#region commands / push all origins
  /**
   * push force to all orgins
   */
  async pushAllForce() {
    this.prevennCwdIsNotProject();
    await this.pushAll(true);
  }

  /**
   * push to all origins
   */
  async pushAll(force = false) {
    this.prevennCwdIsNotProject();
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
    this.prevennCwdIsNotProject();
    await this.project.git.meltActionCommits(true);
    await this.project.pushProcess({
      ...options,
      forcePushNoQuestion: options.force,
      args: this.args,
      exitCallBack: () => {
        this._exit();
      },
      skipChildren: true,
    });
    if (options.noExit) {
      return;
    }
    this._exit();
  }
  //#endregion

  //#region commands / push
  async push(
    options: {
      force?: boolean;
      typeofCommit?: TypeOfCommit;
      origin?: string;
      commitMessageRequired?: boolean;
      noExit?: boolean;
    } = {},
  ) {
    this.prevennCwdIsNotProject();
    await this.project.pushProcess({
      ...options,
      forcePushNoQuestion: options.force,
      args: this.args,
      exitCallBack: () => {
        this._exit();
      },
    });
    if (options.noExit) {
      return;
    }
    this._exit();
  }
  //#endregion

  //#region  commands / melt
  public async melt() {
    this.prevennCwdIsNotProject();
    await this.meltUpdateCommits(true);
    this._exit();
  }
  //#endregion

  //#region melt updat ecommits
  private async meltUpdateCommits(hideInfo = false) {
    if (this.project.git.meltActionCommits(true) > 0) {
      if (!hideInfo) {
        this.project.git.stageAllFiles();
        if (
          !(await Helpers.consoleGui.question.yesNo(
            'Update commits has been reset. Continue with changes ?',
          ))
        ) {
          this._exit();
        }
      }
    }
  }
  //#endregion

  //#region commands / push feature
  async pf() {
    await this.pushFeature();
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
  //#endregion

  //#region commands / push test
  async pushTest() {
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'test', commitMessageRequired: true });
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

  //#region commands / push build
  async pushBuild() {
    await this.meltUpdateCommits();
    await this.push({ typeofCommit: 'build', commitMessageRequired: true });
  }
  //#endregion

  //#region commands / set origin
  SET_ORIGIN() {
    this.prevennCwdIsNotProject();
    const newOriginNameOrUrl: string = this.firstArg;
    const proj = this.project;
    if (proj && proj.git.isInsideGitRepo) {
      proj.run(`git remote rm origin`).sync();
      proj.run(`git remote add origin ${newOriginNameOrUrl} `).sync();
      Helpers.info(`Done`);
    } else {
      Helpers.error(`This folder is not a git repo... `, false, true);
    }

    this._exit();
  }
  //#endregion

  //#region commands / rename origin
  RENAME_ORIGIN() {
    this.prevennCwdIsNotProject();
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
  LAST_TAG_HASH() {
    this.prevennCwdIsNotProject();
    Helpers.info(this.project.git.lastTagHash());
    this._exit();
  }
  //#endregion

  //#region commands / last tag
  LAST_TAG() {
    this.prevennCwdIsNotProject();
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
    this.prevennCwdIsNotProject();
    await this.project.lint();
  }
  //#endregion

  //#region commands / version
  /**
   * TODO move somewhere
   */
  async version() {
    this.prevennCwdIsNotProject();
    console.log('Current project verison: ' + this.project.version);
    this._exit();
  }
  //#endregion

  //#region commands / init
  /**
   * TODO move somewhere
   */
  async init() {
    this.prevennCwdIsNotProject();
    await this.project.init();
    this._exit();
  }
  //#endregion

  //#region commands / struct
  /**
   * TODO move somewhere
   */
  async struct() {
    this.prevennCwdIsNotProject();
    await this.project.struct();
    this._exit();
  }
  //#endregion

  //#region commands / info
  /**
   * TODO move somewhere
   */
  async info() {
    this.prevennCwdIsNotProject();
    Helpers.clearConsole();
    await this.project.info();
    await this.project.saveAllLinkedProjectsToDB();
    this._exit();
  }
  //#endregion

  //#region commands / info
  modified() {
    this.prevennCwdIsNotProject();
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
  async UPDATE() {
    const linkedProjects = LinkedProject.detect(this.project.location).filter(
      linkedProj =>
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
      this.project.addLinkedProjects(linkedProjects);
    }
    await this.project.init();
    Helpers.info(`Linked projects updated`);
    this._exit(0);
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
    this.prevennCwdIsNotProject();
    const folders = Helpers.foldersFrom(this.project.location);

    folders
      .filter(c => !path.basename(c).startsWith('.'))
      .forEach(cwd => {
        Helpers.run(`git config--get remote.origin.url`, { cwd }).sync();
      });
    this._exit();
  }
  //#endregion

  isTerminalSupported() {
    console.log(`Terminal is supported: ${Helpers.isSupportedFiredevTerminal}`);
    this._exit();
  }

  PROJ_EXT() {
    this.prevennCwdIsNotProject();
    const p = this.project.pathFor('.vscode/extensions.json');
    const extensions: { recommendations: string[] } = Helpers.readJson(
      p,
      { recommendations: [] },
      true,
    );
    for (let index = 0; index < extensions.recommendations.length; index++) {
      const extname = extensions.recommendations[index];
      try {
        Helpers.taskStarted(`Installing: ${extname}`);
        Helpers.run(`code --install-extension ${extname}`).sync();
        Helpers.taskDone(`Installed: ${extname}`);
      } catch (error) {
        Helpers.warn(`Not able to install ${extname}`);
      }
    }
    this._exit();
  }

  projdb() {
    this.prevennCwdIsNotProject();
    Helpers.info(`Projects db location:
    ${this.project.projectsDbLocation}

    opening in vscode...

    `);
    Helpers.run(`code ${this.project.projectsDbLocation}`).sync();
    this._exit();
  }

  //#region filter all project branches by pattern
  private __filterBranchesByPattern(branchPatternOrBranchName: string) {
    return Helpers.arrays.uniqArray(
      this.project.git.getBranchesNamesBy(branchPatternOrBranchName).map(a => {
        return a.split('/').pop() || '';
      }) || this.project.getMainBranches(),
    );
  }
  //#endregion

  //#region select branch from list of branches
  private async __selectBrach(branches: string[]) {
    const childrenMsg =
      this.project.children.length == 0
        ? '(no children in project)'
        : '(with children)';
    return await Helpers.autocompleteAsk(
      `Choose branch to reset in this project ${childrenMsg}: `,
      branches.map(b => {
        return { name: b, value: b };
      }),
    );
  }
  //#endregion
}
