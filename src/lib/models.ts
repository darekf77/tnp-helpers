import { _, crossPlatformPath, path } from 'tnp-core/src';
import { Helpers } from './index';


export class LinkedProject {
  static from(options: Partial<LinkedProject>) {
    const linkedProj = _.merge(new (LinkedProject as any)(), _.cloneDeep(options)) as LinkedProject;
    if (!linkedProj.relativeClonePath) {
      linkedProj.relativeClonePath = path.basename(linkedProj.remoteUrl().replace('.git', ''));
    }
    if (!linkedProj.deafultBranch) {
      linkedProj.deafultBranch = 'master';
    }
    return linkedProj;
  }

  static fromName(projectName: string, currentRemoteUrl?: string, currentBranch?: string) {
    return LinkedProject.from({
      repoUrl: currentRemoteUrl?.replace(path.basename(currentRemoteUrl), `${projectName}.git`),
      deafultBranch: currentBranch,
      relativeClonePath: projectName,
    });
  }

  static detect(insideLocation: string, recursive = false): LinkedProject[] {
    //#region @backendFunc
    insideLocation = crossPlatformPath(insideLocation).replace(/\/$/, '')
    const detectedLinkedProjects = Helpers
      .foldersFrom(insideLocation, {
        recursive,
      })
      .filter(folderAbsPath =>
        Helpers.checkIfNameAllowedForFiredevProj(path.basename(folderAbsPath)) &&
        Helpers.git.isGitRepo(folderAbsPath)
      )
      .map(folderAbsPath => {
        const relativePath = folderAbsPath.replace(insideLocation + '/', '')
        const projectName = path.basename(relativePath);
        return LinkedProject.from({
          repoUrl: Helpers.git.getOriginURL(folderAbsPath),
          relativeClonePath: projectName,
        });
      });
    return detectedLinkedProjects;
    //#endregion
  }

  /**
   * don't access directly, use remoteUrl() instead
   */
  repoUrlSsh?: string;
  /**
   * don't access directly, use remoteUrl() instead
   */
  repoUrlHttp?: string;
  /**
   * don't access directly, use remoteUrl() instead
   */
  repoUrl?: string;
  /**
   * url for git repo
   */
  public remoteUrl(): string {
    if (this.repoUrl) {
      return this.repoUrl;
    }
    if (this.repoUrlHttp) {
      return this.repoUrlHttp;
    }
    return this.repoUrlSsh;
  }
  deafultBranch?: string;
  purpose?: string;
  relativeClonePath?: string;
}

export class LinkedPorjectsConfig {
  static from(options: Partial<LinkedPorjectsConfig>) {
    options = options || {};
    options.projects = (options.projects || []).map(linkedProjOrname => {
      if (_.isString(linkedProjOrname)) {
        return LinkedProject.fromName(linkedProjOrname);
      }
      return LinkedProject.from(linkedProjOrname);
    });
    return _.merge(new (LinkedPorjectsConfig as any)(), _.cloneDeep(options));
  }

  prefix?: string;
  projects: LinkedProject[];
}

export type P1Environment = {
  [envName: string]: {
    name: string;
    npmTask?: 'start',
    action?: () => void,
  };
};


export class CoreProject {
  static from(options: Omit<CoreProject, 'name' | 'url'>) {
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
  environments: P1Environment;
  get name() {
    return path.basename(this.url).replace(/\.git$/, '');
  }

  get url() {
    return this.urlHttp ? this.urlHttp : this.urlSSH;
  }
}
