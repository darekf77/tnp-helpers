//#region imports
import { _ } from 'tnp-core/src';

import { Helpers } from '../../index';
import { BaseCliWorker } from '../classes/base-cli-worker';
import { PortsController } from '../tcp-udp-ports/ports.controller';
import { PortsContext } from '../tcp-udp-ports/tcp-udp-ports.context';

import { TcpUdpPortsTerminalUI } from './tcp-upd-ports-terminal-ui';
//#endregion

export class PortsWorker extends BaseCliWorker<
  PortsController,
  TcpUdpPortsTerminalUI
> {
  terminalUi = new TcpUdpPortsTerminalUI(this);

  //#region methods / get controller for remote connection

  async getControllerForRemoteConnection(): Promise<PortsController> {
    await this.waitForProcessPortSavedToDisk();
    const refRemote = await PortsContext.initialize({
      overrideRemoteHost: `http://localhost:${this.processLocalInfoObj.port}`,
    });
    const portsController = refRemote.getInstanceBy(PortsController);
    return portsController;
  }
  //#endregion

  //#region methods / start normally in current process
  /**
   * start normally process
   * this will crash if process already started
   */
  async startNormallyInCurrentProcess():Promise<void> {
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
    this.terminalUi.displaySpecialWorkerReadyMessage();
    // await Helpers.pressKeyAndContinue('Press any key to enter menu');
    await this.terminalUi.infoScreen();
    //#endregion
  }
  //#endregion
}
