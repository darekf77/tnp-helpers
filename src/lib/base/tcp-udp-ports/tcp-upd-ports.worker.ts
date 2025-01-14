//#region imports
import { BaseCliWorker, CfontStyle } from '../classes/base-cli-worker';
import { _ } from 'tnp-core/src';
import { Helpers } from '../../index';
import { PortsController } from '../tcp-udp-ports/ports.controller';
import { PortsContext } from '../tcp-udp-ports/tcp-udp-ports.context';
import { UtilsTerminal } from 'tnp-core/src';
//#endregion

export class PortsWorker extends BaseCliWorker<PortsController> {
  //#region methods / get controller for remote connection
  private portsController: PortsController | undefined;
  async getControllerForRemoteConnection(): Promise<PortsController> {
    if (this.portsController) {
      return this.portsController;
    }
    await this.waitForProcessPortSavedToDisk();
    const refRemote = await PortsContext.initialize({
      overrideRemoteHost: `http://localhost:${this.processLocalInfoObj.port}`,
    });
    this.portsController = refRemote.getInstanceBy(PortsController);
    return this.portsController;
  }
  //#endregion

  //#region methods / header text
  protected async headerText(): Promise<string> {
    return 'TCP/UDP|Ports DB';
  }
  //#endregion

  //#region methods / header text style
  protected textHeaderStyle(): CfontStyle {
    return 'block';
  }
  //#endregion

  //#region methods / start normally in current process
  /**
   * start normally process
   * this will crash if process already started
   */
  async startNormallyInCurrentProcess() {
    //#region @backendFunc
    await this.killWorkerWithLowerVersion();
    await this.preventStartIfAlreadyStarted();
    const port = await this.getServicePort();

    await PortsContext.initialize({
      overrideHost: `http://localhost:${port}`,
    });

    await this.initializeWorkerMetadata();

    Helpers.info(`Service started !`);

    this.preventExternalConfigChange();
    // await Helpers.pressKeyAndContinue('Press any key to enter menu');
    await this._infoScreen();
    //#endregion
  }
  //#endregion

  //#region methods / get worker terminal actions
  getWorkerTerminalActions() {
    //#region @backendFunc
    return {
      showTakenPorts: {
        name: 'Show all taken ports by os',
        action: async () => {
          const controller = await this.getControllerForRemoteConnection();
          const ports = await controller.getAllAssignedPorts().received;
          await UtilsTerminal.previewLongList(
            ports.body.json.map(c => `- ${c.port} ${c.serviceId}`).join('\n'),
          );
        },
      },
      ...super.getWorkerTerminalActions(),
    };
    //#endregion
  }
  //#endregion
}
