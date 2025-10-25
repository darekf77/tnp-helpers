//#region imports
import { Taon, BaseContext } from 'taon/src';
import { getBaseCliWorkerDatabaseConfig } from 'tnp-helpers/src';

import { BaseProcess } from './base-process';
import { BaseProcessController } from './base-process.controller';
import { BaseProcessRepository } from './base-process.repository';
//#endregion

const appId = 'base-process-worker-app.project.worker';

export const BaseProcessContext = Taon.createContextTemplate(() => ({
  contextName: 'BaseProcessContext',
  appId,
  skipWritingServerRoutes: true,
  contexts: { BaseContext },
  repositories: { BaseProcessRepository },
  entities: { BaseProcess },
  controllers: { BaseProcessController },
  ...getBaseCliWorkerDatabaseConfig(
    appId,
    'DROP_DB+MIGRATIONS',
  ),
}))
