import { _, path, crossPlatformPath, Helpers } from 'tnp-core/src';
import { BaseProject } from './base-project';

export type CoreProjectEnvironment = {
  [envName: string]: {
    name: string;
    description?: string;
    onlineLink?: string;
  };
};

const defaultDb = {
  projects: [],
}


export class CoreProject {
  public static coreProjects: CoreProject[] = [];
  static from(options: Omit<CoreProject, 'name' | 'url' | 'branch'>) {
    const proj = _.merge(new (CoreProject as any)(), _.cloneDeep(options));
    this.coreProjects.push(proj);
    return proj;
  }

  color?: string;
  description?: string;
  /**
   * ssh url for git repo
   */
  urlSSH?: string;
  /**
   * https url for git repo
   */
  urlHttp?: string;
  /**
   * main branches - first is default
   */
  branches: string[];
  /**
   * project environments
   */
  environments: CoreProjectEnvironment;

  recognizedFn: <T extends BaseProject<any>>(project: T) => boolean;

  /**
   * core porject name
   */
  get name() {
    return path.basename(this.url).replace(/\.git$/, '');
  }

  /**
   * main (default for reset) branch
   */
  get branch() {
    return _.first(this.branches);
  }

  /**
   * url for git repo
   */
  get url(): string {
    return (this.urlHttp ? this.urlHttp : this.urlSSH) || '';
  }
}
