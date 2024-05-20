import { _, path } from 'tnp-core/src';

export type CoreProjectEnvironment = {
  [envName: string]: {
    name: string;
    npmTask?: 'start',
    action?: () => void,
  };
};



export class CoreProject {
  static from(options: Omit<CoreProject, 'name' | 'url' | 'branch'>) {
    return _.merge(new (CoreProject as any)(), _.cloneDeep(options));
  }
  color?: string;
  description?: string;
  /**
   * url for git repo
   */
  urlSSH?: string;
  urlHttp?: string;
  branches: string[];
  get branch() {
    return _.first(this.branches);
  }
  environments: CoreProjectEnvironment;
  get name() {
    return path.basename(this.url).replace(/\.git$/, '');
  }

  get url() {
    return this.urlHttp ? this.urlHttp : this.urlSSH;
  }
}
