import { BaseContext, Taon } from 'taon/src';
import { os } from 'tnp-core/src';
import { crossPlatformPath, path, Helpers } from 'tnp-core/src';

import { MIGRATIONS_CLASSES_FOR_PortsContext } from '../../../migrations';

import { PortsController } from './ports.controller';
import { Port } from './ports.entity';

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
  entities: { Port },
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
