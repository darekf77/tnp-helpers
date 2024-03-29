//#region imports
import { Helpers } from "../index";
import { _ } from "tnp-core/src";
import { BaseProject } from "./base-project";
import { CLASS } from "typescript-class-helpers/src";
//#endregion


export abstract class CommandLineFeature<PARAMS = any, PROJECT extends BaseProject<any, any> = BaseProject> {
  protected params: PARAMS;
  protected args: string[];
  get firstArg() {
    return _.first(this.args);
  }
  constructor(
    protected readonly argsWithParams: string,
    protected readonly methodNameToCall: string,
    /**
     * nearest project to cwd
     */
    protected project: PROJECT,
    /**
     * process.cwd()
     */
    protected cwd: string,
  ) {
    this.project = project;
    //#region resolve params and args
    // console.log({ args, methodNameToCall })

    // this.project = Project.Current as Project;
    const methods = CLASS.getMethodsNames(this).filter(f => !f.startsWith('_'));
    const firstArg = _.first(argsWithParams.split(' '));
    const method = methods.find(m => m === firstArg);
    if (method) {
      methodNameToCall = method;
      argsWithParams = argsWithParams.split(' ').slice(1).join(' ');
      this.argsWithParams = argsWithParams;
    }
    this.params = (require('minimist')(argsWithParams.split(' ')) || {});
    delete this.params['_']; // TODO quickfix
    ;
    const allArgsToClear = Object.keys(this.params);
    // for (const deleteArgKey of allArgsToClear) {
    //   delete this.params[deleteArgKey];
    // }
    // console.log({ clearArgs: allArgsToClear })
    this.args = Helpers.cliTool.removeArgsFromCommand(argsWithParams, allArgsToClear).split(' ').filter(f => !!f);

    Helpers.runSyncOrAsync({
      functionFn: this.__initialize__,
      arrayOfParams: [this.params, this.project, this.args],
      context: this,
    })
      .then(() => {
        if (methodNameToCall) {
          if (_.isFunction(this[methodNameToCall])) {
            this[methodNameToCall](argsWithParams, this.project);
          } else {
            Helpers.error(`Class ${CLASS.getName(this as any)} doesn't have method '${methodNameToCall}'`, false, true);
          }

        } else {
          this._();
        }
      });
    //#endregion
  }




  protected _exit(code = 0): void {
    process.exit(code)
  }

  protected __initialize__() {

  }

  _tryResolveChildIfInsideArg() {
    const { resolved, clearedCommand } = Helpers.cliTool
      .resolveItemFromArgsBegin<PROJECT>(this.args, arg => this.project.getChildBy(arg.replace(/\/$/, '')));
    this.project = resolved ? resolved : this.project;
    this.args = resolved ? clearedCommand.split(' ') : this.args;
  }

  /**
   * method called when not using class methods
   */
  public abstract _();


}

