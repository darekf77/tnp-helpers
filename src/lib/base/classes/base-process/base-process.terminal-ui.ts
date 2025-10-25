//#region imports
import { CoreModels, Helpers, UtilsTerminal, _ } from 'tnp-core/src';
import { BaseCliWorkerTerminalUI, BaseWorkerTerminalActionReturnType } from 'tnp-helpers/src';

import { BaseProcessWorker } from './base-process.worker';
//#endregion

export class BaseProcessTerminalUI extends BaseCliWorkerTerminalUI<BaseProcessWorker> {

  protected async headerText(): Promise<string> {
    return null;
  }

  textHeaderStyle(): CoreModels.CfontStyle {
    return 'block';
  }

  getWorkerTerminalActions(options?: {
    exitIsOnlyReturn?: boolean;
    chooseAction?: boolean;
  }): BaseWorkerTerminalActionReturnType {
    //#region @backendFunc
    const myActions: BaseWorkerTerminalActionReturnType = {
      previewSTDOUT: {
        name: 'Preview STDOUT',
        action: async () => {
          Helpers.info(`Preview STDOUT`);
          // const ctrl = await this.worker.getControllerForRemoteConnection();
          // const list = (await ctrl.getEntities().request())?.body.json || [];
          // console.log(list.map( c => `- ${c.id} ${c.description}` ).join('\n'));
          // Helpers.info(`Fetched ${list.length} entities`);
          // await UtilsTerminal.pressAnyKeyToContinueAsync({
          //   message: 'Press any key to go back to main menu',
          // });
        },
      },
      previewSTDERR: {
        name: 'Preview STDERR',
        action: async () => {
          Helpers.info(`Preview STDERR`);
          // const ctrl = await this.worker.getControllerForRemoteConnection();
          // const list = (await ctrl.getEntities().request())?.body.json || [];
          // console.log(list.map( c => `- ${c.id} ${c.description}` ).join('\n'));
          // Helpers.info(`Fetched ${list.length} entities`);
          // await UtilsTerminal.pressAnyKeyToContinueAsync({
          //   message: 'Press any key to go back to main menu',
          // });
        },
      },
    };

    return {
      ...this.chooseAction,
      ...myActions,
      ...super.getWorkerTerminalActions({ chooseAction: false }),
    };
    //#endregion
  }


}
