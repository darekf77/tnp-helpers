import { _, crossPlatformPath, path } from 'tnp-core/src';
import { Helpers } from '../index';


export class LinkedProject {
  //#region static

  //#region static / from
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
  //#endregion

  //#region static / from name
  static fromName(projectName: string, currentRemoteUrl?: string, currentBranch?: string) {
    return LinkedProject.from({
      repoUrl: currentRemoteUrl?.replace(path.basename(currentRemoteUrl), `${projectName}.git`),
      deafultBranch: currentBranch,
      relativeClonePath: projectName,
    });
  }
  //#endregion

  //#region static / detect
  static detect(insideLocation: string, recursive = false): LinkedProject[] {
    //#region @backendFunc
    insideLocation = crossPlatformPath(insideLocation).replace(/\/$/, '')
    const detectedLinkedProjects = Helpers
      .foldersFrom(insideLocation, {
        recursive,
      })
      .filter(folderAbsPath => {
        // console.log('folderAbsPath', folderAbsPath);
        // Helpers.checkIfNameAllowedForFiredevProj(path.basename(folderAbsPath)) &&

        return Helpers.git.isGitRoot(folderAbsPath);
      })
      .map(folderAbsPath => {
        const relativePath = folderAbsPath.replace(insideLocation + '/', '')
        const projectName = path.basename(relativePath);
        return LinkedProject.from({
          repoUrl: Helpers.git.getOriginURL(folderAbsPath),
          relativeClonePath: projectName,
        });
      })
      .sort((a, b) => {
        return (a.relativeClonePath || '').localeCompare((b.relativeClonePath || ''));
      });
    return detectedLinkedProjects;
    //#endregion
  }
  //#endregion

  //#endregion

  /**
   * sometime there is project that has one project
   * embede inside another project
   */
  internalRealtiveProjectPath?: string;
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

  //#region static

  //#region static / from
  static from(options: Partial<LinkedPorjectsConfig>) {
    options = options || {};
    options.projects = (options.projects || [])
      .map(linkedProjOrname => {
        if (_.isString(linkedProjOrname)) {
          return LinkedProject.fromName(linkedProjOrname);
        }
        return LinkedProject.from(linkedProjOrname);
      })
      .sort((a, b) => {
        return (a.relativeClonePath || '').localeCompare((b.relativeClonePath || ''));
      });
    return _.merge(new (LinkedPorjectsConfig as any)(), _.cloneDeep(options));
  }
  //#endregion
  //#endregion

  prefix?: string;
  skipRecrusivePush?: boolean;
  resetOnlyChildren?: boolean;
  projects: LinkedProject[];
}
