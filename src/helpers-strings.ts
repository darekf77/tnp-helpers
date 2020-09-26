


import * as _ from 'lodash';


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

}

