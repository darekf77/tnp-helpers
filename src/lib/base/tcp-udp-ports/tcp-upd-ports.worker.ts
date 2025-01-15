//#region imports
import { BaseCliWorker, CfontStyle } from '../classes/base-cli-worker';
import { _ } from 'tnp-core/src';
import { Helpers, PortStatus, PortStatusArr } from '../../index';
import { PortsController } from '../tcp-udp-ports/ports.controller';
import { PortsContext } from '../tcp-udp-ports/tcp-udp-ports.context';
import { UtilsTerminal } from 'tnp-core/src';
import { chalk } from 'tnp-core/src';
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

  //#region methods / display menu with items
  protected async displayItemsForPortsStatus(status: PortStatus) {
    //#region @backendFunc
    const controller = await this.getControllerForRemoteConnection();
    const portsData = await controller.getPortByStatus(status).received;
    const ports = portsData.body.json.map(
      c => `- ${c.port} <${chalk.gray(c.serviceId)}>`,
    );
    if (ports.length === 0) {
      Helpers.info(`

        No ports with status "${status}" as taken by os yet...

        `);

      await UtilsTerminal.pressAnyKeyToContinueAsync({
        message: 'Press any key to continue',
      });
    } else {
      await UtilsTerminal.previewLongList(ports.join('\n'));
    }
    //#endregion
  }
  //#endregion

  get backAction() {
    return {
      back: {
        name: 'Back',
        action: async () => {
          return true;
        },
      },
    };
  }

  //#region methods / get worker terminal actions
  getWorkerTerminalActions() {
    //#region @backendFunc
    const additionalActions = {};

    for (const portStatus of PortStatusArr) {
      additionalActions[`show${_.capitalize(portStatus)}Ports`] = {
        name: `Show all "${portStatus}" ports`,
        action: async () => {
          await this.displayItemsForPortsStatus(portStatus);
        },
      };
    }

    return {
      emptyAction: {
        name: ' -- choose any action below --',
        action: async () => {},
      },
      previewPorts: {
        name: 'Preview all ports',
        action: async () => {
          while (true) {
            const { selected } = await UtilsTerminal.selectActionAndExecute(
              {
                ...this.backAction,
                ...additionalActions,
              },
              {
                autocomplete: false,
                question: 'Select ports to preview',
              },
            );
            if (selected === 'back') {
              break;
            }
          }
        },
      },
      ...super.getWorkerTerminalActions(),
    };
    //#endregion
  }
  //#endregion
}
