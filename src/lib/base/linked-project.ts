import { config, notAllowedNames, notAllowedProjectNames } from 'tnp-config/src';
import { _, crossPlatformPath, path } from 'tnp-core/src';

import { Helpers } from '../index';

export class LinkedProject {
  //#region static

  //#region static / from
  static from(options: Partial<LinkedProject>) {
    const linkedProj = _.merge(
      new (LinkedProject as any)(),
      _.cloneDeep(options),
    ) as LinkedProject;
    if (!linkedProj.relativeClonePath) {
      linkedProj.relativeClonePath = path.basename(
        linkedProj.remoteUrl().replace('.git', ''),
      );
    }
    if (!linkedProj.defaultBranch) {
      linkedProj.defaultBranch = 'master';
    }
    return linkedProj;
  }
  //#endregion

  //#region static / from name
  static fromName(
    projectName: string,
    currentRemoteUrl?: string,
    currentBranch?: string,
  ) {
    return LinkedProject.from({
      repoUrl: currentRemoteUrl?.replace(
        path.basename(currentRemoteUrl),
        `${projectName}.git`,
      ),
      defaultBranch: currentBranch,
      relativeClonePath: projectName,
    });
  }
  //#endregion

  //#region static / detect
  static detect(
    insideLocation: string,
    options?: {
      recursive?: boolean;
      checkAlsoNonRepos?: boolean;
    },
  ): LinkedProject[] {
    //#region @backendFunc
    options = options || ({} as any);
    const { recursive, checkAlsoNonRepos } = options;
    insideLocation = crossPlatformPath(insideLocation).replace(/\/$/, '');
    const detectedLinkedProjects = Helpers.foldersFrom(insideLocation, {
      recursive,
      omitRootFolders: [
        'src',
        'environments',
        'docs',
        'node_modules',
        'dist',
        'bin',
        'old',
        'local_release',
        'projects',
        'browser',
        'websql',
      ],
      omitRootFoldersThatStartWith: ['tmp-', '.', 'dist-'],
    })
      .filter(folderAbsPath => {
        if (notAllowedNames.includes(path.basename(folderAbsPath))) {
          Helpers.warn(
            `[${config.frameworkName}-helpers][linked-projects] ` +
              `Skipping folder ${folderAbsPath} because it has not allowed name`,
          );
          return false;
        }
        // console.log('folderAbsPath', folderAbsPath);
        // Helpers.checkIfNameAllowedForTaonProj(path.basename(folderAbsPath)) &&
        if (
          checkAlsoNonRepos &&
          Helpers.exists([folderAbsPath, config.file.taon_jsonc]) &&
          !!Helpers.readJsonC([folderAbsPath, config.file.taon_jsonc])?.type &&
          Helpers.exists([folderAbsPath, config.file.package_json])
        ) {
          return true;
        }

        return Helpers.git.isGitRoot(folderAbsPath);
      })
      .map(folderAbsPath => {
        const relativePath = folderAbsPath.replace(insideLocation + '/', '');
        const projectName = path.basename(relativePath);
        return LinkedProject.from({
          repoUrl: Helpers.git.getOriginURL(folderAbsPath),
          relativeClonePath: projectName,
        });
      });
    // .sort((a, b) => {
    //   return (a.relativeClonePath || '').localeCompare((b.relativeClonePath || ''));
    // });
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

  public remoteUrlTransformed(setOrigin: 'ssh' | 'http'): string {
    //#region @backendFunc
    let url = this.remoteUrl();
    if (setOrigin === 'ssh') {
      if (this.repoUrlSsh) {
        return this.repoUrlSsh;
      }
      url = Helpers.git.originHttpToSsh(url);
    } else if (setOrigin === 'http') {
      if (this.repoUrlHttp) {
        return this.repoUrlHttp;
      }
      url = Helpers.git.originSshToHttp(url);
    }
    return url;
    //#endregion
  }

  defaultBranch?: string;
  purpose?: string;
  relativeClonePath?: string;
}

export class LinkedPorjectsConfig {
  //#region static

  //#region static / from
  static from(options: Partial<LinkedPorjectsConfig>) {
    options = options || {};
    options.projects = (options.projects || []).map(linkedProjOrname => {
      if (_.isString(linkedProjOrname)) {
        return LinkedProject.fromName(linkedProjOrname);
      }
      return LinkedProject.from(linkedProjOrname);
    });
    // .sort((a, b) => {
    //   return (a.relativeClonePath || '').localeCompare((b.relativeClonePath || ''));
    // });
    return _.merge(new (LinkedPorjectsConfig as any)(), _.cloneDeep(options));
  }
  //#endregion
  //#endregion

  prefix?: string;
  skipRecrusivePush?: boolean;
  resetOnlyChildren?: boolean;
  projects: LinkedProject[];
}
