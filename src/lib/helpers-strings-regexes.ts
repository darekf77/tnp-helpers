import { _ } from 'tnp-core';
export class HelpersStringsRegexes {



  escapeStringForRegEx(s: string) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  }

  matchExactOnce(s: string, regex: RegExp): string {
    if (!_.isString(s) || !_.isRegExp(regex)) {
      return void 0;
    }
    const result = s.match(regex);
    if (_.isNil(result)) {
      return void 0;
    }
    return result.length >= 1 ? _.first(result) : void 0;
  }

  get regex() {
    return {
      /**
     * mathes
     * xxx.xxx.xxx.xxx
     * xxx.xxx.xxx.xxx:port
     * http://xxx.xxx.xxx.xxx:port
     * http://xxx.xxx.xxx.xxx
     * https://xxx.xxx.xxx.xxx:port
     * https://xxx.xxx.xxx.xxx   *
     */
      get forStringWithIpHost() {
        const regex = /(http(s)?\:\/\/)?(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\:[0-9]+)?/;
        return regex;
      },
      /**
    * mathes
    * http://domain.com:port
    * http://domain.com
    * http://domain:port
    * http://domain
    * https://domain.com:port
    * https://domain.com
    * https://domain:port
    * https://domain
    */
      get forStringWithDomainHost() {
        const regex = /(((http(s)?\:\/\/)?[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+(\:[0-9]+)?)|((http(s)?\:\/\/)[a-zA-Z0-9-]{1,61}))/;
        return regex;
      }
    }
  }
}
