//#region @backend
import * as  _ from 'lodash';
import * as Task from 'task.js';
import * as os from 'os';
import { Helpers } from './index';
import { Models } from 'tnp-models';
declare let test: any;


async function workersArrayExpensiveOperCalc(
  dataToSplit: any[],
  operation: (dataChunk: any[], workerNumber?: number | undefined) => Promise<void>,
  options?: {
    maxesForWorkes?: { [workerMaxes: number]: number; };
    workerLimit?: number;
    globals?: any;
  }
) {

  let { maxesForWorkes, workerLimit, globals } = options || {};
  if (_.isUndefined(globals)) {
    globals = {};
  }
  if (_.isUndefined(maxesForWorkes)) {
    maxesForWorkes = {
      0: 5, // no worker for 5 chunks
      1: 10, // 1 worker up to 10 chunks
      2: 15, // 2 workers up to 15 chunks,
      3: 25, // 2 workers up to 15 chunks,
      // above 15 chunks => {workerLimit}
    }
  }
  if (_.isUndefined(workerLimit) || workerLimit === Infinity) {
    workerLimit = (os.cpus().length - 1);
  }
  if (workerLimit <= 0) {
    workerLimit = 0;
  }

  if ((_.isNumber(maxesForWorkes[0]) && maxesForWorkes[0] > 0 && dataToSplit.length <= maxesForWorkes[0]) ||
    workerLimit === 0) {
    return await operation(dataToSplit, void 0);
  }
  const workersNumber = Number(Object
    .keys(maxesForWorkes)
    .filter(key => key != '0')
    .sort()
    .reverse()
    .find(key => maxesForWorkes[key] <= dataToSplit.length));
  // console.log('workersNumber', workersNumber)
  // console.log('_.isNumber(workersNumber)', _.isNumber(workersNumber))

  let chunks: (any[])[] = [];
  if (_.isNumber(workersNumber)) {
    const splitEven = Math.floor(dataToSplit.length / workersNumber);
    for (let workerIndex = 0; workerIndex <= workersNumber; workerIndex++) {
      if (workerIndex === workersNumber) {
        chunks[chunks.length - 1] = chunks[chunks.length - 1].concat(dataToSplit.slice(workerIndex * splitEven, dataToSplit.length))
      } else {
        chunks.push(dataToSplit.slice(workerIndex * splitEven, workerIndex * splitEven + splitEven));
      }
    }
  }

  const promises = [];
  for (let n = 0; n < chunks.length; n++) {
    ((chunks, n) => {
      const dataChunk = chunks[n];
      console.log(`worker ${n} ` + dataChunk.join(',\t'))
      // console.log('pass to worker', Helpers)
      let task = new Task({
        globals: _.merge({
          n,
          dataChunk
        }, globals),
        requires: {
          request: 'request-promise',
        }
      });
      promises.push(task.run(operation))
    })(chunks, n);
  }
  return await Promise.all(promises);
}

async function start() {

  const data = _.times(25, (n) => {
    return `file${n}`;
  });

  await workersArrayExpensiveOperCalc(
    data,
    () => {
      let { dataChunk, n, tnpModels } = global as {
        dataChunk?: any[];
        n?: number;
        tnpModels?: typeof Models
      };

      console.log(tnpModels.libs.CoreLibCategoryArr.join(','));
      // console.log(global['dataChunk'])
      // console.log(global['n'])
      // Helpers.writeFile('', dataChunk.join(''))
      return new Promise(resolve => {
        setTimeout(() => {
          resolve();
          console.log(tnpModels.libs.CoreLibCategoryArr.join(','))
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
