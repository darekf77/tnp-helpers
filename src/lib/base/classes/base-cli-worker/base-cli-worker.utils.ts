//#region imports
import {
  crossPlatformPath,
  UtilsOs,
  path,
  Helpers,
  UtilsJson,
} from 'tnp-core/src';

import { BaseCliWorkerConfig } from './base-cli-worker-config';
//#endregion
export namespace BaseCliWorkerUtils {
  export const getPathToProcessLocalInfoJson = (serviceID: string): string => {
    //#region @backendFunc
    // console.log('os.userInfo()', os.userInfo());
    return crossPlatformPath([
      UtilsOs.getRealHomeDir(),
      `.taon`,
      '__workers-service-process-info__',
      `${serviceID}.json`,
    ]);
    //#endregion
  };

  export const getAllServicesFromOS = (): BaseCliWorkerConfig[] => {
    //#region @backendFunc
    const dir = crossPlatformPath(
      path.dirname(getPathToProcessLocalInfoJson('dummy')),
    );
    return Helpers.filesFrom(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => BaseCliWorkerConfig.from(UtilsJson.readJsonWithComments(f)));
    //#endregion
  };
}
