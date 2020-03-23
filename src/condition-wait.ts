import * as _ from 'lodash';

import { Helpers } from './index';

export type Condition = {
  name?: string;
  timeoutCheck?: number;
  timeoutNext?: number;
  callback: (c: Condition) => boolean | Promise<boolean>;
  errorMessage: string;
}

export async function conditionWait(conditionAndTimeout: Condition[]) {
  await waitFor(conditionAndTimeout);
}

function waitFor(arr: Condition[], messageToShow: string = void 0) {
  return new Promise(async (resolve, reject) => {
    if (arr.length === 0) {
      resolve()
    } else {
      // console.log(arr.length)
      const check = arr.shift();
      if (_.isUndefined(check.timeoutCheck)) {
        check.timeoutCheck = 2000;
      }
      if (_.isUndefined(check.timeoutNext)) {
        check.timeoutNext = 4000;
      }
      const { timeoutCheck, timeoutNext, name } = check;
      // console.log(`timeoutCheck: ${timeoutCheck}`);
      // console.log(`timeoutNext: ${timeoutNext}`);
      // console.log(`Checking: ${name}`)
      const resultTrue = await Helpers.runSyncOrAsync(check.callback, check);
      // console.log(`after: ${name}`)
      if (resultTrue) {
        // console.log(`timeout 1 is set to ${timeoutNext}`)
        setTimeout(async () => {
          // console.log(`timeout 1 is over`)
          await waitFor(arr).then(() => {
            resolve();
          });
        }, timeoutNext);
      } else {

        arr.unshift(check);
        if (!messageToShow || check.errorMessage !== messageToShow) {
          Helpers.info(check.errorMessage);
        } else {
          // console.log(`dont show error  message ${check.errorMessage}`)
        }
        // console.log(`timeout 2 is set to ${timeoutCheck}, arr.length is ${arr.length}`)
        setTimeout(async () => {
          // console.log(`timeout 2 ${timeoutCheck} ovef`)
          await waitFor(arr, check.errorMessage).then(() => {
            resolve();
          });
        }, timeoutCheck);
      }
    }
  })
}
