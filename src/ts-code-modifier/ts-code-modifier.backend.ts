import * as _ from 'lodash';
import * as tsfmt from 'typescript-formatter';
import { Helpers } from '../index';
export class TsCodeModifer {


  public replace(input: string, regex: RegExp, replacement: string) {

    return input.split('\n').map(line => {

      const lineTrim = line.trim()
      if (lineTrim.startsWith('//')) {
        return line;
      }
      // console.log(line)
      if (
        lineTrim.startsWith('import ') ||
        lineTrim.startsWith('export ') ||
        /^\}\s+from\s+(\"|\')/.test(lineTrim) ||
        /require\((\"|\')/.test(lineTrim)
      ) {
        return line.replace(regex, replacement);
      }
      return line;
    }).join('\n');
  }

  fixRegexes(input: string) {
    const regex = new RegExp(`\/.+\/g`, 'g');
    const matches = input.match(regex);
    if (_.isArray(matches)) {
      matches.forEach(m => {
        if (m.search('`') === -1 && !m.trim().startsWith('//')) {
          input = input.replace(m, `(new RegExp(\`${Helpers.escapeStringForRegEx(m.replace(new RegExp('/g$', ''), ''))}\`,'g'))`);
        }
      });
    }
    return input;
  }

  /**
   * fix double apostrophes in imports,export, requires
   */
  fixApostrphes(input: string) {
    const regex = new RegExp(`(import|export|require\\(|\\}\\sfrom\\s(\\"|\\')).+(\\"|\\')`, 'g');

    const matches = input.match(regex);
    if (_.isArray(matches)) {
      matches.forEach(m => {
        if (m.search('`') === -1 && !m.trim().startsWith('//')) {
          input = input.replace(m, m.replace(/\"/g, `'`));
        }
      });
    }
    return input;
  }

  /**
   * Format JS, TS file
   */
  public formatFile(filePath: string) {
    tsfmt.processFiles([filePath], {
      // dryRun?: boolean;
      verbose: true,
      // baseDir: ['bundle', 'dist'].includes(path.basename(__dirname)) ? path.join(__dirname, '..') : __dirname,
      replace: true,
      verify: false,
      // tsconfig: true,
      // tslint: true,
      // editorconfig: true,
      tsfmt: true,
    } as any)
  }

}
