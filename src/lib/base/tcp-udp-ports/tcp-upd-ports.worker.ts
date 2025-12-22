//#region imports
import { _ } from 'tnp-core/src';

import { Helpers } from '../../index';
import { BaseCliWorker } from '../classes/base-cli-worker';
import { TaonPortsController } from '../tcp-udp-ports/ports.controller';
import { TaonPortsContextTemplate } from '../tcp-udp-ports/tcp-udp-ports.context';

import { TcpUdpPortsTerminalUI } from './tcp-upd-ports-terminal-ui';
//#endregion

export class PortsWorker extends BaseCliWorker<
  TaonPortsController,
  TcpUdpPortsTerminalUI
> {
  terminalUI = new TcpUdpPortsTerminalUI(this);

  workerContextTemplate = TaonPortsContextTemplate as any; // TODO for some reason as any is nessesary
  controllerClass = TaonPortsController;
}