//#region imports
import { BaseCliWorker, CfontStyle } from './base-cli-worker';
import {
  _,
  crossPlatformPath,
  //#region @backend
  os,
  path,
  //#endregion
} from 'tnp-core/src';
import { BaseContext, Taon } from 'taon/src';
import { Helpers } from '../index';
// import type { BaseProject } from './base-project';
// import { config } from 'tnp-config/src';
import { BaseCliWorkerController } from './base-cli-worker-controller';
import { config } from 'tnp-config/src';

//#endregion

//#region port entity
@Taon.Entity({
  className: 'Port',
  uniqueKeyProp: 'port',
})
class Port extends Taon.Base.Entity {
  static from(opt: Omit<Port, 'version' | '_' | 'clone'>) {
    return _.merge(new Port(), opt);
  }

  //#region port entity / columns / port
  //#region @websql
  @Taon.Orm.Column.Primary({
    type: 'int',
    unique: true,
  })
  //#endregion
  port: number;
  //#endregion

  //#region port entity / columns / type
  //#region @websql
  @Taon.Orm.Column.Boolean(false)
  //#endregion
  assigned: boolean;
  //#endregion

  //#region port entity / columns /  serviceId
  //#region @websql
  @Taon.Orm.Column.Custom({
    type: 'varchar',
    length: 150,
  })
  //#endregion
  serviceId: string;
  //#endregion
}
//#endregion

//#region ports controller
@Taon.Controller({
  className: 'PortsController',
})
class PortsController extends BaseCliWorkerController<Port> {
  entityClassResolveFn = () => Port;
  private portsCacheByServiceId = new Map<string, Port>();

  /**
   * @param uniqueServiceName unique service name
   * @param startFrom start searching for free port from this number
   * @returns
   */
  @Taon.Http.PUT()
  registerAndAssignPort(
    @Taon.Http.Param.Query('uniqueServiceName') uniqueServiceName: string,
    @Taon.Http.Param.Query('startFrom') startFrom?: string,
  ): Taon.Response<Port> {
    //#region @backendFunc
    return async () => {
      if (this.portsCacheByServiceId.has(uniqueServiceName)) {
        return this.portsCacheByServiceId.get(uniqueServiceName);
      }
      // TODO
      return void 0;
      // this.portsCacheByServiceId.set(uniqueServiceName, portObj);
      // return portObj.port;
    };
    //#endregion
  }

  //#region methods / init example db data
  async initExampleDbData() {
    //#region @websql
    const commonPortsFrom3000to6000: number[] = [
      3000, // Commonly used for development servers (e.g., React, Node.js)
      3001, // Alternate development server port
      3306, // MySQL
      3389, // Remote Desktop Protocol (RDP)
      3478, // STUN (Session Traversal Utilities for NAT)
      4000, // Alternative development server port
      4200, // Angular CLI Development Server
      4500, // IPSec NAT traversal
      4567, // Sinatra Default Port
      5000, // Flask, Python development server, or Node.js apps
      5432, // PostgreSQL
      5500, // Live Server (VS Code Extension)
      5672, // RabbitMQ
      5800, // VNC Remote Desktop
      5900, // VNC Remote Desktop
      5984, // CouchDB
      6000, // in use by something in macos
    ];

    // TODO @LAST implement this
    // add all free ports
    // add all ports in use by os

    // for (const commonPort of commonPortsFrom3000to6000) {
    //   const portObj = Port.from({
    //     port: commonPort,
    //     type: 'in-use-by-os-or-other-apps',
    //     serviceId: 'commonly-used-by-os-or-other-apps' + commonPort,
    //   });
    //   portObj;
    //   await this.db.save(portObj);
    // }
    //#endregion
  }
  //#endregion
}
//#endregion

//#region ports context

//#region @backend
const portsWorkerDatabaseLocation = crossPlatformPath([
  os.userInfo().homedir,
  `.taon/databases-for-services/ports-worker.sqlite`,
]);
if (!Helpers.exists(path.dirname(portsWorkerDatabaseLocation))) {
  Helpers.mkdirp(path.dirname(portsWorkerDatabaseLocation));
}
// console.log('portsWorkerDatabaseLocation', portsWorkerDatabaseLocation);
//#endregion

var PortsContext = Taon.createContext(() => ({
  contextName: 'PortsContext',
  contexts: { BaseContext },
  controllers: { PortsController },
  entities: { Port },
  //#region @backend
  database: {
    location: portsWorkerDatabaseLocation,
    dropSchema: true,
  },
  //#endregion
  logs: {
    // framework: true,
  },
}));
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
  async startNormallyInCurrentProcess(options?: {
    healthCheckRequestTrys?: number;
  }) {
    //#region @backendFunc
    options = options || {};
    await this.killWorkerWithLowerVersion();
    await this.preventStartIfAlreadyStarted(options);
    const port = await this.getServicePort();

    await PortsContext.initialize({
      overrideHost: `http://localhost:${port}`,
    });

    await this.initializeWorkerMetadata();

    Helpers.info(`Service started !`);

    this.preventExternalConfigChange();
    await this._infoScreen();
    //#endregion
  }
  //#endregion
}
