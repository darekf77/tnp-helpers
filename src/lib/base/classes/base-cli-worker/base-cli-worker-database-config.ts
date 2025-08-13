import { Models } from 'taon/src';
import { crossPlatformPath, Helpers, path, UtilsOs } from 'tnp-core/src';

/**
 * Get taon service database config
 * (database is stored in user's home directory)
 * @param serviceNameUniqueInSystem - unique name of the service in the system
 * @param recreateMode - mode of database recreation, default is 'DROP_DB+MIGRATIONS'
 * @returns DatabaseConfig object with location and recreateMode
 */
export const getBaseCliWorkerDatabaseConfig = (
  serviceNameUniqueInSystem: string,
  recreateMode: Models.DBRecreateMode = 'DROP_DB+MIGRATIONS',
) => {
  //#region @backendFunc
  const serviceLocation = crossPlatformPath([
    UtilsOs.getRealHomeDir(),
    `.taon/databases-for-services/${serviceNameUniqueInSystem}.sqlite`,
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
