import { BaseContext, Taon } from 'taon/src';
import { os, UtilsOs } from 'tnp-core/src';
import { crossPlatformPath, path, Helpers } from 'tnp-core/src';

import { MIGRATIONS_CLASSES_FOR_PortsContext } from '../../../migrations';
import { getBaseCliWorkerDatabaseConfig } from '../classes/base-cli-worker/base-cli-worker-database-config';

import { PortsController } from './ports.controller';
import { Port } from './ports.entity';

export const PortsContextTemplate = Taon.createContextTemplate(() => ({
  contextName: 'PortsContext',
  appId: 'dev.taon.taon-ports-worker',
  contexts: { BaseContext },
  controllers: { PortsController },
  entities: { Port },
  migrations: { ...MIGRATIONS_CLASSES_FOR_PortsContext },
  skipWritingServerRoutes: true,
  ...getBaseCliWorkerDatabaseConfig('ports-worker', 'DROP_DB+MIGRATIONS'),
  logs: {
    migrations: true,
  },
}));
