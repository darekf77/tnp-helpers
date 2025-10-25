//#region imports
import { _, frameworkName } from 'tnp-core/src';
import { BaseCliWorker } from 'tnp-helpers/src';

import { BaseProcessContext } from './base-process.context';
import { BaseProcessController } from './base-process.controller';
import { BaseProcessTerminalUI } from './base-process.terminal-ui';
//#endregion

export class BaseProcessWorker extends BaseCliWorker<
  BaseProcessController,
  BaseProcessTerminalUI
> {
  static async forCommand(command: string, cwd: string): Promise<string> {
    const worker = new BaseProcessWorker(
      `base-process-worker-for-${_.kebabCase(command)}`,
      `${frameworkName} workerProcessStart`,
    );

    const ctrl = await worker.getControllerForRemoteConnection();
    await ctrl
      .startCommand({
        command,
        cwd,
      })
      .request();

    return worker.serviceID;
  }

  //#region properties
  // TODO 'as any' for some reason is necessary
  // TypeScript d.ts generation bug
  workerContextTemplate = BaseProcessContext as any;

  // TODO ts ignore needed for some reason
  // @ts-ignore
  terminalUI = new BaseProcessTerminalUI(this);
  controllerClass = BaseProcessController;
  //#endregion

  //#region constructor
  constructor(
    /**
     * unique id for service
     */
    serviceID: string,
    /**
     * external command that will start service
     */
    startCommand: string,
  ) {
    // replace '0.0.0' with CURRENT_PACKAGE_VERSION for versioning
    super(serviceID, startCommand, '0.0.0');
  }
  //#endregion
}
