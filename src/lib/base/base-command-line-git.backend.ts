import { Helpers } from "../index";
import { CommandLineFeature } from "./base-command-line.backend";
import { BaseProject } from "./base-project";
import { chalk, _ } from "tnp-core";



export class BaseCommandLineGit<PARAMS = any, PROJECT extends BaseProject<any, any> = BaseProject> extends CommandLineFeature<PARAMS, PROJECT> {
  public _() {
    Helpers.error('Please select git command');
  }


  //#region commands / reset
  async reset() {
    const project = this.project;
    const additonalParams = this.args.join(' ').trim();

    let overrideBranchToReset: string;


    var branches = Helpers.arrays.uniqArray(this.project.git.getBranchesNamesBy(additonalParams).map(a => {
      return a.replace(`remotes/origin/`, '');
    }) || this.project.getMainBranches());

    if (branches.length > 0) {
      overrideBranchToReset = await Helpers.autocompleteAsk('Choose branch to reset in this project (with children):',
        branches.map(b => {
          return { name: b, value: b }
        }))
    }

    const childrentMsg = (_.isArray(project.children) && project.children.length > 0) ?
      `- external modules:\n${project.children.map(c => `${c.basename} (${chalk.yellow(c.name)})`).join('\n')
      }` : ''

    if (project.children?.length > 0) {
      Helpers.info(`

    YOU ARE RESETING EVERYTHING TO BRANCH: ${chalk.bold(overrideBranchToReset ? overrideBranchToReset : this.project.mainBranch)}

    `)
      const res = await Helpers.questionYesNo(
        `Are you sure you wanna reset hard and pull latest changes for:
- curret project (${project.name})
${childrentMsg}
`);
      if (res) {
        await project.resetProcess(overrideBranchToReset);
        for (const child of project.children) {
          await child.resetProcess(overrideBranchToReset);
        }
      }
    } else {
      await project.resetProcess(overrideBranchToReset);
    }

  }
  //#endregion

  //#region commands / rebase
  rebase() {

  }
  //#endregion

  //#region commands / stash
  /**
   * stash only staged or all if not staged
   */
  stash() {

  }
  //#endregion

  //#region commands / push (default temp commit)
  // push() {

  // }
  //#endregion

  //#region commands / push fix
  pushFix() {
    console.log('Pushig fix!')
  }
  pfix() {
    this.pushFix();
  }
  //#endregion

  //#region commands / push feature
  pushFeature() {

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


  SET_ORIGIN(newOriginNameOrUrl: string) {
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

  RENAME_ORIGIN(newOriginNameOrUrl: string) {
    const proj = this.project;
    if (proj && proj.git.isGitRepo) {
      proj.git.renameOrigin(newOriginNameOrUrl);
    } else {
      Helpers.error(`This folder is not a git repo... `, false, true);
    }
    this._exit()
  }

  LAST_TAG_HASH() {
    Helpers.info(this.project.git.lastTagHash());
    this._exit();
  }

  LAST_TAG() {
    const proj = this.project;
    Helpers.info(`

    last tag: ${proj.git.lastTagVersionName}
    last tag hash: ${proj.git.lastTagHash()}

    `);
    this._exit();
  }

  CHECK_TAG_EXISTS(args) {
    Helpers.info(`tag "${args}"  exits = ${Helpers.git.checkTagExists(args)}    `);
    this._exit()
  }


}
