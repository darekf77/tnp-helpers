import { _ } from 'tnp-core';
import * as fuzzy from 'fuzzy';
import { Helpers } from './index';

export class HelpersArrayObj {

  from(s: string | string[]): string[] {
    if (_.isArray(s)) {
      return s;
    }
    if (_.isString(s)) {
      return s.split(' ')
    }
  }

  second(arr) {
    if (!Array.isArray(arr) || arr.length < 2) {
      return void 0;
    }
    return  arr[1];
  }

  arrayMoveElementBefore<T = any>(arr: any[], a: any, b: any, prop?: keyof T) {
    let indexA = prop ? arr.findIndex(elem => elem[prop] === a[prop]) : arr.indexOf(a);
    _.pullAt(arr, indexA);
    let indexB = prop ? arr.findIndex(elem => elem[prop] === b[prop]) : arr.indexOf(b);
    if (indexB === 0) {
      arr.unshift(a);
    } else {
      arr.splice(indexB - 1, 0, a);
    }
    return arr;
  }
  arrayMoveElementAfterB<T = any>(arr: any[], a: any, b: any, prop?: keyof T) {
    let indexA = prop ? arr.findIndex(elem => elem[prop] === a[prop]) : arr.indexOf(a);
    _.pullAt(arr, indexA);
    let indexB = prop ? arr.findIndex(elem => elem[prop] === b[prop]) : arr.indexOf(b);
    if (indexB === arr.length - 1) {
      arr.push(a);
    } else {
      arr.splice(indexB + 1, 0, a);
    }
    return arr;
  }

  uniqArray<T = any>(array: any[], uniqueProperty?: (keyof T)) {
    var seen = {};
    return array
      .filter(f => !!f)
      .filter(function (item) {
        return seen.hasOwnProperty(uniqueProperty ? item[uniqueProperty] : item) ? false
          : (seen[uniqueProperty ? item[uniqueProperty] : item] = true);
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

  /**
   * Fuzzy search
   */
  fuzzy<T = any>(query: string, list: T[], valueFn?: (modelFromList: T) => string) {
    const resultsFuzzy = fuzzy.filter(
      query,
      list.map(k => valueFn ? valueFn(k) : k),
    )
    const resultsFuzzyKebab = fuzzy.filter(
      _.kebabCase(query),
      list.map(k => _.kebabCase((valueFn ? valueFn(k) : k) as any)),
    )
    const matches = resultsFuzzy.map((el) => el.string);
    const matchesKebab = resultsFuzzyKebab.map((el) => el.string);

    const results = (resultsFuzzy.length === 0) ? [] : list.filter(k => {
      return matches.includes((valueFn ? valueFn(k) : k) as any);
    })

    if (matches.length === 0 && matchesKebab.length > 0) {
      const m = list.find(k => _.kebabCase((valueFn ? valueFn(k) : k) as any) === _.first(matchesKebab));
      results.push(m);
      matches.push((valueFn ? valueFn(m) : m) as any);
    }

    return { matches, results };
  }

}
