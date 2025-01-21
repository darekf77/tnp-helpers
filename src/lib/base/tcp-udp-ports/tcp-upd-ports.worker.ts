//#region imports
import { BaseCliWorker, CfontStyle } from '../classes/base-cli-worker';
import { _ } from 'tnp-core/src';
import { Helpers, Port, PortStatus, PortStatusArr } from '../../index';
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
    this.displaySpecialWorkerReadyMessage();
    // await Helpers.pressKeyAndContinue('Press any key to enter menu');
    await this.infoScreen();
    //#endregion
  }
  //#endregion

  //#region methods / display menu with items
  protected async displayItemsForPortsStatus(status: PortStatus) {
    //#region @backendFunc
    const controller = await this.getControllerForRemoteConnection();
    const portsData = await controller.getPortsByStatus(status).received;
    const ports = portsData.body.json.map(c => c.titleOnList);
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

  //#region methods / get worker terminal actions
  getWorkerTerminalActions(options?: { exitIsOnlyReturn?: boolean }) {
    //#region @backendFunc
    options = options || {};
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
      ...this.chooseAction,
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
      editAddTakeByOsPort: {
        name: 'Edit/Add/Delete "Take by os ports"',
        action: async () => {
          await this.crudMenuForTakeByOsPorts();
        },
      },
      ...super.getWorkerTerminalActions({ chooseAction: false, ...options }),
    };
    //#endregion
  }
  //#endregion

  //#region methods / get new port to add
  protected async getNewPortToAdd(): Promise<number> {
    //#region @backendFunc
    const ctrl = await this.getControllerForRemoteConnection();
    let portToAdd: number;
    while (true) {
      const getFreePort = (await ctrl.getFirstFreePort().received).body.json
        .port;

      const inputNumber = await UtilsTerminal.input({
        defaultValue: getFreePort?.toString(),
        question: 'Enter port number',
      });
      portToAdd = Number(inputNumber);
      const portIsNumber = !isNaN(portToAdd);
      const portInRange =
        portToAdd >= ctrl.START_PORT && portToAdd <= ctrl.END_PORT;

      if (!portIsNumber || !portInRange) {
        {
          if (
            await UtilsTerminal.confirm({
              message: `Port number is not valid. Do you want to try again?`,
              defaultValue: true,
            })
          ) {
            continue;
          } else {
            return;
          }
        }
      }
      if (portIsNumber && portInRange) {
        break;
      }
    }
    return portToAdd;
    //#endregion
  }
  //#endregion

  //#region methods / add port process
  protected async addPortTerminalUiProcess(): Promise<void> {
    //#region @backendFunc
    const ctrl = await this.getControllerForRemoteConnection();
    let portToAdd: number = await this.getNewPortToAdd();

    while (true) {
      const uniqueId = await UtilsTerminal.input({
        defaultValue: `my-service-on-port-${portToAdd}`,
        question: 'Enter service unique description',
      });
      try {
        await UtilsTerminal.pressAnyKeyToContinueAsync();
        const addedPort = (
          await ctrl.addTakeByOsPort(portToAdd, encodeURIComponent(uniqueId))
            .received
        ).body.json;
        await UtilsTerminal.pressAnyKeyToContinueAsync({
          message: `Port added successfully. Press any key to continue...`,
        });
        return;
      } catch (error) {
        await UtilsTerminal.pressAnyKeyToContinueAsync({
          message: 'Something went wrong. Press any key to continue...',
        });
        return;
      }
    }
    //#endregion
  }
  //#endregion

  //#region methods / select port process
  protected async selectPortProcess(
    ports: Port[],
    title: string,
  ): Promise<Port> {
    //#region @backendFunc
    const selectedPort = await UtilsTerminal.select<number>({
      question: title,
      choices: [
        {
          name: 'Back',
          value: undefined,
        },
        ...ports.map(p => ({
          name: p.titleOnList,
          value: p.port,
        })),
      ],
    });

    return ports.find(f => f.port === selectedPort);
    //#endregion
  }
  //#endregion

  //#region methods / delete port process
  protected async deletePortTerminalUiProcess() {
    //#region @backendFunc
    const ctrl = await this.getControllerForRemoteConnection();
    const portsTakeByOs = (
      await ctrl.getPortsByStatus('assigned-taken-by-os').received
    ).body.json;
    const selectedPort = await this.selectPortProcess(
      portsTakeByOs,
      'Select port to delete (make it unassigned)',
    );

    if (!selectedPort) {
      return;
    }
    try {
      await ctrl.deletePort(selectedPort.port).received;
      await UtilsTerminal.pressAnyKeyToContinueAsync({
        message: 'Port deleted successfully. Press any key to continue...',
      });
      return;
    } catch (error) {
      await UtilsTerminal.pressAnyKeyToContinueAsync({
        message: 'Something went wrong. Press any key to continue...',
      });
      return;
    }
    //#endregion
  }
  //#endregion

  //#region methods / edit port process
  protected async editPortTerminalUiProcess() {
    //#region @backendFunc
    const ctrl = await this.getControllerForRemoteConnection();
    const portsTakeByOs = (
      await ctrl.getPortsByStatus('assigned-taken-by-os').received
    ).body.json;

    const selectedPort = await this.selectPortProcess(
      portsTakeByOs,
      'Select port to edit',
    );

    if (!selectedPort) {
      return;
    }
    while (true) {
      const newDescription = await UtilsTerminal.input({
        question: 'Enter new unique Id (description)',
        defaultValue: selectedPort.serviceId,
      });
      try {
        const updatePort = (
          await ctrl.updatePortUniqueId(
            selectedPort.port,
            encodeURIComponent(newDescription),
          ).received
        ).body.json;
        await UtilsTerminal.pressAnyKeyToContinueAsync({
          message: `Port edited successfully. Press any key to continue...`,
        });
        return;
      } catch (error) {
        await UtilsTerminal.pressAnyKeyToContinueAsync({
          message: 'Something went wrong. Press any key to continue...',
        });
        return;
      }
    }

    //#endregion
  }
  //#endregion

  //#region methods / crud menu for take by os ports
  protected async crudMenuForTakeByOsPorts() {
    const { selected: actionChoice } =
      await UtilsTerminal.selectActionAndExecute({
        back: {
          name: ' - back - ',
        },
        editPort: {
          name: 'Edit port',
        },
        addPort: {
          name: 'Add port',
        },
        deletePort: {
          name: 'Delete port (make it unassigned)',
        },
      });

    switch (actionChoice) {
      case 'editPort':
        await this.editPortTerminalUiProcess();
        break;
      case 'addPort':
        await this.addPortTerminalUiProcess();
        break;
      case 'deletePort':
        await this.deletePortTerminalUiProcess();
        break;
    }
  }
  //#endregion
}
