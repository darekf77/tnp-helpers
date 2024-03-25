import { Helpers } from "../index";
import { CommandLineFeature } from "./base-command-line.backend";
import { BaseProject } from "./base-project";
import { chalk, _ } from "tnp-core";



export class BaseCommandLineGit<PARAMS = any, PROJECT = BaseProject> extends CommandLineFeature {
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


}
