import { _ } from 'tnp-core';

export class HelpersStrings {

  /**
   * Example:
   *
   * const result = interpolateString("I'm {age} years old!")
   * .withParameters({ age: 29 });
   *
   * const result = interpolateString("The {a} says {n}, {n}, {n}!")
   * .withParameters({ a: 'cow', n: 'moo' });
   *
   *
   * @param value string to interpolate
   * @param parameters object with parametes
   */
  interpolateString<T = any>(value: string) {
    if (typeof value !== 'string') {
      console.warn('[ss-logic][helper] Value for interpolation is not string: ', value);
      return value;
    }

    return {
      withParameters(parameters: T) {
        if (typeof parameters !== 'object') {
          console.warn('[ss-logic][helper] Parameters are not a object: ', parameters);
          return value;
        }
        return value.replace(/{([^{}]*)}/g, function (a, b) {
          var r = parameters[b];
          return typeof r === 'string' || typeof r === 'number' ? r : a;
        } as any);
      }
    }

  }

  numValue(pixelsCss: string) {
    // tslint:disable-next-line:radix
    return parseInt(pixelsCss.replace('px', ''));
  }

  /**
   * examples:
   * 'aa bb bb' => ['aa','bb','cc'],
   * 'aa' => ['aa']
   * ['aa'] => ['aa']
   */
  splitIfNeed(stringOrArr: string | string[]): string[] {
    let res = [];
    if (_.isArray(stringOrArr)) {
      res = stringOrArr.map(s => {
        return s.trim();
      })
    }
    if (_.isString(stringOrArr)) {
      res = stringOrArr.split(/\s*[\s,]\s*/);
    }
    return res.filter(f => !!f && (f.trim() !== ''));
  }

  removeDoubleOrMoreEmptyLines(s: string) {
    return s?.replace(/(\r\n|\r|\n){2,}/g, '$1\n');
  }

}

