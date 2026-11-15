//#region imports
import { fileName, folderName, Helpers } from 'tnp-core/src';
import { _, path, Utils } from 'tnp-core/src';

import { HelpersTaon } from '../../index';

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
  //#region store in repo config files
  /**
   * ALLOWED TO OVERRIDE
   * (@default: true)
   *
   * If true, the files/folders/patterns that aren't really code and can
   * be recreated from template project like (tsconfig.json, .babelrc, .prettierc etc.)
   * will are stored in the repo
   */
  protected storeInRepoConfigFiles(): boolean {
    return true;
  }
  //#endregion

  //#region init
  async init(): Promise<void> {
    this.writeNpmIgnore();
    this.writeGitIgnore();
  }
  //#endregion

  //#region recrusive patterns transform
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
   * ALLOWED TO OVERRIDE
   * Have to start with /
   *
   * Usefull if you are generating some files and folder in src/*.* folder
   * (Taon CLI does this for automatic host generation)
   * @returns patterns that are ignored in repo but visible to user
   */
  protected getPatternsIgnoredInRepoButVisibleToUser(): string[] {
    return [
      '*.sqlite', // you want to see your temp databases in the repo
      '*.rest', // you want to see your temp rest databases in the repo
    ];
  }
  //#endregion

  //#region always ignored and hidden patterns
  protected getPatternsAlwaysIgnoredHidden(): string[] {
    return [
      'chrome-profiler-events*.json',
      'speed-measure-plugin*.json',
      'tmp*',
      'npm-debug.log*',
    ];
  }
  //#endregion

  //#region always use as recursive patterns
  protected alwaysUseRecursivePattern(): string[] {
    return ['.DS_Store'];
  }
  //#endregion

  //#region files and folder always ignored and hidden
  protected filesAndFoldersAlwaysIgnoredAndHidden(): string[] {
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

  //#region hidden but not neccesary ignored files and folders

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
      '.eslintrc.js',
      '.eslintrc.json',
      '.npmrc',
      '.yarnrc',
      '.idea',
      ...this.project.linter.getLintFiles(),
    ];
  }
  //#endregion

  //#region hidden but not necessary ignore repo patterns
  protected hiddenButNotNecessaryIgnoredInRepoPatterns(): string[] {
    const linkeProjectPrefix =
      this.project.linkedProjects.getLinkedProjectsConfig().prefix;

    return [
      'tsconfig*',
      'webpack.*',
      '.eslintrc*',
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
      ...this.filesAndFoldersAlwaysIgnoredAndHidden(),
      ...this.getPatternsAlwaysIgnoredHidden(),
      ...this.getPatternsIgnoredInRepoButVisibleToUser(),
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
          .filter(f => !f.includes('.gitignore'))
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
      ...this.filesAndFoldersAlwaysIgnoredAndHidden(),
      ...this.getPatternsAlwaysIgnoredHidden(),
      ...this.hiddenButNotNecessaryIgnoredInRepoFilesAndFolders(),
      ...this.hiddenButNotNecessaryIgnoredInRepoPatterns(),
    ];

    return this.recursivePatternTransformFn(hideInVSCode).reduce(
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
