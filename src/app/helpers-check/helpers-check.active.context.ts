//#region imports
//
import { HOST_CONFIG } from '../../app.hosts';
// import { MIGRATIONS_CLASSES_FOR_HelpersCheckActiveContext } from '../../../migrations';
import { TaonBaseContext, Taon } from 'taon/src';
//#endregion

export const HelpersCheckActiveContext = Taon.createContext(() => ({
  ...HOST_CONFIG['HelpersCheckActiveContext'],
  contextName: 'HelpersCheckActiveContext',
  database: true,
  // migrations: { ...MIGRATIONS_CLASSES_FOR_HelpersCheckActiveContext },
  contexts: { TaonBaseContext },
  entities: {},
  controllers: {},
  repositories: {},
  middlewares: {},
  providers: {},
}));
