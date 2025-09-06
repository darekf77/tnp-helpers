//#region imports
import { fileName, folderName } from 'tnp-config/src';
import { _, path, Utils } from 'tnp-core/src';

import { Helpers } from '../../index';

import { BaseFeatureForProject } from './base-feature-for-project';
import type { BaseProject } from './base-project';
//#endregion

/**
 * Git Ignore
 * Vscode Files Hide
 * Npm Ignore
 */
export class BaseIgnoreHideHelpers<
  PROJECT extends BaseProject = any,
> extends BaseFeatureForProject<PROJECT> {
  /**
   * (@default: false)
   *
   * If true, the files/folders/patterns that aren't really code and can
   * be recreated from template project like (tsconfig.json, .babelrc, .prettierc etc.)
   * will are stored in the repo
   */
  protected storeInRepoConfigFiles(): boolean {
    return true;
  }

  //#region init
  async init(): Promise<void> {
    this.writeNpmIgnore();
    this.writeGitIgnore();
  }
  //#endregion

  //#region
  /**
   * @param data list of patterns
   * @returns list of patterns for recrusive ignore
   */
  private recursivePatternTransformFn(data: string[]): string[] {
    return data
      .map(c => {
        if (this.alwaysUseRecursivePattern().includes(c)) {
          return [`${c}`, `**/${c}`];
        }
        return [`${c}`];
      })
      .reduce((a, b) => {
        return a.concat(b);
      }, []);
  }
  //#endregion

  //#region patterns ignored in repo but visible to user
  /**
   * Have to start with /
   *
   * Usefull if you are generating some files and folder in src/*.* folder
   * (Taon CLI does this for automatic host generation)
   * @returns patterns that are ignored in repo but visible to user
   */
  protected getPatternsIgnoredInRepoButVisibleToUser(): string[] {
    return [
      '/*.sqlite', // you want to see your temp databases in the repo
      '/*.rest', // you want to see your temp rest databases in the repo
    ];
  }
  //#endregion

  //#region always ignored and hidden patterns
  protected alwaysIgnoredHiddenPatterns(): string[] {
    return [
      'chrome-profiler-events*.json',
      'speed-measure-plugin*.json',
      'tmp*',
      'npm-debug.log*',
    ];
  }

  alwaysUseRecursivePattern(): string[] {
    return ['.DS_Store'];
  }

  protected alwaysIgnoredAndHiddenFilesAndFolders(): string[] {
    return [
      '_changelog',
      '.sass-cache',
      '.sourcemaps',
      '.DS_Store',
      'npm-debug.log',
      'yarn-error.log',
      'testem.log',
      'connect.lock',
      'yarn-error.log',
      'node_modules',
      'libpeerconnection.log',
      'dist',
      'coverage',
      'Thumbs.db',
    ];
  }
  //#endregion

  //#region hidden but not neccesary ignored
  protected hiddenButNeverIgnoredInRepo(): string[] {
    return ['.gitignore']; // just to avoid mess when not .gitignore and started project
  }

  protected hiddenButNotNecessaryIgnoredInRepoFilesAndFolders(): string[] {
    return [
      '.npmignore',
      '.babelrc',
      '.editorconfig',
      'eslint.config.js',
      'protractor.conf.js',
      'karma.conf.js',
      '.prettierc',
      'angular.json',
      '.prettierrc.json',
      '.eslintrc.json',
      '.npmrc',
      ...this.project.linter.getLintFiles(),
    ];
  }

  protected hiddenButNotNecessaryIgnoredInRepoPatterns(): string[] {
    const linkeProjectPrefix =
      this.project.linkedProjects.getLinkedProjectsConfig().prefix;

    return [
      'tsconfig*',
      'webpack.*',
      'tslint.*',
      linkeProjectPrefix ? `${linkeProjectPrefix}*` : void 0,
    ].filter(f => !!f) as string[];
  }
  //#endregion

  //#region ignore for npm
  protected npmIgnoreFilesFoldersPatterns(): string[] {
    return [
      '.vscode',
      'dist',
      'src',
      'app',
      'source',
      'docs',
      'preview',
      'tests',
      'tsconfig.json',
      'npm-debug.log*',
    ];
  }
  //#endregion

  //#region public methods / write ignore files§
  // TODO
  public writeGitIgnore(): void {
    //#region @backendFunc
    let filesAndFoldersToIgnoreInGit = this.recursivePatternTransformFn([
      ...this.alwaysIgnoredAndHiddenFilesAndFolders(),
      ...this.alwaysIgnoredHiddenPatterns(),
      ...this.getPatternsIgnoredInRepoButVisibleToUser().map(c =>
        c.startsWith('/') ? c.slice(1) : c,
      ),
    ]);

    if (!this.storeInRepoConfigFiles()) {
      filesAndFoldersToIgnoreInGit = [
        ...filesAndFoldersToIgnoreInGit,
        ...this.recursivePatternTransformFn([
          ...this.hiddenButNotNecessaryIgnoredInRepoFilesAndFolders(),
          ...this.hiddenButNotNecessaryIgnoredInRepoPatterns(),
        ]),
      ];
    }

    Helpers.writeFile(
      path.join(this.project.location, '.gitignore'),
      Utils.uniqArray(
        filesAndFoldersToIgnoreInGit
          .sort((a, b) => a.localeCompare(b))
          .map(c => `/${c}`),
      ).join('\n'),
    );
    //#endregion
  }
  //#endregion

  //#region public methods / get vscode hide settings
  /**
   * Use can apply this to .vscode/settings.json [files.exclude] property
   */
  public getVscodeFilesFoldersAndPatternsToHide(): {
    [fileFolderOrPattern: string]: true;
  } {
    //#region @backendFunc
    const hideInVSCode = [
      ...this.alwaysIgnoredAndHiddenFilesAndFolders(),
      ...this.alwaysIgnoredHiddenPatterns(),
      ...this.hiddenButNeverIgnoredInRepo(),
      ...this.hiddenButNotNecessaryIgnoredInRepoFilesAndFolders(),
      ...this.hiddenButNotNecessaryIgnoredInRepoPatterns(),
    ];

    return hideInVSCode.reduce(
      (acc, curr) => {
        acc[curr] = true;
        return acc;
      },
      {} as { [key: string]: true },
    );
    //#endregion
  }
  //#endregion

  //#region public methods / npm ignore
  public writeNpmIgnore(): void {
    //#region @backendFunc
    Helpers.writeFile(
      path.join(this.project.location, '.npmignore'),
      this.npmIgnoreFilesFoldersPatterns()
        .map(c => `/${c}`)
        .join('\n'),
    );
    //#endregion
  }
  //#endregion
}
