//#region @backend
import { os } from 'tnp-core/src';
//#endregion
import { BaseContext, Taon } from 'taon/src';
import { crossPlatformPath, path, Helpers } from 'tnp-core/src';
import { PortsController } from './ports.controller';
import { Port } from './ports.entity';
import { NotAssignablePort } from './not-assignable-port.entity';
import { MIGRATIONS_CLASSES_FOR_PortsContext } from '../../../migrations';

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

export const PortsContext = Taon.createContext(() => ({
  contextName: 'PortsContext',
  contexts: { BaseContext },
  controllers: { PortsController },
  entities: { Port, NotAssignablePort },
  migrations: { ...MIGRATIONS_CLASSES_FOR_PortsContext },
  skipWritingServerRoutes: true,
  //#region @backend
  database: {
    recreateMode: 'DROP_DB+MIGRATIONS',
    location: portsWorkerDatabaseLocation,
  },
  //#endregion
  logs: {
    migrations: true,
  },
}));
