//#region imports
import { CoreModels, UtilsTerminal, _ } from 'tnp-core/src';

import { Helpers, Port, PortStatusArr } from '../../index';
import { BaseCliWorkerTerminalUI } from '../classes/base-cli-worker/base-cli-worker-terminal-ui';

import { PortStatus } from './ports.entity';
import type { PortsWorker } from './tcp-upd-ports.worker';
//#endregion

export class TcpUdpPortsTerminalUI extends BaseCliWorkerTerminalUI<PortsWorker> {
  //#region methods / header text
  protected async headerText(): Promise<string> {
    return 'TCP/UDP|Ports DB';
  }
  //#endregion

  //#region methods / header text style
  protected textHeaderStyle(): CoreModels.CfontStyle {
    return 'block';
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

  //#region methods / add port process
  protected async addPortTerminalUiProcess(): Promise<void> {
    //#region @backendFunc
    const ctrl = await this.worker.getRemoteControllerFor({
      methodOptions: {
        calledFrom: 'addPortTerminalUiProcess',
      },
    });
    let portToAdd: number = await this.getNewPortToAdd();

    while (true) {
      const uniqueId = await UtilsTerminal.input({
        defaultValue: `my-service-on-port-${portToAdd}`,
        question: 'Enter service unique description',
      });
      try {
        await UtilsTerminal.pressAnyKeyToContinueAsync();
        const addedPort = (
          await ctrl
            .addTakeByOsPort(portToAdd, encodeURIComponent(uniqueId))
            .request()
        ).body.json;
        await UtilsTerminal.pressAnyKeyToContinueAsync({
          message: `Port ${addedPort.port} added successfully. Press any key to continue...`,
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
  protected async deletePortTerminalUiProcess(): Promise<void> {
    //#region @backendFunc
    const ctrl = await this.worker.getRemoteControllerFor({
      methodOptions: {
        calledFrom: 'deletePortTerminalUiProcess',
      },
    });
    const portsTakeByOs = (
      await ctrl.getPortsByStatus('assigned-taken-by-os').request()
    ).body.json;
    const selectedPort = await this.selectPortProcess(
      portsTakeByOs,
      'Select port to delete (make it unassigned)',
    );

    if (!selectedPort) {
      return;
    }
    try {
      await ctrl.deletePort(selectedPort.port).request();
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
  protected async editPortTerminalUiProcess(): Promise<void> {
    //#region @backendFunc
    const ctrl = await this.worker.getRemoteControllerFor({
      methodOptions: {
        calledFrom: 'editPortTerminalUiProcess',
      },
    });
    const portsTakeByOs = (
      await ctrl.getPortsByStatus('assigned-taken-by-os').request()
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
          await ctrl
            .updatePortUniqueId(
              selectedPort.port,
              encodeURIComponent(newDescription),
            )
            .request()
        ).body.json;
        await UtilsTerminal.pressAnyKeyToContinueAsync({
          message: `Port ${updatePort.port} edited successfully. Press any key to continue...`,
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

  //#region methods / display menu with items
  protected async displayItemsForPortsStatus(status: PortStatus) {
    //#region @backendFunc
    const controller = await this.worker.getRemoteControllerFor({
      methodOptions: {
        calledFrom: `displayItemsForPortsStatus:${status}`,
      },
    });
    const portsData = await controller.getPortsByStatus(status).request();
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

  //#region methods / get new port to add
  private async getNewPortToAdd(): Promise<number> {
    //#region @backendFunc
    const ctrl = await this.worker.getRemoteControllerFor({
      methodOptions: {
        calledFrom: 'getNewPortToAdd',
      },
    });
    let portToAdd: number;
    while (true) {
      const getFreePort = (await ctrl.getFirstFreePort().request()).body.json
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
}
