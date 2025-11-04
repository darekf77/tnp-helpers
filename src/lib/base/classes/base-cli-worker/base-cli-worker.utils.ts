import { crossPlatformPath, UtilsOs } from 'tnp-core/src';

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
}
