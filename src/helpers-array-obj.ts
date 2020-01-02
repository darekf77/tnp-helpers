import * as _ from 'lodash';
import { Helpers } from './index';

export class HelpersArrayObj {

  arrayMoveElementBefore(arr: any[], a: any, b: any) {
    let indexA = arr.indexOf(a);
    _.pullAt(arr, indexA);
    let indexB = arr.indexOf(b);
    if (indexB === 0) {
      arr.unshift(a);
    } else {
      arr = arr.splice(indexB - 1, 0, a);
    }
    return arr;
  }
  arrayMoveElementAfterB(arr: any[], a: any, b: any) {
    let indexA = arr.indexOf(a);
    _.pullAt(arr, indexA);
    let indexB = arr.indexOf(b);
    if (indexB === arr.length - 1) {
      arr.push(a);
    } else {
      arr = arr.splice(indexB + 1, 0, a);
    }
    return arr;
  }

  uniqArray(array: any[]) {
    var seen = {};
    return array.filter(function (item) {
      return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
  }

  sortKeys(obj) {
    if (_.isArray(obj)) {
      return obj.map(Helpers.arrays.sortKeys);
    }
    if (_.isObject(obj)) {
      return _.fromPairs(_.keys(obj).sort().map(key => [key, Helpers.arrays.sortKeys(obj[key])]));
    }
    return obj;
  };
}
