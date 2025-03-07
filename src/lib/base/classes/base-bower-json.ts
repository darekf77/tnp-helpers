import { config } from 'tnp-config/src';
import { BaseJsonFileReader } from './base-json-file-reader';

//#region bower.json interface
/**
 * Minimal interface describing a bower.json file according to:
 * https://github.com/bower/spec/blob/master/json.md
 */
export interface BowerJson {
  name: string;
  version?: string;
  description?: string;
  main?: string | string[];
  keywords?: string[];
  authors?: Array<string | { name: string; email?: string; homepage?: string }>;
  license?: string;
  homepage?: string;
  private?: boolean;
  repository?: {
    type: string;
    url: string;
  };
  ignore?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  // Optional fields:
  resolutions?: Record<string, string>;
  moduleType?: string | string[];
  // ...and so on, for any additional custom fields
}
//#endregion

export class BaseBowerJson extends BaseJsonFileReader<BowerJson> {
  constructor(public cwd: string) {
    super({ cwd, fileName: config.file.bower_json });
  }

  //#region bower dependencies
  get dependencies() {
    return (this.data ? this.data.dependencies : {}) || {};
  }
  //#endregion
}
