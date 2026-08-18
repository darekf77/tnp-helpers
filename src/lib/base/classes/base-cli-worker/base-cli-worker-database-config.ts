import { Models } from 'taon/src';
import {
  crossPlatformPath,
  dotTaonFolder,
  Helpers,
  path,
  UtilsOs,
} from 'tnp-core/src';

/**
 * Get taon service database config
 * (database is stored in user's home directory)
 * @param serviceNameUniqueInSystem - unique name of the service in the system
 * @param recreateMode - mode of database recreation, default is 'DROP_DB__RUN_MIGRATIONS'
 * @returns DatabaseConfig object with location and recreateMode
 */
export const getBaseCliWorkerDatabaseConfig = (
  serviceNameUniqueInSystem: string,
  recreateMode: Models.DBRecreateModeType = 'DROP_DB__RUN_MIGRATIONS',
) => {
  //#region @backendFunc
  const serviceLocation = crossPlatformPath([
    UtilsOs.getRealHomeDir(),
    `${dotTaonFolder}/databases-for-services/${serviceNameUniqueInSystem}.sqlite`,
  ]);
  if (!Helpers.exists(path.dirname(serviceLocation))) {
    Helpers.mkdirp(path.dirname(serviceLocation));
  }
  // console.log('portsWorkerDatabaseLocation', portsWorkerDatabaseLocation);
  return {
    database: {
      recreateMode,
      location: serviceLocation,
    },
  };
  //#endregion
};
