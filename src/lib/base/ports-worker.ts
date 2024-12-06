//#region imports
import { BaseCliWorker } from './base-cli-worker';
import {
  _,
  crossPlatformPath,
  //#region @backend
  os,
  chokidar,
  path,
  Utils,
  portfinder,
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

  // TODO @LAST implement this thing
  //#region port entity / columns / type
  //#region @websql
  @Taon.Orm.Column.String()
  //#endregion
  type: 'in-use-by-os-or-other-apps' | 'taon-process' | 'free-to-use-by-taon'; // TODO add worker that will gather free ports
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

  @Taon.Http.PUT()
  registerAndAssignPort(
    @Taon.Http.Param.Query('uniqueServiceName') uniqueServiceName: string,
  ): Taon.Response<number> {
    //#region @backendFunc
    return async () => {
      const port = await Port.from({
        serviceId: uniqueServiceName,
        port: await portfinder.getPortPromise({
          startPort: 3000,
        }),
        type: 'taon-process',
      });
      return 1;
    };
    //#endregion
  }

  //#region methods / init example db data
  async initExampleDbData() {
    //#region @websql
    await this.db.save(
      Port.from({
        port: 4200,
        type: 'in-use-by-os-or-other-apps',
        serviceId: 'angular dev server',
      }),
    );
    await this.db.save(
      Port.from({
        port: 3000,
        type: 'in-use-by-os-or-other-apps',
        serviceId: 'standard nodejs server',
      }),
    );
    // await this.db.save(
    //   Port.from({
    //     port: 4200,
    //     serviceId: 'angular dev server',
    //   }),
    // );
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

  protected async headerText(): Promise<string> {
    return 'Ports';
  }

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
