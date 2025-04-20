//#region imports
import { EndpointContext } from 'taon/src';
import { _ } from 'tnp-core/src';

import { Helpers } from '../../index';
import { BaseCliWorker } from '../classes/base-cli-worker';
import { PortsController } from '../tcp-udp-ports/ports.controller';
import { PortsContextTemplate } from '../tcp-udp-ports/tcp-udp-ports.context';

import { TcpUdpPortsTerminalUI } from './tcp-upd-ports-terminal-ui';
//#endregion

export class PortsWorker extends BaseCliWorker<
  PortsController,
  TcpUdpPortsTerminalUI
> {
  terminalUI = new TcpUdpPortsTerminalUI(this);

  workerContextTemplate = PortsContextTemplate as any; // TODO for some reason as any is nessesary
  controllerClass = PortsController;
}
