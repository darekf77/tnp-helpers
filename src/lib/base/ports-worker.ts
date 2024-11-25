//#region imports
import { BaseCliWorker } from './base-cli-worker';
import {
  _,
  crossPlatformPath,
  //#region @backend
  os,
  path,
  Utils,
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
})
class Port extends Taon.Base.AbstractEntity {
  static from(opt: Omit<Port, 'id' | 'version' | '_' | 'clone'>) {
    return _.merge(new Port(), opt);
  }

  //#region port entity / columns / port
  //#region @websql
  @Taon.Orm.Column.Custom({
    type: 'int',
    unique: true,
  })
  //#endregion
  port: number;
  //#endregion

  //#region port entity / columns / type
  //#region @websql
  @Taon.Orm.Column.String()
  //#endregion
  type:
    | 'in-use-by-os-or-other-apps'
    | 'taon-process-alive'
    | 'taon-process-unknown-state'
    | 'free-to-use';
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
//#region @backend
const portsWorkerDatabaseLocation = crossPlatformPath([
  os.userInfo().homedir,
  `.taon/databases-for-services/ports-worker.sqljs`,
]);
if (!Helpers.exists(path.dirname(portsWorkerDatabaseLocation))) {
  Helpers.mkdirp(path.dirname(portsWorkerDatabaseLocation));
}
// console.log('portsWorkerDatabaseLocation', portsWorkerDatabaseLocation);
//#endregion

//#region ports context
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

export class PortsWorker extends BaseCliWorker {
  //#region methods / get controller for remote connection
  protected async getControllerForRemoteConnection(): Promise<
    BaseCliWorkerController<any>
  > {
    await this.waitForProcessPortSavedToDisk();
    const refRemote = await PortsContext.initialize({
      overrideRemoteHost: `http://localhost:${this.processLocalInfoObj.port}`,
    });
    return refRemote.getInstanceBy(PortsController);
  }
  //#endregion

  //#region methods / start normally in current process
  /**
   * start normally process
   * this will crash if process already started
   */
  async startNormallyInCurrentProcess() {
    //#region @backendFunc
    const port = await this.getServicePort();

    await PortsContext.initialize({
      overrideHost: `http://localhost:${port}`,
    });

    await this.initializeWorkerMetadata();

    Helpers.info(`Service started !`);
    await this._infoScreen();
    //#endregion
  }
  //#endregion
}
