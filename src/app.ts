//#region @notForNpm
//#region @backend
import { _ } from 'tnp-core';
import { Helpers } from './index';
import { Models } from 'tnp-models';
import { CoreLibCategoryArr } from 'tnp-config';

async function start() {

  const data = _.times(25, (n) => {
    return `file${n}`;
  });

  await Helpers.workerCalculateArray(
    data,
    () => {
      let { dataChunk, n, tnpModels } = global as {
        dataChunk?: any[];
        n?: number;
        tnpModels?: typeof Models
      };

      // console.log(CoreLibCategoryArr.join(','));
      // console.log(global['dataChunk'])
      // console.log(global['n'])
      // Helpers.writeFile('', dataChunk.join(''))
      return new Promise(resolve => {
        setTimeout(() => {
          resolve();
          console.log(CoreLibCategoryArr.join(','))
          console.log(
            `resolved worker ${n} `
            + dataChunk.join(',')
          )
        }, 100);
      })
    }, {
    globals: {
      tnpModels: Models
    }
  });

}


export default start;
//#endregion
//#endregion
