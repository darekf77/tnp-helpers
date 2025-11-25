import { TaonBaseContext, Taon } from 'taon/src';
import { os, UtilsOs } from 'tnp-core/src';
import { crossPlatformPath, path, Helpers } from 'tnp-core/src';

import { MIGRATIONS_CLASSES_FOR_TaonPortsContext } from '../../../migrations';
import { getBaseCliWorkerDatabaseConfig } from '../classes/base-cli-worker/base-cli-worker-database-config';

import { TaonPortsController } from './ports.controller';
import { Port } from './ports.entity';

export const TaonPortsContextTemplate = Taon.createContextTemplate(() => ({
  contextName: 'TaonPortsContext',
  appId: 'dev.taon.taon-ports-worker',
  contexts: { TaonBaseContext },
  controllers: { TaonPortsController },
  entities: { Port },
  migrations: { ...MIGRATIONS_CLASSES_FOR_TaonPortsContext },
  skipWritingServerRoutes: true,
  ...getBaseCliWorkerDatabaseConfig('ports-worker', 'DROP_DB+MIGRATIONS'),
  logs: {
    migrations: true,
  },
}));
